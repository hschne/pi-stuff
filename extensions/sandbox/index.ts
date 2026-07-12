/**
 * Sandbox extension (on by default, pure bubblewrap).
 *
 * Active in every session unless explicitly disabled. Disable with
 * `/sandbox disable` (this session) or `"enabled": false` in a `sandbox.json`.
 * An explicit `/sandbox enable` overrides `"enabled": false`.
 *
 * Threat model: the agent and its subprocesses are not trusted. Enforcement has
 * two adapters behind one policy module:
 *
 *   1. bash + `!` run inside `bwrap` with a read-only root, writable cwd and
 *      /tmp, configured read masks, and configured environment scrubbing.
 *   2. In-process file tools cross the same policy through the `tool_call` hook.
 *
 * Config is read from both locations. Project arrays extend global arrays;
 * project scalar values override global values:
 *   - `~/.pi/agent/sandbox.json`
 *   - `<cwd>/.pi/sandbox.json`
 *
 * All keys are optional:
 *   {
 *     "enabled":  false,
 *     "write":    ["~/.local/share/pnpm"],
 *     "denyRead": ["~/extra-secret"],
 *     "allowEnv": ["DATABASE_URL"],
 *     "scrubEnv": ["EXTRA_TOKEN"],
 *     "alias": { "gh": ["~/.cache/gh", "~/.config/gh"] }
 *   }
 *
 * `alias` is accepted only in the global config because a grant can override a
 * global read mask. Invalid project config is ignored without discarding the
 * global policy. Invalid global config or missing bwrap blocks sandboxed tools
 * until the user fixes the problem or explicitly disables the sandbox.
 *
 * Commands:
 *   /sandbox info          - show the active policy.
 *   /sandbox grant <path>  - grant a directory for this session and reload.
 *   /sandbox grant <alias> - grant global alias directories and reload.
 *   /sandbox reset         - remove session grants and reload.
 *   /sandbox disable       - disable the sandbox for this session and reload.
 *   /sandbox enable        - re-enable the sandbox for this session and reload.
 *
 * Requirements (Linux): bwrap.
 */

import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import {
  type BashOperations,
  createBashToolDefinition,
  type ExtensionAPI,
  type ExtensionCommandContext,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
  loadSandboxConfig,
  SandboxPolicy,
  type SandboxJson,
} from "./policy.js";
import { renderBashCall, renderBashResult } from "../shared/bash-renderer.js";

const STATUS_KEY = "sandbox";
const STATUS_ICON = "";
const STATE_ENTRY_TYPE = "sandbox-state";

type SandboxOverride = "disable" | "enable";

interface SandboxState {
  override?: SandboxOverride;
  grants?: string[];
  pendingNotice?: string | null;
}

type RuntimeState =
  | { status: "disabled" }
  | { status: "blocked"; reason: string }
  | { status: "active"; policy: SandboxPolicy };

let runtime: RuntimeState = { status: "disabled" };
let sessionState: SandboxState = {};

function extraConfigCwds(cwd: string): string[] {
  const launchCwd = process.cwd();
  return launchCwd === cwd ? [] : [launchCwd];
}

