/**
 * Sandbox extension (on by default, pure bubblewrap).
 *
 * Active in EVERY session unless explicitly disabled. Disable with
 * `/sandbox disable` (this session) or `"enabled": false` in a `sandbox.json`.
 * An explicit `/sandbox enable` overrides `"enabled": false`. Config is optional
 * and only customizes the baked-in defaults; with no config the secure defaults
 * apply.
 *
 * Threat model: the agent is NOT trusted (prompt injection from poisoned repos,
 * malicious package postinstall scripts, etc.). We defend against the agent
 * itself AND its subprocesses. Two layers, because OS sandboxing only covers
 * bash:
 *
 *   1. bash + `!` run inside `bwrap`:
 *        - read-only root (everything readable EXCEPT masked secret paths)
 *        - writable: cwd + /tmp only (+ config.write)
 *        - full network (no per-domain allowlist by design)
 *        - PID namespace isolated
 *        - secret env vars stripped (the #1 exfil control under full network)
 *   2. The agent's in-process file tools (read/write/edit/grep/find/ls) are
 *      gated by the same policy via the `tool_call` hook.
 *
 * Confidentiality rests on two fixed, low-maintenance deny-lists that ship as
 * DATA in the global config (`~/.pi/agent/sandbox.json`), not in this code:
 *   - SECRET ENV vars are scrubbed from sandboxed bash via the `scrubEnv` list
 *     (global + project). Add project-specific secrets there explicitly.
 *   - SKELETON-KEY paths (~/.ssh, ~/.config/fnox, ~/.pi, cloud creds, ...) are
 *     listed in the global `denyRead` and masked from reads on both layers. Only
 *     existing paths are masked, so no placeholder files are ever created.
 *
 * Config is read from BOTH (project overrides/extends global; arrays concatenate):
 *   - `~/.pi/agent/sandbox.json`        (global)
 *   - `<cwd>/.pi/sandbox.json`          (project)
 * All keys optional — the file is an EXCEPTION file on top of secure defaults:
 *   {
 *     "enabled":  false,                    // turn the sandbox off entirely
 *     "write":    ["~/.local/share/pnpm"],  // extra writable paths
 *     "denyRead": ["~/extra-secret"],       // extra read masks
 *     "allowEnv": ["DATABASE_URL"],         // secret env vars to KEEP for this project
 *     "scrubEnv": ["EXTRA_TOKEN"]           // extra env vars to strip
 *   }
 *
 * Commands:
 *   /sandbox info     - show the active policy.
 *   /sandbox disable  - disable the sandbox for this session and reload.
 *   /sandbox enable   - re-enable the sandbox for this session and reload.
 *
 * Requirements (Linux): bwrap.
 */

import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import {
  type BashOperations,
  createBashTool,
  type ExtensionAPI,
  type ExtensionCommandContext,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "sandbox";
const STATUS_ICON = "";
/** Session override set by /sandbox enable|disable. Trumps config either way. */
const OVERRIDE_ENV = "PI_SANDBOX_OVERRIDE"; // "disable" | "enable" | unset

interface SandboxJson {
  enabled?: boolean;
  write?: string[];
  denyRead?: string[];
  allowEnv?: string[];
  scrubEnv?: string[];
}

interface Policy {
  cwd: string;
  writeDirs: string[];
  denyRead: string[];
  scrubEnv: Set<string>;
}

let active = false;
let policy: Policy | undefined;

function configPaths(cwd: string): string[] {
  return [
    path.join(homedir(), ".pi", "agent", "sandbox.json"),
    path.join(cwd, ".pi", "sandbox.json"),
  ];
}

function readConfigFile(p: string): SandboxJson {
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as SandboxJson;
  } catch (e) {
    throw new Error(`Invalid ${p}: ${e instanceof Error ? e.message : e}`);
  }
}

/** Merge global + project config. Scalars override; arrays concatenate. */
function loadConfig(cwd: string): SandboxJson {
  const merged: SandboxJson = {};
  for (const p of configPaths(cwd)) {
    if (!existsSync(p)) continue;
    const cfg = readConfigFile(p);
    if (cfg.enabled !== undefined) merged.enabled = cfg.enabled;
    merged.write = [...(merged.write ?? []), ...(cfg.write ?? [])];
    merged.denyRead = [...(merged.denyRead ?? []), ...(cfg.denyRead ?? [])];
    merged.allowEnv = [...(merged.allowEnv ?? []), ...(cfg.allowEnv ?? [])];
    merged.scrubEnv = [...(merged.scrubEnv ?? []), ...(cfg.scrubEnv ?? [])];
  }
  return merged;
}

