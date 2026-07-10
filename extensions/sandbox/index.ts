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
 *     "scrubEnv": ["EXTRA_TOKEN"],          // extra env vars to strip
 *     "alias": { "gh": ["~/.cache/gh", "~/.config/gh"] }
 *   }
 *
 * `alias` is read only from the global config, never a project's config,
 * because a grant can override a global read mask.
 *
 * Commands:
 *   /sandbox info          - show the active policy.
 *   /sandbox grant <path>  - grant a directory for this session and reload.
 *   /sandbox grant <alias> - grant global alias directories and reload.
 *   /sandbox reset         - remove session grants and reload.
 *   /sandbox disable       - disable the sandbox for this session and reload.
 *   /sandbox enable        - re-enable the sandbox for this session and reload.
 *
 * Session command overrides and grants are persisted in the current session,
 * so resume restores the same sandbox status and grants.
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
const STATE_ENTRY_TYPE = "sandbox-state";

type SandboxOverride = "disable" | "enable";

interface SandboxState {
  override?: SandboxOverride;
  grants?: string[];
}

interface SandboxJson {
  enabled?: boolean;
  write?: string[];
  denyRead?: string[];
  allowEnv?: string[];
  scrubEnv?: string[];
  alias?: Record<string, string[]>;
}

interface Policy {
  cwd: string;
  writeDirs: string[];
  grantDirs: string[];
  denyRead: string[];
  scrubEnv: Set<string>;
}

let active = false;
let policy: Policy | undefined;
/** Session state set by /sandbox commands. Trumps config where applicable. */
let sessionState: SandboxState = {};

