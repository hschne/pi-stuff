/**
 * Wire protocol for the pi-subagents slash delegation bridge.
 *
 * These event names and payload shapes are owned by pi-subagents
 * (`src/slash/slash-bridge.ts` + `src/shared/types.ts`). We deliberately
 * redefine the string constants locally instead of importing them so that an
 * internal refactor of pi-subagents file layout cannot break our import paths.
 * Only an actual rename of the wire protocol would, which is the same risk as
 * any cross-package API dependency.
 *
 * pi-subagents registers a listener for `subagent:slash:request` and executes
 * the delegated run, emitting `subagent:slash:response` when done. This is the
 * same channel that powers `/run`, `/chain`, etc.
 */

export const SLASH_SUBAGENT_REQUEST_EVENT = "subagent:slash:request";
export const SLASH_SUBAGENT_STARTED_EVENT = "subagent:slash:started";
export const SLASH_SUBAGENT_RESPONSE_EVENT = "subagent:slash:response";
export const SLASH_SUBAGENT_UPDATE_EVENT = "subagent:slash:update";
export const SLASH_SUBAGENT_CANCEL_EVENT = "subagent:slash:cancel";

/** Subset of pi-subagents `SubagentParamsLike` that we populate. */
export interface SlashSubagentParams {
  agent: string;
  task: string;
  model?: string;
  skill?: string | string[];
  context?: "fresh" | "fork";
  cwd?: string;
  async?: boolean;
}

export interface SlashSubagentRequest {
  requestId: string;
  params: SlashSubagentParams;
}

/** Per-agent progress entry (subset of pi-subagents `AgentProgress`). */
export interface SlashAgentProgress {
  index?: number;
  agent?: string;
  status?: "pending" | "running" | "completed" | "failed" | "detached";
  currentTool?: string;
  currentToolArgs?: string;
  recentOutput?: string[];
  toolCount?: number;
  tokens?: number;
  durationMs?: number;
  error?: string;
}

/** Per-run result entry (subset of pi-subagents `SingleResult`). */
export interface SlashSingleResult {
  agent: string;
  task: string;
  exitCode: number;
  interrupted?: boolean;
  error?: string;
  finalOutput?: string;
  model?: string;
  toolCount?: number;
  tokens?: number;
  usage?: { input?: number; output?: number };
  sessionFile?: string;
}

export interface SlashSubagentResponseDetails {
  mode?: string;
  results?: SlashSingleResult[];
  progress?: SlashAgentProgress[];
}

export interface SlashSubagentResponse {
  requestId: string;
  result: {
    content: Array<{ type?: string; text?: string }> | string;
    details?: SlashSubagentResponseDetails;
  };
  isError: boolean;
  errorText?: string;
}

export interface SlashSubagentUpdate {
  requestId: string;
  progress?: SlashAgentProgress[];
  currentTool?: string;
  toolCount?: number;
}
