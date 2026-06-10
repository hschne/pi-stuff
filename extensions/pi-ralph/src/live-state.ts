/**
 * Live, in-memory state for the currently-running ralph iteration.
 *
 * The transcript shows a "ralph-progress" message the moment an iteration
 * starts. That message's renderer re-reads this store on every render frame
 * (see renderer.ts), so the box updates in place as the worker subagent streams
 * tool calls and assistant output — mirroring the pattern pi-subagents uses for
 * its own slash runs (`slash-live-state.ts`).
 *
 * The store is keyed by a per-iteration id. When the iteration finishes we mark
 * the entry `done` so the progress box collapses (renders nothing) and the
 * persisted "ralph-event" iteration box takes over. After a session reload the
 * store is empty, so progress boxes collapse and only the final boxes remain.
 */

export interface IterationLiveState {
  id: string;
  name: string;
  iteration: number;
  maxIterations: number;
  status: "running" | "done";
  stopSummary?: string;
  currentTool?: string;
  currentToolArgs?: string;
  toolCount?: number;
  tokens?: number;
  /** Most recent non-empty lines of worker output (assistant text + tool results). */
  recentOutput: string[];
  version: number;
}

const store = new Map<string, IterationLiveState>();
let versionCounter = 1;

export function beginIteration(init: {
  id: string;
  name: string;
  iteration: number;
  maxIterations: number;
  stopSummary?: string;
}): void {
  store.set(init.id, {
    ...init,
    status: "running",
    recentOutput: [],
    version: versionCounter++,
  });
}

export function updateIteration(
  id: string,
  patch: {
    currentTool?: string;
    currentToolArgs?: string;
    toolCount?: number;
    tokens?: number;
    recentOutput?: string[];
  },
): void {
  const prev = store.get(id);
  if (!prev || prev.status !== "running") return;
  store.set(id, {
    ...prev,
    currentTool: patch.currentTool ?? prev.currentTool,
    currentToolArgs: patch.currentToolArgs ?? prev.currentToolArgs,
    toolCount: patch.toolCount ?? prev.toolCount,
    tokens: patch.tokens ?? prev.tokens,
    recentOutput: patch.recentOutput ?? prev.recentOutput,
    version: versionCounter++,
  });
}

export function finishIteration(id: string): void {
  const prev = store.get(id);
  if (!prev) return;
  store.set(id, { ...prev, status: "done", version: versionCounter++ });
}

export function getIterationState(id: string): IterationLiveState | undefined {
  return store.get(id);
}
