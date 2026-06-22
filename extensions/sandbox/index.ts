/**
 * Sandbox extension (opt-in, filesystem-first).
 *
 * Active ONLY when `.pi/sandbox.json` exists in the session cwd. With no config
 * the extension is inert and pi behaves exactly as without it.
 *
 * When active:
 *   - cwd is read/write. Nothing else, unless listed in the config.
 *   - File tools (read/write/edit/grep/find/ls) are gated by a true path
 *     allowlist via the `tool_call` hook (block on deny).
 *   - bash and `!` run inside @anthropic-ai/sandbox-runtime (srt): bwrap +
 *     host proxy network allowlist.
 *
 * Config (`<cwd>/.pi/sandbox.json`, all keys optional):
 *   {
 *     "allowedDomains": ["github.com", "*.github.com"],  // bash network allowlist
 *     "read":  ["~/.local/share/mise"],   // extra readable paths (file tools)
 *     "write": ["~/.cache/foo"],          // extra writable paths (file tools + bash)
 *     "denyRead":  ["~/.ssh", "config/master.key", "*.key"],
 *     "denyWrite": [".env", "*.pem"]
 *   }
 *
 * Commands:
 *   /escape  - disable the sandbox for this session and reload.
 *
 * IMPORTANT srt read caveat: srt ro-binds all of `/` into the bash sandbox, so
 * bash can READ the whole host filesystem except paths listed in `denyRead`
 * (which srt masks with tmpfs). The file-tool allowlist does NOT apply to bash.
 * To protect secrets from bash, list explicit paths in `denyRead`. Basename
 * globs (e.g. `*.key`) are expanded to current files under cwd at activation.
 * Writes and network are allowlisted for bash; reads are deny-list only.
 *
 * Setup:
 *   cd ~/.pi/agent/extensions/sandbox && npm install
 * Requirements (Linux): bwrap, socat, ripgrep.
 */

import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  SandboxManager,
  type SandboxRuntimeConfig,
} from "@anthropic-ai/sandbox-runtime";
import {
  type BashOperations,
  createBashTool,
  type ExtensionAPI,
  type ExtensionCommandContext,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "sandbox";
const STATUS_ICON = "";
const ESCAPE_ENV = "PI_SANDBOX_DISABLED";
const SKIP_GLOB_DIRS = new Set([".git", ".hg", ".svn", "node_modules"]);

interface SandboxJson {
  allowedDomains?: string[];
  read?: string[];
  write?: string[];
  denyRead?: string[];
  denyWrite?: string[];
}

interface Policy {
  cwd: string;
  readDirs: string[];
  writeDirs: string[];
  denyRead: string[];
  denyWrite: string[];
}

let active = false;
let policy: Policy | undefined;

function configPath(cwd: string): string {
  return path.join(cwd, ".pi", "sandbox.json");
}

function loadConfig(cwd: string): SandboxJson | undefined {
  const p = configPath(cwd);
  if (!existsSync(p)) return undefined;
  try {
    const cfg = JSON.parse(readFileSync(p, "utf-8")) as SandboxJson;
    validateConfig(cfg);
    return cfg;
  } catch (e) {
    throw new Error(`Invalid ${p}: ${e instanceof Error ? e.message : e}`);
  }
}

function validateConfig(cfg: SandboxJson): void {
  const unsupported = [
    ...unsupportedGlobEntries(cfg.read),
    ...unsupportedGlobEntries(cfg.write),
    ...unsupportedGlobEntries(cfg.denyRead),
    ...unsupportedGlobEntries(cfg.denyWrite),
  ];
  if (unsupported.length > 0) {
    throw new Error(
      `unsupported path globs: ${unsupported.join(", ")}. Only basename globs like "*.key" are supported in denyRead/denyWrite.`,
    );
  }
  const allowGlobs = [...(cfg.read ?? []), ...(cfg.write ?? [])].filter(isGlob);
  if (allowGlobs.length > 0) {
    throw new Error(
      `read/write allowlists require explicit paths, not globs: ${allowGlobs.join(", ")}`,
    );
  }
}

function hasWildcard(entry: string): boolean {
  return entry.includes("*");
}

function isGlob(entry: string): boolean {
  return hasWildcard(entry) && !entry.includes("/");
}

function unsupportedGlobEntries(entries: string[] | undefined): string[] {
  return (entries ?? []).filter(
    (entry) => hasWildcard(entry) && !isGlob(entry),
  );
}

function expand(entry: string, cwd: string): string {
  let e = entry;
  if (e === "~") return homedir();
  if (e.startsWith("~/")) e = path.join(homedir(), e.slice(2));
  return path.isAbsolute(e) ? path.normalize(e) : path.resolve(cwd, e);
}

function physicalPath(abs: string): string {
  const missing: string[] = [];
  let current = path.normalize(abs);
  while (!existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return path.normalize(abs);
    missing.unshift(path.basename(current));
    current = parent;
  }
  return path.join(realpathSync.native(current), ...missing);
}

/** Non-glob entries expanded to absolute paths (for srt, which is path-based). */
function expandPaths(entries: string[] | undefined, cwd: string): string[] {
  return (entries ?? [])
    .filter((e) => !isGlob(e))
    .map((e) => physicalPath(expand(e, cwd)));
}

function collectGlobMatches(pattern: string, cwd: string): string[] {
  const matches: string[] = [];
  const re = globToRegExp(pattern);
  const stack = [cwd];

  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (re.test(entry.name)) matches.push(physicalPath(fullPath));
      if (entry.isDirectory() && !SKIP_GLOB_DIRS.has(entry.name)) {
        stack.push(fullPath);
      }
    }
  }

  return matches;
}

