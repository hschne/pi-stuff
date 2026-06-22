/**
 * The ralph loop: re-run a fresh-context worker until a deterministic stop
 * condition is satisfied.
 *
 * Each pass:
 *   1. Run the stop check. exit 0 → done, stop the loop.
 *   2. No-progress guard: if the stop check emitted non-empty stdout and that
 *      fingerprint is byte-identical for `noProgressLimit` consecutive passes,
 *      abort (the worker is spinning without reducing the work).
 *   3. Run one worker iteration via the subagent bridge.
 *   4. Repeat until done / no-progress / maxIterations / interrupt.
 */

import { randomUUID } from "node:crypto";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { SlashAgentProgress } from "./bridge-protocol.js";
import type { RalphConfig } from "./config.js";
import {
  buildIterationParams,
  encodeModel,
  runIteration,
} from "./delegation.js";
import {
  beginIteration,
  finishIteration,
  updateIteration,
} from "./live-state.js";
import {
  RALPH_EVENT_TYPE,
  RALPH_PROGRESS_TYPE,
  type RalphEndReason,
  type RalphEventDetails,
} from "./renderer.js";
import { runStopCheck } from "./stop-check.js";

export interface LoopOverrides {
  model?: string;
  thinking?: string;
  maxIterations?: number;
}

export interface LoopHandle {
  name: string;
  cancel(): void;
  readonly cancelled: boolean;
}

export interface LoopResult {
  name: string;
  reason: RalphEndReason;
  completedIterations: number;
  stopSummary?: string;
  detail?: string;
}

function formatStopLabel(config: RalphConfig): string {
  if (config.stop.script) return config.stop.script;
  const run = config.stop.run ?? "";
  return run.length > 60 ? `${run.slice(0, 57)}...` : run;
}

