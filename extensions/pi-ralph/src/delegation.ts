/**
 * Runs a single ralph iteration by delegating to a fresh-context subagent
 * through the pi-subagents slash bridge (`subagent:slash:*` events).
 *
 * Mirrors the request/response handshake pi-subagents' own slash commands use:
 * emit REQUEST, the bridge emits STARTED synchronously, then RESPONSE when the
 * child finishes. Live progress arrives via UPDATE events.
 */

import { randomUUID } from "node:crypto";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  SLASH_SUBAGENT_CANCEL_EVENT,
  SLASH_SUBAGENT_REQUEST_EVENT,
  SLASH_SUBAGENT_RESPONSE_EVENT,
  SLASH_SUBAGENT_STARTED_EVENT,
  SLASH_SUBAGENT_UPDATE_EVENT,
  type SlashSubagentParams,
  type SlashSubagentResponse,
  type SlashSubagentUpdate,
} from "./bridge-protocol.js";

export interface IterationOutcome {
  /** True when the worker run errored or was interrupted. */
  isError: boolean;
  /** Worker exit code when reported (0 = clean). */
  exitCode?: number;
  interrupted: boolean;
  /** Final assistant text / summary from the worker. */
  text: string;
  errorText?: string;
  toolCount?: number;
  tokens?: number;
  model?: string;
}

function extractText(
  content: SlashSubagentResponse["result"]["content"],
): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("\n")
    .trim();
}

export function buildIterationParams(options: {
  agent: string;
  task: string;
  model?: string;
  skills?: string[];
  cwd: string;
}): SlashSubagentParams {
  return {
    agent: options.agent,
    task: options.task,
    ...(options.model ? { model: options.model } : {}),
    ...(options.skills && options.skills.length > 0
      ? { skill: options.skills }
      : {}),
    context: "fresh",
    cwd: options.cwd,
    async: false,
  };
}

/**
 * Encode thinking level as the `model:level` suffix the subagent runtime
 * understands. Returns undefined when no model override is configured (the
 * worker agent's own default model is then used, and thinking cannot be forced).
 */
export function encodeModel(
  model: string | undefined,
  thinking: string | undefined,
): string | undefined {
  if (!model) return undefined;
  if (!thinking) return model;
  // Avoid double-suffixing if the model already carries a :level.
  const colonIdx = model.lastIndexOf(":");
  const slashIdx = model.lastIndexOf("/");
  if (colonIdx > slashIdx && colonIdx !== -1) return model;
  return `${model}:${thinking}`;
}

export async function runIteration(
  pi: ExtensionAPI,
  params: SlashSubagentParams,
  signal: AbortSignal | undefined,
  onUpdate?: (update: SlashSubagentUpdate) => void,
): Promise<IterationOutcome> {
  const requestId = randomUUID();

  return await new Promise<IterationOutcome>((resolve, reject) => {
    let started = false;
    let done = false;

    const finish = (next: () => void) => {
      if (done) return;
      done = true;
      unsubStarted();
      unsubResponse();
      unsubUpdate();
      if (onAbort && signal) signal.removeEventListener("abort", onAbort);
      next();
    };

    const onStarted = (data: unknown) => {
      if ((data as { requestId?: string })?.requestId === requestId)
        started = true;
    };

    const onUpdateEvent = (data: unknown) => {
      const update = data as SlashSubagentUpdate;
      if (update?.requestId !== requestId) return;
      onUpdate?.(update);
    };

    const onResponse = (data: unknown) => {
      const response = data as SlashSubagentResponse;
      if (response?.requestId !== requestId) return;
      const results = response.result?.details?.results ?? [];
      const first = results[0];
      const text =
        extractText(response.result?.content) ||
        first?.finalOutput?.trim() ||
        "";
      finish(() =>
        resolve({
          isError:
            response.isError === true ||
            (first?.exitCode !== undefined && first.exitCode !== 0),
          exitCode: first?.exitCode,
          interrupted: first?.interrupted === true,
          text,
          errorText: response.errorText || first?.error,
          toolCount: first?.toolCount,
          tokens: first?.tokens,
          model: first?.model,
        }),
      );
    };

    const onAbort = () => {
      pi.events.emit(SLASH_SUBAGENT_CANCEL_EVENT, { requestId });
      // Let the bridge emit a RESPONSE with interrupted/cancelled; if it
      // doesn't arrive promptly, resolve as interrupted.
      setTimeout(() => {
        finish(() =>
          resolve({
            isError: true,
            interrupted: true,
            text: "",
            errorText: "Interrupted.",
          }),
        );
      }, 1500);
    };

    const unsubStarted = on(pi, SLASH_SUBAGENT_STARTED_EVENT, onStarted);
    const unsubResponse = on(pi, SLASH_SUBAGENT_RESPONSE_EVENT, onResponse);
    const unsubUpdate = on(pi, SLASH_SUBAGENT_UPDATE_EVENT, onUpdateEvent);

    if (signal) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    }

    pi.events.emit(SLASH_SUBAGENT_REQUEST_EVENT, { requestId, params });

    // The bridge emits STARTED synchronously during the REQUEST emit.
    if (!started && !done) {
      finish(() =>
        reject(
          new Error(
            "No subagent bridge responded. Ensure pi-subagents is installed and loaded (it owns the `subagent:slash:request` channel).",
          ),
        ),
      );
    }
  });
}

function on(
  pi: ExtensionAPI,
  event: string,
  handler: (data: unknown) => void,
): () => void {
  const unsub = pi.events.on(event, handler);
  return typeof unsub === "function" ? unsub : () => undefined;
}
