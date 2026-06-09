/**
 * pi-ralph
 *
 * Deterministic ralph loops. Re-runs a fresh-context worker subagent until a
 * scriptable stop condition (exit code) is satisfied — replacing the flaky
 * "did the iteration edit a file?" convergence heuristic.
 *
 * Slash commands (human-driven):
 *   /ralph [@name] [--model=] [--thinking=] [--max=]   start a loop
 *   /ralph-stop                                         stop the active loop
 *   /ralph-status                                       show loop state / configs
 *
 * Agent tools (LLM-driven): ralph_start, ralph_stop, ralph_status.
 *
 * Config: .pi/ralph/<name>.md (project) or ~/.pi/agent/ralph/<name>.md (user).
 * Delegation goes through the pi-subagents slash bridge (`subagent:slash:*`).
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { Key, matchesKey } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { parseRalphArgs } from "./args.js";
import { listConfigNames, loadConfig } from "./config.js";
import {
  type LoopHandle,
  type LoopOverrides,
  type LoopResult,
  runRalphLoop,
} from "./loop.js";
import { RALPH_EVENT_TYPE, renderRalphEvent } from "./renderer.js";

export default function ralphExtension(pi: ExtensionAPI) {
  let activeLoop: LoopHandle | undefined;
  let escUnsub: (() => void) | undefined;

  pi.registerMessageRenderer(RALPH_EVENT_TYPE, renderRalphEvent);

  const installEscHandler = (ctx: ExtensionContext) => {
    if (!ctx.hasUI || escUnsub) return;
    escUnsub = ctx.ui.onTerminalInput((input) => {
      if (!activeLoop) return undefined;
      if (!matchesKey(input, Key.escape)) return undefined;
      const name = activeLoop.name;
      activeLoop.cancel();
      ctx.ui.notify(`Stopping ralph loop "${name}"...`, "warning");
      return { consume: true };
    });
  };

  const clearEscHandler = () => {
    escUnsub?.();
    escUnsub = undefined;
  };

  /**
   * Shared loop lifecycle used by both the /ralph command and the ralph_start
   * tool: resolve config, install esc handling, run to completion, clean up.
   */
  const startLoop = async (
    ctx: ExtensionContext,
    name: string | undefined,
    overrides: LoopOverrides,
  ): Promise<
    { ok: true; result: LoopResult } | { ok: false; error: string }
  > => {
    if (activeLoop) {
      return {
        ok: false,
        error: `A ralph loop ("${activeLoop.name}") is already running. Stop it first.`,
      };
    }

    const config = loadConfig(ctx.cwd, name);
    if (!config.ok) return { ok: false, error: config.error };

    installEscHandler(ctx);
    try {
      const result = await runRalphLoop(
        pi,
        ctx,
        config.config,
        overrides,
        (handle) => {
          activeLoop = handle;
        },
      );
      return { ok: true, result };
    } finally {
      activeLoop = undefined;
      clearEscHandler();
    }
  };

  // ---------------------------------------------------------------- commands

  pi.registerCommand("ralph", {
    description:
      "Start a deterministic ralph loop (/ralph [@name] [--model=] [--thinking=] [--max=])",
    getArgumentCompletions: (prefix) => {
      const trimmed = prefix.trimStart();
      if (trimmed.startsWith("-")) return null;
      try {
        return listConfigNames(process.cwd()).map((name) => ({
          value: `@${name}`,
          label: `@${name}`,
        }));
      } catch {
        return null;
      }
    },
    handler: async (args, ctx) => {
      const parsed = parseRalphArgs(args);
      if (!parsed.ok) {
        if (ctx.hasUI) ctx.ui.notify(parsed.error, "error");
        return;
      }
      const outcome = await startLoop(ctx, parsed.name, parsed.overrides);
      if (!outcome.ok && ctx.hasUI) ctx.ui.notify(outcome.error, "error");
    },
  });

  pi.registerCommand("ralph-stop", {
    description: "Stop the currently running ralph loop",
    handler: async (_args, ctx) => {
      if (!activeLoop) {
        if (ctx.hasUI) ctx.ui.notify("No ralph loop is running.", "info");
        return;
      }
      const name = activeLoop.name;
      activeLoop.cancel();
      if (ctx.hasUI)
        ctx.ui.notify(`Stopping ralph loop "${name}"...`, "warning");
    },
  });

  pi.registerCommand("ralph-status", {
    description: "Show ralph loop status and available configs",
    handler: async (_args, ctx) => {
      if (ctx.hasUI) ctx.ui.notify(statusText(ctx), "info");
    },
  });

  // ------------------------------------------------------------------- tools

  const textResult = (text: string, details?: unknown) => ({
    content: [{ type: "text" as const, text }],
    details: details ?? {},
  });

  pi.registerTool({
    name: "ralph_start",
    label: "Ralph Start",
    description:
      "Start a deterministic ralph loop and run it to completion. Re-runs a fresh worker subagent until the config's stop script reports done (exit 0), no progress is made, or maxIterations is reached. Configs live in .pi/ralph/<name>.md. Returns the end reason and iteration count. Blocks until the loop finishes; the user can interrupt with esc or /ralph-stop.",
    parameters: Type.Object({
      name: Type.Optional(
        Type.String({
          description:
            "Config name (e.g. 'cleanup' for .pi/ralph/cleanup.md). Defaults to 'ralph'.",
        }),
      ),
      model: Type.Optional(
        Type.String({
          description:
            "Override the worker model, e.g. 'anthropic/claude-sonnet-4-6'.",
        }),
      ),
      thinking: Type.Optional(
        Type.Union(
          ["off", "minimal", "low", "medium", "high"].map((l) =>
            Type.Literal(l),
          ),
          { description: "Override the worker thinking level." },
        ),
      ),
      max: Type.Optional(
        Type.Integer({
          minimum: 1,
          description: "Override maxIterations (safety cap).",
        }),
      ),
    }),
    execute: async (_id, params, _signal, _onUpdate, ctx) => {
      if (activeLoop) {
        return textResult(
          `A ralph loop ("${activeLoop.name}") is already running. Use ralph_stop first.`,
        );
      }
      const overrides: LoopOverrides = {
        model: params.model,
        thinking: params.thinking,
        maxIterations: params.max,
      };
      const outcome = await startLoop(ctx, params.name, overrides);
      if (!outcome.ok)
        return textResult(`ralph_start failed: ${outcome.error}`, {
          error: outcome.error,
        });

      const r = outcome.result;
      const lines = [
        `ralph loop "${r.name}" ended: ${r.reason} after ${r.completedIterations} iteration(s).`,
        r.stopSummary ? `Stop check: ${r.stopSummary}` : undefined,
        r.detail ? `Detail: ${r.detail}` : undefined,
      ].filter(Boolean);
      return textResult(lines.join("\n"), r);
    },
  });

  pi.registerTool({
    name: "ralph_stop",
    label: "Ralph Stop",
    description:
      "Request the currently running ralph loop to stop after the current iteration. No-op if none is running.",
    parameters: Type.Object({}),
    execute: async () => {
      if (!activeLoop) return textResult("No ralph loop is running.");
      const name = activeLoop.name;
      activeLoop.cancel();
      return textResult(
        `Requested stop of ralph loop "${name}". It will end after the current iteration.`,
      );
    },
  });

  pi.registerTool({
    name: "ralph_status",
    label: "Ralph Status",
    description:
      "Report whether a ralph loop is running and list available .pi/ralph configs.",
    parameters: Type.Object({}),
    execute: async (_id, _params, _signal, _onUpdate, ctx) => {
      return textResult(statusText(ctx), {
        active: activeLoop
          ? { name: activeLoop.name, stopping: activeLoop.cancelled }
          : null,
        configs: listConfigNames(ctx.cwd),
      });
    },
  });

  function statusText(ctx: ExtensionContext): string {
    const lines: string[] = [];
    lines.push(
      activeLoop
        ? `Active loop: ${activeLoop.name}${activeLoop.cancelled ? " (stopping)" : ""}`
        : "No active ralph loop.",
    );
    const names = listConfigNames(ctx.cwd);
    lines.push(
      names.length > 0
        ? `Available configs: ${names.map((n) => `@${n}`).join(", ")}`
        : "No ralph configs found (.pi/ralph/*.md or ~/.pi/agent/ralph/*.md).",
    );
    return lines.join("\n");
  }
}