export async function runRalphLoop(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  config: RalphConfig,
  overrides: LoopOverrides,
  registerHandle: (handle: LoopHandle) => void,
): Promise<LoopResult> {
  const model = overrides.model ?? config.model;
  const thinking = overrides.thinking ?? config.thinking;
  const maxIterations = overrides.maxIterations ?? config.maxIterations;
  const encodedModel = encodeModel(model, thinking);

  const controller = new AbortController();
  let cancelled = false;
  const handle: LoopHandle = {
    name: config.name,
    cancel() {
      if (cancelled) return;
      cancelled = true;
      controller.abort();
    },
    get cancelled() {
      return cancelled;
    },
  };
  registerHandle(handle);

  // Brand label for plain-text content lines (CLI/print mode); avoids "ralph ralph".
  const label = config.name === "ralph" ? "ralph" : `ralph ${config.name}`;

  const emit = (details: RalphEventDetails, content: string) => {
    pi.sendMessage({
      customType: RALPH_EVENT_TYPE,
      content,
      display: true,
      details,
    });
  };

  const setStatus = (iteration: number, summary?: string, worker?: string) => {
    if (!ctx.hasUI) return;
    const parts = [config.name, `iter ${iteration}/${maxIterations}`];
    if (summary) parts.push(summary);
    if (worker) parts.push(worker);
    ctx.ui.setStatus(
      "ralph-loop",
      ctx.ui.theme.fg("warning", parts.join(" · ")),
    );
  };
  const clearStatus = () =>
    ctx.hasUI && ctx.ui.setStatus("ralph-loop", undefined);

  emit(
    {
      kind: "loop-start",
      name: config.name,
      stopLabel: formatStopLabel(config),
      maxIterations,
      agent: config.agent,
      model,
      thinking,
      skills: config.skills,
    },
    `[${label} started]`,
  );

  let completed = 0;
  let lastFingerprint: string | undefined;
  let repeatCount = 0;
  let endReason: RalphEndReason = "cap-reached";
  let endDetail: string | undefined;
  let lastSummary: string | undefined;

  try {
    for (let i = 0; i < maxIterations; i++) {
      if (cancelled) {
        endReason = "interrupted";
        break;
      }

      setStatus(i + 1, lastSummary, "stop-check");
      const stop = await runStopCheck(pi, config, ctx.cwd, controller.signal);
      lastSummary = stop.fingerprint || undefined;

      if (stop.failed) {
        endReason = "error";
        endDetail = stop.failureReason;
        break;
      }
      if (stop.done) {
        endReason = "done";
        break;
      }

      // No-progress guard (only when the stop check emits a fingerprint).
      if (stop.fingerprint) {
        if (stop.fingerprint === lastFingerprint) {
          repeatCount += 1;
        } else {
          repeatCount = 0;
          lastFingerprint = stop.fingerprint;
        }
        if (repeatCount + 1 >= config.noProgressLimit) {
          endReason = "no-progress";
          endDetail = `stop-check output unchanged for ${config.noProgressLimit} consecutive passes`;
          break;
        }
      }

      setStatus(i + 1, lastSummary, "worker");
      const params = buildIterationParams({
        agent: config.agent,
        task: config.body,
        model: encodedModel,
        skills: config.skills,
        cwd: ctx.cwd,
      });

      // Live in-progress box: emitted now (not after completion) so the user
      // sees that this iteration is running and what the worker is doing.
      const progressId = randomUUID();
      beginIteration({
        id: progressId,
        name: config.name,
        iteration: i + 1,
        maxIterations,
        stopSummary: lastSummary,
      });
      pi.sendMessage({
        customType: RALPH_PROGRESS_TYPE,
        content: `[${label} iter ${i + 1}/${maxIterations} running]`,
        display: true,
        details: { id: progressId },
      });

      const outcome = await runIteration(
        pi,
        params,
        controller.signal,
        (update) => {
          const progress: SlashAgentProgress | undefined = update.progress?.[0];
          const tool = update.currentTool ?? progress?.currentTool;
          const tools = update.toolCount ?? progress?.toolCount;
          updateIteration(progressId, {
            currentTool: tool,
            currentToolArgs: progress?.currentToolArgs,
            toolCount: tools,
            tokens: progress?.tokens,
            recentOutput: progress?.recentOutput,
          });
          const workerLabel = [
            tool ? `→ ${tool}` : undefined,
            tools ? `${tools} tools` : undefined,
          ]
            .filter(Boolean)
            .join(" ");
          setStatus(i + 1, lastSummary, workerLabel || "worker");
        },
      );

      // Collapse the live box; the persisted iteration box below takes over.
      finishIteration(progressId);
      completed += 1;

      emit(
        {
          kind: "iteration",
          name: config.name,
          iteration: i + 1,
          maxIterations,
          stopSummary: lastSummary,
          isError: outcome.isError,
          interrupted: outcome.interrupted,
          exitCode: outcome.exitCode,
          toolCount: outcome.toolCount,
          tokens: outcome.tokens,
          model: outcome.model,
          text: outcome.text || outcome.errorText,
        },
        `[${label} iter ${i + 1}/${maxIterations}]`,
      );

      if (outcome.interrupted || cancelled) {
        endReason = "interrupted";
        break;
      }
      if (outcome.isError) {
        endReason = "error";
        endDetail =
          outcome.errorText ?? `worker exited with code ${outcome.exitCode}`;
        break;
      }
    }

    // A clean run that exhausted the cap without ever satisfying stop.
    if (endReason === "cap-reached" && completed >= maxIterations) {
      // Re-check once so the final transcript reflects true done-ness.
      const finalStop = await runStopCheck(
        pi,
        config,
        ctx.cwd,
        controller.signal,
      );
      if (!finalStop.failed) {
        lastSummary = finalStop.fingerprint || lastSummary;
        if (finalStop.done) endReason = "done";
      }
    }
  } finally {
    clearStatus();
  }

  emit(
    {
      kind: "loop-end",
      name: config.name,
      reason: endReason,
      completedIterations: completed,
      stopSummary: lastSummary,
      detail: endDetail,
    },
    `[${label} ${endReason} after ${completed} iteration(s)]`,
  );

  return {
    name: config.name,
    reason: endReason,
    completedIterations: completed,
    stopSummary: lastSummary,
    detail: endDetail,
  };
}
