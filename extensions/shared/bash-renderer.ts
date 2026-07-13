import type { AgentToolResult, Theme } from "@earendil-works/pi-coding-agent";
import { highlightCode, keyHint } from "@earendil-works/pi-coding-agent";
import { pill, ToolText } from "../tool-pills/pill.js";

const COLLAPSED_MAX_LINES = 15;

function getText(result: AgentToolResult<unknown>): string | undefined {
  const content = result.content.find((item) => item.type === "text");
  return content?.type === "text" ? content.text : undefined;
}

export function renderBashCall(
  args: { command?: string },
  theme: Theme,
  isError = false,
): ToolText {
  const command = args.command ?? "";
  const highlighted = highlightCode(command, "bash").join("\n");
  const separator = command.includes("\n") || command.length > 80 ? "\n" : " ";
  return new ToolText(
    `${pill("bash", theme)}${separator}${highlighted}`,
    theme,
    { top: true, error: isError },
  );
}

export function renderBashResult(
  result: AgentToolResult<unknown>,
  expanded: boolean,
  theme: Theme,
  isError = false,
): ToolText {
  const text = getText(result);
  if (!text?.trim()) {
    return new ToolText("", theme, { bottom: true, error: isError });
  }

  const lines = text.split("\n");
  if (expanded || lines.length <= COLLAPSED_MAX_LINES) {
    const output = lines.map((line) => theme.fg("toolOutput", line)).join("\n");
    return new ToolText(`\n${output}`, theme, {
      bottom: true,
      error: isError,
    });
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
  return new ToolText(`\n${hint}\n${output}`, theme, {
    bottom: true,
    error: isError,
  });
}