function expand(entry: string, cwd: string): string {
  let e = entry;
  if (e === "~") return homedir();
  if (e.startsWith("~/")) e = path.join(homedir(), e.slice(2));
  return path.isAbsolute(e) ? path.normalize(e) : path.resolve(cwd, e);
}

/** Resolve symlinks for existing prefix, keep missing tail (path may not exist). */
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

function isInside(base: string, target: string): boolean {
  if (target === base) return true;
  const rel = path.relative(base, target);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function buildPolicy(cfg: SandboxJson, cwd: string): Policy {
  const physicalCwd = physicalPath(cwd);
  const writes = (cfg.write ?? []).map((e) => physicalPath(expand(e, cwd)));
  const denies = (cfg.denyRead ?? []).map((e) => physicalPath(expand(e, cwd)));
  const scrubEnv = new Set(cfg.scrubEnv ?? []);
  for (const keep of cfg.allowEnv ?? []) scrubEnv.delete(keep);
  return {
    cwd: physicalCwd,
    writeDirs: [physicalCwd, "/tmp", ...writes],
    denyRead: denies,
    scrubEnv,
  };
}

function isDenied(p: Policy, abs: string): boolean {
  return p.denyRead.some((dir) => isInside(dir, abs));
}

function canWrite(p: Policy, abs: string): boolean {
  if (isDenied(p, abs)) return false;
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

/** bwrap arguments enforcing the filesystem policy (network is left untouched). */
function buildBwrapArgs(p: Policy): string[] {
  const args = [
    "--die-with-parent",
    "--new-session",
    "--unshare-pid",
    "--ro-bind",
    "/",
    "/",
    "--proc",
    "/proc",
    "--dev",
    "/dev",
  ];
  for (const dir of p.writeDirs) {
    if (existsSync(dir)) args.push("--bind", dir, dir);
  }
  // Mask secrets AFTER writable binds so they win. Existing paths only.
  for (const dir of p.denyRead) {
    if (!existsSync(dir)) continue;
    if (statSync(dir).isDirectory()) args.push("--tmpfs", dir);
    else args.push("--ro-bind", "/dev/null", dir);
  }
  args.push("--chdir", p.cwd);
  return args;
}

function scrubbedEnv(
  base: NodeJS.ProcessEnv,
  scrub: Set<string>,
): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(base)) {
    if (!scrub.has(k)) out[k] = v;
  }
  return out;
}

