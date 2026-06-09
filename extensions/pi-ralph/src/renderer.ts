/**
 * Transcript renderers for ralph loop events. Owned entirely by this extension
 * (no dependency on pi-prompt-template-model's renderers).
 */

import type {
  MessageRenderOptions,
  Theme,
} from "@mariozechner/pi-coding-agent";
import { Box, Container, Spacer, Text } from "@mariozechner/pi-tui";

export const RALPH_EVENT_TYPE = "ralph-event";

export type RalphEndReason =
  | "done"
  | "no-progress"
  | "cap-reached"
  | "interrupted"
  | "error";

export interface RalphLoopStartDetails {
  kind: "loop-start";
  name: string;
  stopLabel: string;
  maxIterations: number;
  agent: string;
  model?: string;
  thinking?: string;
  skills?: string[];
}

export interface RalphIterationDetails {
  kind: "iteration";
  name: string;
  iteration: number;
  maxIterations: number;
  stopSummary?: string;
  isError: boolean;
  interrupted: boolean;
  exitCode?: number;
  toolCount?: number;
  tokens?: number;
  model?: string;
  text?: string;
}

export interface RalphLoopEndDetails {
  kind: "loop-end";
  name: string;
  reason: RalphEndReason;
  completedIterations: number;
  stopSummary?: string;
  detail?: string;
}

export type RalphEventDetails =
  | RalphLoopStartDetails
  | RalphIterationDetails
  | RalphLoopEndDetails;

const PREVIEW_LINES = 6;

/**
 * Brand label "ralph", with the config name appended only when it differs from
 * the brand (so the default config named "ralph" doesn't render "ralph ralph").
 */
function brand(theme: Theme, name: string): string {
  const base = theme.fg("toolTitle", theme.bold("ralph"));
  return name === "ralph" ? base : `${base} ${theme.fg("accent", name)}`;
}

function formatTokens(tokens?: number): string | undefined {
  if (tokens === undefined) return undefined;
  if (tokens < 1000) return `${tokens} tok`;
  return `${(tokens / 1000).toFixed(1)}k tok`;
}

function renderLoopStart(
  details: RalphLoopStartDetails,
  theme: Theme,
): Container {
  const box = new Box(1, 1, (t: string) => theme.bg("toolPendingBg", t));
  box.addChild(new Text(`${brand(theme, details.name)} | started`, 0, 0));
  box.addChild(new Spacer(1));
  box.addChild(new Text(theme.fg("dim", `stop: ${details.stopLabel}`), 0, 0));
  box.addChild(
    new Text(theme.fg("dim", `max iterations: ${details.maxIterations}`), 0, 0),
  );
  const worker: string[] = [details.agent];
  if (details.model) worker.push(details.model);
  if (details.thinking) worker.push(`thinking ${details.thinking}`);
  if (details.skills && details.skills.length > 0)
    worker.push(`skills: ${details.skills.join(", ")}`);
  if (worker.length > 0)
    box.addChild(
      new Text(theme.fg("dim", `worker: ${worker.join(" · ")}`), 0, 0),
    );
  const container = new Container();
  container.addChild(new Spacer(1));
  container.addChild(box);
  return container;
}

function renderIteration(
  details: RalphIterationDetails,
  options: MessageRenderOptions,
  theme: Theme,
): Container {
  const failed = details.isError || details.interrupted;
  const box = new Box(1, 1, (t: string) =>
    theme.bg(failed ? "toolPendingBg" : "toolSuccessBg", t),
  );
  const icon = theme.fg(failed ? "error" : "success", failed ? "fail" : "ok");
  const label = `iter ${details.iteration}/${details.maxIterations}`;

  const meta: string[] = [];
  if (details.interrupted) meta.push("interrupted");
  else if (details.exitCode !== undefined)
    meta.push(`exit ${details.exitCode}`);
  if (details.toolCount !== undefined) meta.push(`${details.toolCount} tools`);
  const tok = formatTokens(details.tokens);
  if (tok) meta.push(tok);
  if (details.model) meta.push(details.model);

  box.addChild(
    new Text(
      `${icon} ${brand(theme, details.name)} | ${label}${meta.length > 0 ? ` · ${meta.join(" · ")}` : ""}`,
      0,
      0,
    ),
  );
  if (details.stopSummary) {
    box.addChild(
      new Text(theme.fg("dim", `remaining: ${details.stopSummary}`), 0, 0),
    );
  }
  if (details.text) {
    box.addChild(new Spacer(1));
    const lines = details.text.split("\n");
    if (options.expanded || lines.length <= PREVIEW_LINES) {
      box.addChild(new Text(theme.fg("toolOutput", details.text), 0, 0));
    } else {
      box.addChild(
        new Text(
          theme.fg("toolOutput", lines.slice(0, PREVIEW_LINES).join("\n")),
          0,
          0,
        ),
      );
      box.addChild(
        new Text(
          theme.fg(
            "warning",
            `... (${lines.length - PREVIEW_LINES} more lines — Ctrl+O to expand)`,
          ),
          0,
          0,
        ),
      );
    }
  }
  const container = new Container();
  container.addChild(new Spacer(1));
  container.addChild(box);
  return container;
}

const END_LABELS: Record<
  RalphEndReason,
  { label: string; tone: "success" | "warning" | "error" }
> = {
  done: { label: "done", tone: "success" },
  "no-progress": { label: "stopped (no progress)", tone: "warning" },
  "cap-reached": { label: "stopped (max iterations)", tone: "warning" },
  interrupted: { label: "interrupted", tone: "warning" },
  error: { label: "error", tone: "error" },
};

function renderLoopEnd(details: RalphLoopEndDetails, theme: Theme): Container {
  const info = END_LABELS[details.reason];
  const ok = details.reason === "done";
  const box = new Box(1, 1, (t: string) =>
    theme.bg(ok ? "toolSuccessBg" : "toolPendingBg", t),
  );
  const icon = theme.fg(
    info.tone === "error" ? "error" : ok ? "success" : "warning",
    ok ? "ok" : "fail",
  );
  box.addChild(
    new Text(
      `${icon} ${brand(theme, details.name)} | ${info.label} after ${details.completedIterations} iteration(s)`,
      0,
      0,
    ),
  );
  if (details.stopSummary)
    box.addChild(
      new Text(theme.fg("dim", `remaining: ${details.stopSummary}`), 0, 0),
    );
  if (details.detail)
    box.addChild(new Text(theme.fg(info.tone, details.detail), 0, 0));
  const container = new Container();
  container.addChild(new Spacer(1));
  container.addChild(box);
  return container;
}

export function renderRalphEvent(
  message: { details?: RalphEventDetails },
  options: MessageRenderOptions,
  theme: Theme,
) {
  const details = message.details;
  if (!details) {
    const container = new Container();
    container.addChild(
      new Text(theme.fg("warning", "ralph event missing details"), 0, 0),
    );
    return container;
  }
  switch (details.kind) {
    case "loop-start":
      return renderLoopStart(details, theme);
    case "iteration":
      return renderIteration(details, options, theme);
    case "loop-end":
      return renderLoopEnd(details, theme);
  }
}
