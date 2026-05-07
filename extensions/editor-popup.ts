/**
 * External Editor Extension
 *
 * Opens the current pi editor buffer in the user's preferred external editor
 * ($VISUAL → $EDITOR → vim) in a floating kitty window via Hyprland.
 *
 * Keybinding: Ctrl+Shift+Z
 *
 * Usage:
 *   Set $VISUAL or $EDITOR to your preferred editor.
 *   For editors that need a flag (e.g. VS Code): VISUAL="code --wait"
 *   Requires Hyprland and kitty.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export default function (pi: ExtensionAPI) {
  pi.registerShortcut("ctrl+shift+z", {
    description: "Edit current buffer in external editor ($VISUAL/$EDITOR)",
    handler: async (ctx) => {
      if (!ctx.hasUI) return;

      const editor = process.env.VISUAL || process.env.EDITOR || "vim";
      const shell = process.env.SHELL || "/bin/sh";
      const currentText = ctx.ui.getEditorText();

      const tempDir = mkdtempSync(join(tmpdir(), "pi-edit-"));
      const tmpFile = join(tempDir, "buffer.md");
      writeFileSync(tmpFile, currentText);

      const command = `${editor} ${shellQuote(tmpFile)}`;

      try {
        const appId = `pi-edit-${process.pid}-${Date.now()}`;
        const ruleMatch = `match:class ^(${appId})$`;

        const ruleResult = spawnSync(
          "hyprctl",
          [
            "--batch",
            `keyword windowrule ${ruleMatch}, float true ; ` +
              `keyword windowrule ${ruleMatch}, size 50% 50% ; ` +
              `keyword windowrule ${ruleMatch}, center 1`,
          ],
          { stdio: "pipe" },
        );
        if (ruleResult.error) throw ruleResult.error;

        const termResult = spawnSync(
          "kitty",
          ["--class", appId, shell, "-c", command],
          { stdio: "ignore" },
        );
        if (termResult.error) throw termResult.error;

        const result = { status: termResult.status, signal: termResult.signal };

        if (result.status !== 0 || result.signal != null) {
          const detail = result.signal
            ? `signal ${result.signal}`
            : `code ${result.status ?? "unknown"}`;
          ctx.ui.notify(`External editor exited with ${detail}`, "warning");
        }

        const modifiedText = readFileSync(tmpFile, "utf8");
        if (modifiedText !== currentText) {
          ctx.ui.setEditorText(modifiedText);
        }
      } catch (err) {
        ctx.ui.notify(
          `External editor failed: ${err instanceof Error ? err.message : String(err)}`,
          "error",
        );
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    },
  });
}