function createBwrapBashOps(): BashOperations {
  return {
    async exec(command, cwd, { onData, signal, timeout, env }) {
      if (!existsSync(cwd))
        throw new Error(`Working directory does not exist: ${cwd}`);
      if (!policy) throw new Error("Sandbox policy missing");
      const args = [...buildBwrapArgs(policy), "--", "bash", "-c", command];
      const childEnv = scrubbedEnv(env ?? process.env, policy.scrubEnv);
      return new Promise((resolve, reject) => {
        const child = spawn("bwrap", args, {
          cwd,
          env: childEnv,
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
        // Kill the whole process group (PID-namespaced by bwrap), falling back
        // to the direct child if the group signal fails.
        const killTree = () => {
          if (!child.pid) return;
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            child.kill("SIGKILL");
          }
        };
        let timedOut = false;
        let timer: NodeJS.Timeout | undefined;
        if (timeout !== undefined && timeout > 0) {
          timer = setTimeout(() => {
            timedOut = true;
            killTree();
          }, timeout * 1000);
        }
        child.stdout?.on("data", onData);
        child.stderr?.on("data", onData);
        child.on("error", (err) => {
          if (timer) clearTimeout(timer);
          reject(err);
        });
        const onAbort = () => killTree();
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

/** Join a list, truncating to `max` entries with a "(+N more)" suffix. */
function summarize(items: string[], max = 3): string {
  if (items.length <= max) return items.join(", ");
  return `${items.slice(0, max).join(", ")} (+${items.length - max} more)`;
}

function showInfo(ctx: ExtensionCommandContext): void {
  if (!active || !policy) {
    ctx.ui.notify("Sandbox is disabled for this session.", "info");
    return;
  }
  const masked = policy.denyRead.filter((d) => existsSync(d));
  const lines = [
    "Sandbox active (pure bwrap)",
    "",
    `Writable:   ${summarize(policy.writeDirs)}`,
    `Read masks: ${masked.length ? summarize(masked) : "(none present)"}`,
    `Env scrub:  ${policy.scrubEnv.size} secret var(s) stripped from bash`,
    "Network:    full (no per-domain allowlist)",
  ];
  ctx.ui.notify(lines.join("\n"), "info");
}

function setStatus(ctx: ExtensionContext): void {
  if (active)
    ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("accent", STATUS_ICON));
  else ctx.ui.setStatus(STATUS_KEY, undefined);
}

function activate(ctx: ExtensionContext): void {
  active = false;
  policy = undefined;
  const override = process.env[OVERRIDE_ENV];
  if (override === "disable") {
    setStatus(ctx);
    return;
  }
  // On by default. Invalid config fails safe (defaults still apply).
  let cfg: SandboxJson = {};
  try {
    cfg = loadConfig(ctx.cwd);
  } catch (e) {
    ctx.ui.notify(
      `Sandbox: ${e instanceof Error ? e.message : e} (using defaults)`,
      "error",
    );
  }
  // Config can disable, but an explicit `/sandbox enable` overrides it.
  if (cfg.enabled === false && override !== "enable") {
    ctx.ui.notify(
      "Sandbox disabled via config (/sandbox enable to override)",
      "info",
    );
    setStatus(ctx);
    return;
  }
  if (
    !existsSync("/usr/bin/bwrap") &&
    spawnSync("which", ["bwrap"]).status !== 0
  ) {
    ctx.ui.notify(
      "Sandbox FAILED: bwrap not found - running UNSANDBOXED",
      "error",
    );
    setStatus(ctx);
    return;
  }
  policy = buildPolicy(cfg, ctx.cwd);
  active = true;
  setStatus(ctx);
}

export default function (pi: ExtensionAPI) {
  let sessionCwd = process.cwd();
  let localBash = createBashTool(sessionCwd);

  pi.on("session_start", (_event, ctx) => {
    sessionCwd = ctx.cwd;
    localBash = createBashTool(sessionCwd);
    activate(ctx);
  });

  pi.on("session_shutdown", () => {
    active = false;
    policy = undefined;
  });

  // Gate the agent's in-process file tools. bash is handled by the bwrap override.
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
    const ok = mode === "read" ? !isDenied(policy, abs) : canWrite(policy, abs);
    if (!ok) {
      return {
        block: true,
        reason: `Sandbox: ${mode} denied for path: ${abs}`,
      };
    }
  });

  pi.registerTool({
    ...localBash,
    label: "bash (sandboxed)",
    async execute(id: any, params: any, signal: any, onUpdate: any, ctx: any) {
      const cwd = typeof ctx?.cwd === "string" ? ctx.cwd : sessionCwd;
      if (!active) {
        const bash = cwd === sessionCwd ? localBash : createBashTool(cwd);
        return bash.execute(id, params, signal, onUpdate);
      }
      const sandboxed = createBashTool(cwd, {
        operations: createBwrapBashOps(),
      });
      return sandboxed.execute(id, params, signal, onUpdate);
    },
  } as any);

  pi.on("user_bash", () => {
    if (!active) return;
    return { operations: createBwrapBashOps() };
  });

  pi.registerCommand("sandbox", {
    description: "Sandbox control: /sandbox [info|enable|disable]",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const sub = args.trim().toLowerCase() || "info";
      switch (sub) {
        case "info":
          showInfo(ctx);
          return;
        case "disable":
          if (!active) {
            ctx.ui.notify("Sandbox is already disabled.", "info");
            return;
          }
          process.env[OVERRIDE_ENV] = "disable";
          active = false;
          policy = undefined;
          ctx.ui.setStatus(STATUS_KEY, undefined);
          ctx.ui.notify(
            "Sandbox disabled for this session. Reloading…",
            "warning",
          );
          await ctx.reload();
          return;
        case "enable":
          if (active) {
            ctx.ui.notify("Sandbox is already enabled.", "info");
            return;
          }
          process.env[OVERRIDE_ENV] = "enable";
          ctx.ui.notify("Sandbox enabling. Reloading…", "warning");
          await ctx.reload();
          return;
        default:
          ctx.ui.notify("Usage: /sandbox [info|enable|disable]", "info");
      }
    },
  });
}
