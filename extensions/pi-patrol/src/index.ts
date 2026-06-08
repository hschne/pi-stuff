/**
 * pi-patrol Extension
 *
 * Automatically runs project checks after each agent turn (agent_end) — but
 * only when the agent actually modified files during the turn. File changes are
 * detected via successful `edit`/`write` tool calls, so question-answering or
 * read-only turns skip the checks entirely (no wasted command runs).
 *
 * When checks fail and retry is enabled, the agent gets one automatic repair
 * attempt. If it still fails, a structured failure report is shown.
 * When checks pass, a brief success line is shown.
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
import { keyHint } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_TIMEOUT = 15000;
const COLLAPSED_LINES = 6;
const CUSTOM_TYPE = "pi-patrol";

interface PatrolConfig {
  commands: string[];
  retry: boolean;
  timeout: number;
}

interface CheckFailure {
  command: string;
  code: number;
  output: string;
}

interface PatrolPayload {
  total: number;
  failed: number;
  failures: CheckFailure[];
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

  if (parsed === null || typeof parsed !== "object") return "invalid";

  const raw = parsed as Record<string, unknown>;
  if (!Array.isArray(raw.commands)) return "invalid";

  return {
    commands: raw.commands as string[],
    retry: typeof raw.retry === "boolean" ? raw.retry : false,
    timeout: typeof raw.timeout === "number" ? raw.timeout : DEFAULT_TIMEOUT,
  };
}

function formatPayloadForAgent(payload: PatrolPayload): string {
  return payload.failures
    .map(
      ({ command, code, output }) =>
        `pi-patrol: \`${command}\` failed (exit ${code}). Fix the errors below, then continue.\n\n${output}`,
    )
    .join("\n\n---\n\n");
}

async function runChecks(
  pi: ExtensionAPI,
  config: PatrolConfig,
  cwd: string,
): Promise<CheckFailure[]> {
  const failures: CheckFailure[] = [];

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

  return failures;
}

// Tools whose successful execution means the agent changed files on disk.
const MUTATING_TOOLS = new Set(["edit", "write"]);

export default function patrolExtension(pi: ExtensionAPI) {
  let cwd = process.cwd();
  let retryAttempted = false;
  let filesChanged = false;

  // ── Custom message renderer (retry path only) ─────────────────────────────
  // Only retry uses sendMessage (agent must see errors). Success/gave-up/no-retry
  // use ctx.ui.notify which is agent-invisible.
  //
  // Note: sendMessage always enters the LLM conversation. The context event
  // could filter it, but triggerTurn:false still triggers extra turns in
  // practice, so ctx.ui.notify is the only truly silent display mechanism.

  pi.registerMessageRenderer(CUSTOM_TYPE, (message, options, theme) => {
    let payload: PatrolPayload;
    try {
      const raw = message.details ?? message.content;
      payload =
        typeof raw === "string" ? JSON.parse(raw) : (raw as PatrolPayload);
    } catch {
      return new Text(String(message.content), 1, 0);
    }

    const { total, failed, failures } = payload;

    const header = theme.fg(
      "warning",
      `✗ pi-patrol: ${failed}/${total} checks failed — retrying`,
    );

    const commandLines = failures.map((f) =>
      theme.fg("warning", `  ✗ ${f.command} (exit ${f.code})`),
    );

    const detailLines = failures.flatMap((f) =>
      f.output
        ? f.output.split("\n").map((line) => theme.fg("dim", `    ${line}`))
        : [],
    );

    const allLines = [header, ...commandLines, ...detailLines];

    if (!options.expanded && allLines.length > COLLAPSED_LINES) {
      const visible = allLines.slice(0, COLLAPSED_LINES);
      const remaining = allLines.length - COLLAPSED_LINES;
      visible.push(
        theme.fg(
          "muted",
          `  … ${remaining} more lines (${keyHint("app.tools.expand", "to expand")})`,
        ),
      );
      return new Text(visible.join("\n"), 1, 0);
    }

    return new Text(allLines.join("\n"), 1, 0);
  });

  // ── Event handlers ────────────────────────────────────────────────────────

  pi.on("session_start", (_event, ctx) => {
    cwd = ctx.cwd;
  });

  pi.on("input", () => {
    retryAttempted = false;
    filesChanged = false;
  });

  // Track file mutations during the turn. The retry path delivers via
  // sendMessage (not "input"), so this flag survives into the repair turn.
  pi.on("tool_result", (event) => {
    if (MUTATING_TOOLS.has(event.toolName) && !event.isError) {
      filesChanged = true;
    }
  });

  pi.on("agent_end", async (_event, ctx) => {
    // Nothing was edited this turn — skip checks to avoid wasteful runs.
    if (!filesChanged) return;

    const config = loadConfig(cwd);

    if (config === null) return;
    if (config === "invalid") {
      ctx.ui.notify(
        "pi-patrol: invalid config — check .pi/patrol.json or ~/.pi/agent/patrol.json",
        "warning",
      );
      return;
    }

    const failures = await runChecks(pi, config, cwd);
    const total = config.commands.length;

    // ── Success ───────────────────────────────────────────────────────────
    if (failures.length === 0) {
      ctx.ui.notify(`✓ pi-patrol: ${total}/${total} checks passed`, "info");
      return;
    }

    // ── Retry: trigger a new agent turn ───────────────────────────────────
    if (config.retry && !retryAttempted) {
      retryAttempted = true;
      const payload: PatrolPayload = {
        total,
        failed: failures.length,
        failures,
      };
      pi.sendMessage(
        {
          customType: CUSTOM_TYPE,
          content: formatPayloadForAgent(payload),
          details: JSON.stringify(payload),
          display: true,
        },
        { deliverAs: "followUp", triggerTurn: true },
      );
      return;
    }

    // ── Gave up or no retry: agent-invisible notification ─────────────────
    const label = retryAttempted
      ? "checks still failing — giving up"
      : "checks failed";
    ctx.ui.notify(`✗ pi-patrol: ${failures.length}/${total} ${label}`, "error");
  });
}