function createBwrapBashOperations(policy: SandboxPolicy): BashOperations {
  return {
    async exec(command, cwd, { onData, signal, timeout, env }) {
      if (!existsSync(cwd)) {
        throw new Error(`Working directory does not exist: ${cwd}`);
      }
      const args = [...policy.bwrapArgs(cwd), "--", "bash", "-c", command];
      const child = spawn("bwrap", args, {
        cwd,
        env: policy.scrubbedEnv(env ?? process.env),
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      return new Promise((resolve, reject) => {
        const killTree = () => {
          if (!child.pid) return;
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            child.kill("SIGKILL");
          }
        };
        const onAbort = () => killTree();
        let timedOut = false;
        let timer: NodeJS.Timeout | undefined;

        if (timeout !== undefined && timeout > 0) {
          timer = setTimeout(() => {
            timedOut = true;
            killTree();
          }, timeout * 1000);
        }
        if (signal?.aborted) onAbort();
        else signal?.addEventListener("abort", onAbort, { once: true });

        child.stdout?.on("data", onData);
        child.stderr?.on("data", onData);
        child.on("error", (error) => {
          if (timer) clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          reject(error);
        });
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

function createBlockedBashOperations(reason: string): BashOperations {
  return {
    async exec() {
      throw new Error(`Sandbox blocked: ${reason}`);
    },
  };
}

function summarize(items: readonly string[], max = 3): string {
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
    if (isSandboxOverride(state?.override)) {
      sessionState.override = state.override;
    }
    if (isDirectoryList(state?.grants)) sessionState.grants = state.grants;
    if (
      state?.pendingNotice === null ||
      typeof state?.pendingNotice === "string"
    ) {
      sessionState.pendingNotice = state.pendingNotice;
    }
  }
}

function persistSessionState(pi: ExtensionAPI): void {
  pi.appendEntry<SandboxState>(STATE_ENTRY_TYPE, sessionState);
}

function showPendingNotice(pi: ExtensionAPI, ctx: ExtensionContext): void {
  if (!sessionState.pendingNotice) return;

  const notice = sessionState.pendingNotice;
  sessionState.pendingNotice = null;
  persistSessionState(pi);
  ctx.ui.notify(notice, "warning");
}

function showInfo(ctx: ExtensionCommandContext): void {
  if (runtime.status === "disabled") {
    ctx.ui.notify("Sandbox is disabled for this session.", "info");
    return;
  }
  if (runtime.status === "blocked") {
    ctx.ui.notify(`Sandbox is blocked: ${runtime.reason}`, "error");
    return;
  }

  const { policy } = runtime;
  const masked = policy.maskedReadDirs();
  const lines = [
    "Sandbox active (pure bwrap)",
    "",
    `Writable:   ${summarize(policy.writeDirs)}`,
    `Grants:     ${policy.grantDirs.length ? summarize(policy.grantDirs) : "(none)"}`,
    `Read masks: ${masked.length ? summarize(masked) : "(none present)"}`,
    `Env scrub:  ${policy.scrubEnvCount} secret var(s) stripped from bash`,
    "Network:    full (no per-domain allowlist)",
  ];
  ctx.ui.notify(lines.join("\n"), "info");
}

function setStatus(ctx: ExtensionContext): void {
  if (runtime.status === "active") {
    ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("accent", STATUS_ICON));
  } else if (runtime.status === "blocked") {
    ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("warning", STATUS_ICON));
  } else {
    ctx.ui.setStatus(STATUS_KEY, undefined);
  }
}

function activate(ctx: ExtensionContext): void {
  runtime = { status: "disabled" };
  if (sessionState.override === "disable") {
    setStatus(ctx);
    return;
  }

  const { config, issues } = loadSandboxConfig(
    ctx.cwd,
    extraConfigCwds(ctx.cwd),
  );
  for (const issue of issues) {
    ctx.ui.notify(
      `Sandbox: invalid ${issue.path}: ${issue.message}${issue.fatal ? "" : " (ignored)"}`,
      "error",
    );
  }
  const fatalIssue = issues.find((issue) => issue.fatal);
  if (fatalIssue) {
    runtime = {
      status: "blocked",
      reason: `invalid global config: ${fatalIssue.message}`,
    };
    setStatus(ctx);
    return;
  }

  if (config.enabled === false && sessionState.override !== "enable") {
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
    runtime = { status: "blocked", reason: "bwrap not found" };
    ctx.ui.notify(
      "Sandbox blocked: bwrap not found (/sandbox disable to run unsandboxed)",
      "error",
    );
    setStatus(ctx);
    return;
  }

  try {
    runtime = {
      status: "active",
      policy: new SandboxPolicy(config, ctx.cwd, sessionState.grants ?? []),
    };
  } catch (error) {
    runtime = {
      status: "blocked",
      reason: error instanceof Error ? error.message : String(error),
    };
    ctx.ui.notify(`Sandbox blocked: ${runtime.reason}`, "error");
  }
  setStatus(ctx);
}

export default function sandboxExtension(pi: ExtensionAPI) {
  let sessionCwd = process.cwd();
  const registeredBash = createBashToolDefinition(sessionCwd);

  pi.on("session_start", (_event, ctx) => {
    sessionCwd = ctx.cwd;
    restoreSessionState(ctx);
    activate(ctx);
    showPendingNotice(pi, ctx);
  });

  pi.on("session_tree", (_event, ctx) => {
    sessionCwd = ctx.cwd;
    restoreSessionState(ctx);
    activate(ctx);
    showPendingNotice(pi, ctx);
  });

  pi.on("session_shutdown", () => {
    runtime = { status: "disabled" };
  });

  pi.on("tool_call", (event) => {
    const modes: Record<string, "read" | "write"> = {
      read: "read",
      ls: "read",
      find: "read",
      grep: "read",
      write: "write",
      edit: "write",
    };
    const mode = modes[event.toolName];
    if (!mode || runtime.status === "disabled") return;
    if (runtime.status === "blocked") {
      return {
        block: true,
        reason: `Sandbox blocked: ${runtime.reason}`,
      };
    }

    const target = (event.input as { path?: string }).path;
    const decision = runtime.policy.checkAccess(target, mode);
    if (!decision.allowed) {
      return {
        block: true,
        reason: `Sandbox: ${mode} denied for path: ${decision.path}`,
      };
    }
  });

  pi.registerTool({
    ...registeredBash,
    label: "bash (sandboxed)",
    renderCall(args, theme) {
      return renderBashCall(args, theme);
    },
    renderResult(result, { expanded }, theme) {
      return renderBashResult(result, expanded, theme);
    },
    async execute(id, params, signal, onUpdate, ctx) {
      const cwd = typeof ctx.cwd === "string" ? ctx.cwd : sessionCwd;
      if (runtime.status === "blocked") {
        throw new Error(`Sandbox blocked: ${runtime.reason}`);
      }
      const operations =
        runtime.status === "active"
          ? createBwrapBashOperations(runtime.policy)
          : undefined;
      const bash = createBashToolDefinition(cwd, { operations });
      return bash.execute(id, params, signal, onUpdate, ctx);
    },
  });

  pi.on("user_bash", () => {
    if (runtime.status === "disabled") return;
    if (runtime.status === "blocked") {
      return { operations: createBlockedBashOperations(runtime.reason) };
    }
    return { operations: createBwrapBashOperations(runtime.policy) };
  });

  pi.registerCommand("sandbox", {
    description: "Sandbox control: /sandbox [info|grant|reset|enable|disable]",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const input = args.trim();
      const separator = input.search(/\s/);
      const subcommand =
        (separator === -1 ? input : input.slice(0, separator)).toLowerCase() ||
        "info";
      const value = separator === -1 ? "" : input.slice(separator).trim();

      switch (subcommand) {
        case "info":
          showInfo(ctx);
          return;
        case "grant": {
          if (runtime.status !== "active") {
            ctx.ui.notify(
              "Sandbox must be active before granting access.",
              "info",
            );
            return;
          }
          if (!value) {
            ctx.ui.notify("Usage: /sandbox grant <directory-or-alias>", "info");
            return;
          }

          let config: SandboxJson;
          try {
            const result = loadSandboxConfig(ctx.cwd, extraConfigCwds(ctx.cwd));
            const fatalIssue = result.issues.find((issue) => issue.fatal);
            if (fatalIssue) throw new Error(fatalIssue.message);
            config = result.config;
            const directories = SandboxPolicy.resolveGrantDirectories(
              value,
              config,
              ctx.cwd,
            );
            sessionState.grants = [
              ...new Set([...(sessionState.grants ?? []), ...directories]),
            ];
          } catch (error) {
            ctx.ui.notify(
              `Sandbox: ${error instanceof Error ? error.message : String(error)}`,
              "error",
            );
            return;
          }

          sessionState.pendingNotice = "Sandbox grant added.";
          persistSessionState(pi);
          await ctx.reload();
          return;
        }
        case "reset":
          if (!sessionState.grants?.length) {
            ctx.ui.notify("Sandbox has no session grants.", "info");
            return;
          }
          sessionState.grants = [];
          sessionState.pendingNotice = "Sandbox grants reset.";
          persistSessionState(pi);
          await ctx.reload();
          return;
        case "disable":
          if (runtime.status === "disabled") {
            ctx.ui.notify("Sandbox is already disabled.", "info");
            return;
          }
          sessionState.override = "disable";
          sessionState.pendingNotice = "Sandbox disabled for this session.";
          persistSessionState(pi);
          runtime = { status: "disabled" };
          ctx.ui.setStatus(STATUS_KEY, undefined);
          await ctx.reload();
          return;
        case "enable":
          if (runtime.status === "active") {
            ctx.ui.notify("Sandbox is already enabled.", "info");
            return;
          }
          sessionState.override = "enable";
          sessionState.pendingNotice = "Sandbox enabled for this session.";
          persistSessionState(pi);
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
