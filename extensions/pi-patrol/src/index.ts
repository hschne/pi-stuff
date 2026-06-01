/**
 * pi-patrol Extension
 *
 * Automatically runs project checks after each agent turn (agent_end).
 * When checks fail and retry is enabled, the agent gets one automatic repair
 * attempt. If it still fails, a short notice is shown and the user takes over.
 * When checks pass, patrol stays silent.
 *
 * Configuration (first found wins, no merging):
 *   Project:  <cwd>/.pi/patrol.json
 *   Global:   ~/.pi/agent/patrol.json
 *
 * Schema:
 *   {
 *     "commands": ["mise run check"],  // required
 *     "retry": true,                   // default: false
 *     "timeout": 15000                 // default: 15000 ms
 *   }
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_TIMEOUT = 15000;

interface PatrolConfig {
  commands: string[];
  retry: boolean;
  timeout: number;
}

/**
 * Load patrol config from project or global location.
 * Returns null when no config file is found (patrol disabled).
 * Returns "invalid" when a config file exists but is malformed.
 */
function loadConfig(cwd: string): PatrolConfig | null | "invalid" {
  const projectPath = join(cwd, ".pi", "patrol.json");
  const globalPath = join(homedir(), ".pi", "agent", "patrol.json");

  const configPath = existsSync(projectPath)
    ? projectPath
    : existsSync(globalPath)
      ? globalPath
      : null;

  if (!configPath) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return "invalid";
  }

  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as Record<string, unknown>).commands)
  ) {
    return "invalid";
  }

  const raw = parsed as Record<string, unknown>;

  return {
    commands: raw.commands as string[],
    retry: typeof raw.retry === "boolean" ? raw.retry : false,
    timeout: typeof raw.timeout === "number" ? raw.timeout : DEFAULT_TIMEOUT,
  };
}

function formatFailures(
  failures: { command: string; code: number; output: string }[],
): string {
  return failures
    .map(
      ({ command, code, output }) =>
        `pi-patrol: \`${command}\` failed (exit ${code}). Fix the errors below, then continue.\n\n${output}`,
    )
    .join("\n\n---\n\n");
}

export default function patrolExtension(pi: ExtensionAPI) {
  let cwd = process.cwd();
  let stopHookActive = false;

  pi.on("session_start", (_event, ctx) => {
    cwd = ctx.cwd;
  });

  pi.on("agent_start", () => {
    stopHookActive = false;
  });

  pi.on("agent_end", async (_event, ctx) => {
    const config = loadConfig(cwd);

    if (config === null) return;

    if (config === "invalid") {
      ctx.ui.notify(
        "pi-patrol: invalid config — check .pi/patrol.json or ~/.pi/agent/patrol.json",
        "warning",
      );
      return;
    }

    const failures: { command: string; code: number; output: string }[] = [];

    for (const command of config.commands) {
      const result = await pi.exec("sh", ["-c", command], {
        timeout: config.timeout,
        cwd,
      });
      if (result.code !== 0) {
        const output = [result.stdout, result.stderr]
          .map((s) => s.trim())
          .filter(Boolean)
          .join("\n");
        failures.push({ command, code: result.code, output });
      }
    }

    if (failures.length === 0) return;

    if (config.retry && !stopHookActive) {
      stopHookActive = true;
      pi.sendMessage(
        {
          customType: "pi-patrol",
          content: formatFailures(failures),
          display: true,
        },
        { deliverAs: "followUp", triggerTurn: true },
      );
    } else {
      const content = stopHookActive
        ? "pi-patrol: checks still failing. Giving up."
        : formatFailures(failures);
      pi.sendMessage(
        { customType: "pi-patrol", content, display: true },
        { deliverAs: "followUp", triggerTurn: false },
      );
    }
  });
}
