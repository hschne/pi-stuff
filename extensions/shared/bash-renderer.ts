import type { AgentToolResult, Theme } from "@earendil-works/pi-coding-agent";
import { highlightCode, keyHint } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

const COLLAPSED_MAX_LINES = 15;

function bashPill(theme: Theme): string {
  return theme.bold(theme.inverse(theme.fg("error", " bash  ")));
}

function getText(result: AgentToolResult<unknown>): string | undefined {
  const content = result.content.find((item) => item.type === "text");
  return content?.type === "text" ? content.text : undefined;
}

export function renderBashCall(args: { command?: string }, theme: Theme): Text {
  const command = args.command ?? "";
  const highlighted = highlightCode(command, "bash").join("\n");
  const separator = command.includes("\n") || command.length > 80 ? "\n" : " ";
  return new Text(`${bashPill(theme)}${separator}${highlighted}`, 0, 0);
}

export function renderBashResult(
  result: AgentToolResult<unknown>,
  expanded: boolean,
  theme: Theme,
): Text {
  const text = getText(result);
  if (!text?.trim()) return new Text("", 0, 0);

  const lines = text.split("\n");
  if (expanded || lines.length <= COLLAPSED_MAX_LINES) {
    const output = lines.map((line) => theme.fg("toolOutput", line)).join("\n");
    return new Text(`\n${output}`, 0, 0);
  }

  const hidden = lines.length - COLLAPSED_MAX_LINES;
  const hint = theme.fg(
    "dim",
    `… ${hidden} more lines (${keyHint("app.tools.expand", "to expand")})`,
  );
  const output = lines
    .slice(-COLLAPSED_MAX_LINES)
    .map((line) => theme.fg("toolOutput", line))
    .join("\n");
  return new Text(`\n${hint}\n${output}`, 0, 0);
}