function expandDenyPaths(entries: string[] | undefined, cwd: string): string[] {
  return (entries ?? []).flatMap((entry) =>
    isGlob(entry)
      ? collectGlobMatches(entry, cwd)
      : [physicalPath(expand(entry, cwd))],
  );
}

function isInside(base: string, target: string): boolean {
  if (target === base) return true;
  const rel = path.relative(base, target);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function denied(entries: string[], abs: string, cwd: string): boolean {
  for (const e of entries) {
    if (isGlob(e)) {
      if (globToRegExp(e).test(path.basename(abs))) return true;
    } else if (isInside(physicalPath(expand(e, cwd)), abs)) {
      return true;
    }
  }
  return false;
}

function buildPolicy(cfg: SandboxJson, cwd: string): Policy {
  const physicalCwd = physicalPath(cwd);
  const reads = (cfg.read ?? []).map((e) => physicalPath(expand(e, cwd)));
  const writes = (cfg.write ?? []).map((e) => physicalPath(expand(e, cwd)));
  return {
    cwd,
    // Writable implies readable.
    readDirs: [physicalCwd, ...reads, ...writes],
    writeDirs: [physicalCwd, ...writes],
    denyRead: cfg.denyRead ?? [],
    denyWrite: cfg.denyWrite ?? [],
  };
}

function canRead(p: Policy, abs: string): boolean {
  if (denied(p.denyRead, abs, p.cwd)) return false;
  return p.readDirs.some((dir) => isInside(dir, abs));
}

function canWrite(p: Policy, abs: string): boolean {
  if (denied(p.denyWrite, abs, p.cwd)) return false;
  return p.writeDirs.some((dir) => isInside(dir, abs));
}

function resolveTarget(target: string | undefined, cwd: string): string {
  const t = (target ?? "").trim();
  const cleaned = t.startsWith("@") ? t.slice(1) : t;
  if (!cleaned) return cwd;
  return path.isAbsolute(cleaned)
    ? path.normalize(cleaned)
    : path.resolve(cwd, cleaned);
}

function buildSrtConfig(cfg: SandboxJson, cwd: string): SandboxRuntimeConfig {
  return {
    network: {
      allowedDomains: cfg.allowedDomains ?? [],
      deniedDomains: [],
    },
    filesystem: {
      denyRead: expandDenyPaths(cfg.denyRead, cwd),
      allowWrite: [physicalPath(cwd), ...expandPaths(cfg.write, cwd)],
      denyWrite: expandDenyPaths(cfg.denyWrite, cwd),
    },
  };
}

function createSrtBashOps(): BashOperations {
  return {
    async exec(command, cwd, { onData, signal, timeout }) {
      if (!existsSync(cwd))
        throw new Error(`Working directory does not exist: ${cwd}`);
      const wrapped = await SandboxManager.wrapWithSandbox(command);
      return new Promise((resolve, reject) => {
        const child = spawn("bash", ["-c", wrapped], {
          cwd,
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let timedOut = false;
        let timer: NodeJS.Timeout | undefined;
        if (timeout !== undefined && timeout > 0) {
          timer = setTimeout(() => {
            timedOut = true;
            if (child.pid) {
              try {
                process.kill(-child.pid, "SIGKILL");
              } catch {
                child.kill("SIGKILL");
              }
            }
          }, timeout * 1000);
        }
        child.stdout?.on("data", onData);
        child.stderr?.on("data", onData);
        child.on("error", (err) => {
          if (timer) clearTimeout(timer);
          reject(err);
        });
        const onAbort = () => {
          if (child.pid) {
            try {
              process.kill(-child.pid, "SIGKILL");
            } catch {
              child.kill("SIGKILL");
            }
          }
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        child.on("close", (code) => {
          if (timer) clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          if (signal?.aborted) reject(new Error("aborted"));
          else if (timedOut) reject(new Error(`timeout:${timeout}`));
          else resolve({ exitCode: code });
        });
      });
    },
  };
}

function setStatus(ctx: ExtensionContext): void {
  if (active)
    ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("accent", STATUS_ICON));
  else ctx.ui.setStatus(STATUS_KEY, undefined);
}

async function activate(ctx: ExtensionContext): Promise<void> {
  active = false;
  policy = undefined;
  if (process.env[ESCAPE_ENV] === "1") {
    setStatus(ctx);
    return;
  }
  let cfg: SandboxJson | undefined;
  try {
    cfg = loadConfig(ctx.cwd);
  } catch (e) {
    ctx.ui.notify(`Sandbox: ${e instanceof Error ? e.message : e}`, "error");
    return;
  }
  if (!cfg) {
    setStatus(ctx);
    return;
  }
  try {
    await SandboxManager.initialize(buildSrtConfig(cfg, ctx.cwd));
    policy = buildPolicy(cfg, ctx.cwd);
    active = true;
    setStatus(ctx);
  } catch (e) {
    active = false;
    policy = undefined;
    ctx.ui.notify(
      `Sandbox FAILED to initialize - running UNSANDBOXED: ${e instanceof Error ? e.message : e}`,
      "error",
    );
  }
}

export default function (pi: ExtensionAPI) {
  let sessionCwd = process.cwd();
  let localBash = createBashTool(sessionCwd);

  pi.on("session_start", async (_event, ctx) => {
    sessionCwd = ctx.cwd;
    localBash = createBashTool(sessionCwd);
    await activate(ctx);
  });

  pi.on("session_shutdown", async () => {
    if (active) {
      active = false;
      policy = undefined;
      try {
        await SandboxManager.reset();
      } catch {
        // ignore
      }
    }
  });

  // Gate file tools by path allowlist. bash is handled by the srt override below.
  pi.on("tool_call", (event) => {
    if (!active || !policy) return;
    let target: string | undefined;
    let mode: "read" | "write";
    switch (event.toolName) {
      case "read":
      case "ls":
      case "find":
      case "grep":
        target = (event.input as { path?: string }).path;
        mode = "read";
        break;
      case "write":
      case "edit":
        target = (event.input as { path?: string }).path;
        mode = "write";
        break;
      default:
        return;
    }
    const abs = physicalPath(resolveTarget(target, policy.cwd));
    const ok = mode === "read" ? canRead(policy, abs) : canWrite(policy, abs);
    if (!ok) {
      return {
        block: true,
        reason: `Sandbox: ${mode} denied outside allowed paths: ${abs}`,
      };
    }
  });

  pi.registerTool({
    ...localBash,
    label: "bash (sandboxed)",
    async execute(id: any, params: any, signal: any, onUpdate: any, ctx: any) {
      const cwd = typeof ctx?.cwd === "string" ? ctx.cwd : sessionCwd;
      const bash = cwd === sessionCwd ? localBash : createBashTool(cwd);
      if (!active) return bash.execute(id, params, signal, onUpdate);
      const sandboxed = createBashTool(cwd, {
        operations: createSrtBashOps(),
      });
      return sandboxed.execute(id, params, signal, onUpdate);
    },
  } as any);

  pi.on("user_bash", () => {
    if (!active) return;
    return { operations: createSrtBashOps() };
  });

  pi.registerCommand("escape", {
    description: "Disable the sandbox for this session and reload",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      if (!active) {
        ctx.ui.notify("Sandbox is not active.", "info");
        return;
      }
      process.env[ESCAPE_ENV] = "1";
      try {
        await SandboxManager.reset();
      } catch {
        // ignore
      }
      active = false;
      policy = undefined;
      ctx.ui.setStatus(STATUS_KEY, undefined);
      ctx.ui.notify("Sandbox disabled for this session. Reloading…", "warning");
      await ctx.reload();
    },
  });
}
