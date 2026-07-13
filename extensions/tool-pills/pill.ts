/**
 * Shared pill and tool-frame renderers.
 */
import type { Theme } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

/** Map tool name → theme semantic colour role for the pill badge. */
const TOOL_ROLES: Record<string, string> = {
  ls: "success",
  read: "success",
  find: "mdCode",
  grep: "mdCode",
  bash: "bashMode",
  write: "accent",
  create: "accent",
  edit: "accent",
};

/** Render an inverted-colour pill badge: ` name ` */
export function pill(name: string, theme: Theme): string {
  const role = TOOL_ROLES[name] ?? "dim";
  return theme.bold(
    theme.inverse(theme.fg(role as any, ` ${name.padEnd(5)} `)),
  );
}

/** Text component with an optional full-width rule above or below it. */
export class ToolText extends Text {
  private theme: Theme;
  private top: boolean;
  private bottom: boolean;
  private error: boolean;

  constructor(
    text: string,
    theme: Theme,
    { top = false, bottom = false, error = false } = {},
  ) {
    super(text, 1, 0);
    this.theme = theme;
    this.top = top;
    this.bottom = bottom;
    this.error = error;
  }

  setFrame(
    theme: Theme,
    { top = false, bottom = false, error = false } = {},
  ): void {
    this.theme = theme;
    this.top = top;
    this.bottom = bottom;
    this.error = error;
    this.invalidate();
  }

  render(width: number): string[] {
    const lines = super.render(width);
    const rule = this.theme.fg(
      this.error ? "error" : "border",
      "─".repeat(width),
    );
    return [
      ...(this.top ? [rule] : []),
      ...lines,
      ...(this.bottom ? [rule] : []),
    ];
  }
}
