/**
 * Deterministic stop-condition evaluation.
 *
 * Runs the configured `stop` command in the project cwd. Semantics:
 *   - exit 0   → DONE: the loop's work is complete, stop.
 *   - exit !=0 → work remains, run another iteration.
 *
 * stdout is captured as a "progress fingerprint". If a config emits non-empty
 * stdout (e.g. "3 issue(s) remaining") and that fingerprint is byte-identical
 * for N consecutive iterations, the loop is making no measurable progress and
 * the no-progress guard aborts it. Bare exit-code-only scripts (no stdout) skip
 * the guard and rely on maxIterations.
 *
 * A stop command that cannot run at all (e.g. exit 126/127, missing script)
 * aborts the loop loudly rather than being treated as "keep going".
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type RalphConfig, resolveScriptPath } from "./config.js";

export interface StopCheckResult {
  /** True when exit code is 0 → loop is done. */
  done: boolean;
  exitCode: number;
  /** Trimmed stdout, used as the progress fingerprint and status summary. */
  fingerprint: string;
  /** True when the check could not be executed/trusted; loop should abort. */
  failed: boolean;
  failureReason?: string;
}

const UNRUNNABLE_EXIT_CODES = new Set([126, 127]);

export async function runStopCheck(
  pi: ExtensionAPI,
  config: RalphConfig,
  cwd: string,
  signal?: AbortSignal,
): Promise<StopCheckResult> {
  let command: string;
  let args: string[];

  if (config.stop.script) {
    const scriptPath = resolveScriptPath(config, cwd);
    if (!scriptPath) {
      return {
        done: false,
        exitCode: -1,
        fingerprint: "",
        failed: true,
        failureReason: `stop script not found: ${config.stop.script}`,
      };
    }
    command = "bash";
    args = [scriptPath];
  } else {
    command = "bash";
    args = ["-lc", config.stop.run as string];
  }

  let result: { stdout: string; stderr: string; code: number; killed: boolean };
  try {
    result = await pi.exec(command, args, { cwd, signal, timeout: 60000 });
  } catch (error) {
    return {
      done: false,
      exitCode: -1,
      fingerprint: "",
      failed: true,
      failureReason: `stop check failed to execute: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const fingerprint = result.stdout.trim();

  if (UNRUNNABLE_EXIT_CODES.has(result.code)) {
    return {
      done: false,
      exitCode: result.code,
      fingerprint,
      failed: true,
      failureReason: `stop check could not run (exit ${result.code})${result.stderr.trim() ? `: ${result.stderr.trim()}` : ""}`,
    };
  }

  return {
    done: result.code === 0,
    exitCode: result.code,
    fingerprint,
    failed: false,
  };
}