function configPaths(cwd: string, extraCwds: string[] = []): string[] {
  const projectCwds = [...new Set([cwd, ...extraCwds])];
  return [
    path.join(homedir(), ".pi", "agent", "sandbox.json"),
    ...projectCwds.map((projectCwd) =>
      path.join(projectCwd, ".pi", "sandbox.json"),
    ),
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
function loadConfig(cwd: string, extraCwds: string[] = []): SandboxJson {
  const merged: SandboxJson = {};
  for (const [index, p] of configPaths(cwd, extraCwds).entries()) {
    if (!existsSync(p)) continue;
    const cfg = readConfigFile(p);
    if (cfg.enabled !== undefined) merged.enabled = cfg.enabled;
    merged.write = [...(merged.write ?? []), ...(cfg.write ?? [])];
    merged.denyRead = [...(merged.denyRead ?? []), ...(cfg.denyRead ?? [])];
    merged.allowEnv = [...(merged.allowEnv ?? []), ...(cfg.allowEnv ?? [])];
    merged.scrubEnv = [...(merged.scrubEnv ?? []), ...(cfg.scrubEnv ?? [])];
    if (index === 0 && cfg.alias !== undefined) merged.alias = cfg.alias;
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

function buildPolicy(
  cfg: SandboxJson,
  cwd: string,
  sessionGrants: string[],
): Policy {
  const physicalCwd = physicalPath(cwd);
  const launchCwd = physicalPath(process.cwd());
  const writes = (cfg.write ?? []).map((e) => physicalPath(expand(e, cwd)));
  const denies = (cfg.denyRead ?? []).map((e) => physicalPath(expand(e, cwd)));
  const scrubEnv = new Set(cfg.scrubEnv ?? []);
  for (const keep of cfg.allowEnv ?? []) scrubEnv.delete(keep);
  return {
    cwd: physicalCwd,
    writeDirs: [
      ...new Set([physicalCwd, launchCwd, "/tmp", ...writes, ...sessionGrants]),
    ],
    grantDirs: sessionGrants,
    denyRead: denies,
    scrubEnv,
  };
}

function isGranted(p: Policy, abs: string): boolean {
  return p.grantDirs.some((dir) => isInside(dir, abs));
}

function isDenied(p: Policy, abs: string): boolean {
  return !isGranted(p, abs) && p.denyRead.some((dir) => isInside(dir, abs));
}

function canWrite(p: Policy, abs: string): boolean {
  return !isDenied(p, abs) && p.writeDirs.some((dir) => isInside(dir, abs));
}

function resolveTarget(target: string | undefined, cwd: string): string {
  const t = (target ?? "").trim();
  const cleaned = t.startsWith("@") ? t.slice(1) : t;
  if (!cleaned) return cwd;
  return path.isAbsolute(cleaned)
    ? path.normalize(cleaned)
    : path.resolve(cwd, cleaned);
}

function outermostDirs(dirs: string[]): string[] {
  return dirs.filter(
    (dir, index) =>
      dirs.findIndex((other) => other !== dir && isInside(other, dir)) === -1,
  );
}

function createGrantMountTargets(
  args: string[],
  maskedDirs: string[],
  grantDirs: string[],
): void {
  for (const grant of grantDirs) {
    const mask = maskedDirs.find((dir) => isInside(dir, grant));
    if (!mask) continue;
    const parts = path.relative(mask, grant).split(path.sep);
    for (let index = 1; index <= parts.length; index++) {
      args.push("--dir", path.join(mask, ...parts.slice(0, index)));
    }
  }
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
  // A grant can expose a child of a masked directory. Mask first, then recreate
  // the mount target and bind the explicit grant back over the mask.
  const masks = outermostDirs(
    p.denyRead.filter(
      (deny) =>
        existsSync(deny) && !p.grantDirs.some((grant) => isInside(grant, deny)),
    ),
  );
  const maskedDirs: string[] = [];
  for (const dir of masks) {
    if (statSync(dir).isDirectory()) {
      args.push("--tmpfs", dir);
      maskedDirs.push(dir);
    } else {
      args.push("--ro-bind", "/dev/null", dir);
    }
  }
  createGrantMountTargets(args, maskedDirs, p.grantDirs);
  for (const dir of p.grantDirs) {
    if (existsSync(dir)) args.push("--bind", dir, dir);
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

function isSandboxOverride(value: unknown): value is SandboxOverride {
  return value === "disable" || value === "enable";
}

function isDirectoryList(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function restoreSessionState(ctx: ExtensionContext): void {
  sessionState = {};
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type !== "custom" || entry.customType !== STATE_ENTRY_TYPE) {
      continue;
    }
    const state = entry.data as SandboxState | undefined;
    if (isSandboxOverride(state?.override))
      sessionState.override = state.override;
    if (isDirectoryList(state?.grants)) sessionState.grants = state.grants;
  }
}

function persistSessionState(pi: ExtensionAPI): void {
  pi.appendEntry<SandboxState>(STATE_ENTRY_TYPE, sessionState);
}

function resolveGrantDirectories(
  input: string,
  cfg: SandboxJson,
  cwd: string,
): string[] {
  const entries = cfg.alias?.[input] ?? [input];
  if (!isDirectoryList(entries)) {
    throw new Error(`Invalid global sandbox alias: ${input}`);
  }
  const dirs = [
    ...new Set(entries.map((entry) => physicalPath(expand(entry, cwd)))),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      throw new Error(`Grant must be an existing directory: ${dir}`);
    }
  }
  return dirs;
}

function showInfo(ctx: ExtensionCommandContext): void {
  if (!active || !policy) {
    ctx.ui.notify("Sandbox is disabled for this session.", "info");
    return;
  }
  const masked = policy.denyRead.filter(
    (dir) =>
      existsSync(dir) &&
      !policy.grantDirs.some((grant) => isInside(grant, dir)),
  );
  const lines = [
    "Sandbox active (pure bwrap)",
    "",
    `Writable:   ${summarize(policy.writeDirs)}`,
    `Grants:     ${policy.grantDirs.length ? summarize(policy.grantDirs) : "(none)"}`,
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
  const override = sessionState.override;
  if (override === "disable") {
    setStatus(ctx);
    return;
  }
  const launchCwd = process.cwd();
  const extraConfigCwds = launchCwd !== ctx.cwd ? [launchCwd] : [];
  // On by default. Invalid config fails safe (defaults still apply).
  let cfg: SandboxJson = {};
  try {
    cfg = loadConfig(ctx.cwd, extraConfigCwds);
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
  policy = buildPolicy(cfg, ctx.cwd, sessionState.grants ?? []);
  active = true;
  setStatus(ctx);
}

export default function (pi: ExtensionAPI) {
  let sessionCwd = process.cwd();
  let localBash = createBashTool(sessionCwd);

  pi.on("session_start", (_event, ctx) => {
    sessionCwd = ctx.cwd;
    localBash = createBashTool(sessionCwd);
    restoreSessionState(ctx);
    activate(ctx);
  });

  pi.on("session_tree", (_event, ctx) => {
    restoreSessionState(ctx);
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
    description: "Sandbox control: /sandbox [info|grant|reset|enable|disable]",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const input = args.trim();
      const separator = input.search(/\s/);
      const sub =
        (separator === -1 ? input : input.slice(0, separator)).toLowerCase() ||
        "info";
      const value = separator === -1 ? "" : input.slice(separator).trim();
      switch (sub) {
        case "info":
          showInfo(ctx);
          return;
        case "grant": {
          if (!active) {
            ctx.ui.notify(
              "Sandbox is disabled; enable it before granting access.",
              "info",
            );
            return;
          }
          if (!value) {
            ctx.ui.notify("Usage: /sandbox grant <directory-or-alias>", "info");
            return;
          }
          let cfg: SandboxJson;
          try {
            const launchCwd = process.cwd();
            const extraConfigCwds = launchCwd !== ctx.cwd ? [launchCwd] : [];
            cfg = loadConfig(ctx.cwd, extraConfigCwds);
            const dirs = resolveGrantDirectories(value, cfg, ctx.cwd);
            sessionState.grants = [
              ...new Set([...(sessionState.grants ?? []), ...dirs]),
            ];
          } catch (e) {
            ctx.ui.notify(
              `Sandbox: ${e instanceof Error ? e.message : e}`,
              "error",
            );
            return;
          }
          persistSessionState(pi);
          ctx.ui.notify("Sandbox grant added. Reloading…", "warning");
          await ctx.reload();
          return;
        }
        case "reset":
          if (!sessionState.grants?.length) {
            ctx.ui.notify("Sandbox has no session grants.", "info");
            return;
          }
          sessionState.grants = [];
          persistSessionState(pi);
          ctx.ui.notify("Sandbox grants reset. Reloading…", "warning");
          await ctx.reload();
          return;
        case "disable":
          if (!active) {
            ctx.ui.notify("Sandbox is already disabled.", "info");
            return;
          }
          sessionState.override = "disable";
          persistSessionState(pi);
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
          sessionState.override = "enable";
          persistSessionState(pi);
          ctx.ui.notify("Sandbox enabling. Reloading…", "warning");
          await ctx.reload();
          return;
        default:
          ctx.ui.notify(
            "Usage: /sandbox [info|grant <directory-or-alias>|reset|enable|disable]",
            "info",
          );
      }
    },
  });
}
