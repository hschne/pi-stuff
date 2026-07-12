import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ExtensionAPI,
  ExtensionContext,
  SessionMessageEntry,
} from "@earendil-works/pi-coding-agent";

type SessionMessage = SessionMessageEntry["message"];

const COMMENT_INSTRUCTIONS = `<!--
Add inline comments or edits to the agent message below.
Save your changes, then close the editor to send this to the agent.
Close without changes to cancel.
-->

`;

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function edit(content: string, prefix: string): string {
  const editor = process.env.VISUAL || process.env.EDITOR || "vim";
  const shell = process.env.SHELL || "/bin/sh";
  const tempDir = mkdtempSync(join(tmpdir(), `pi-${prefix}-`));
  const file = join(tempDir, `${prefix}.md`);

  try {
    writeFileSync(file, content);

    const result = spawnSync(
      "kitty",
      [shell, "-c", `${editor} ${shellQuote(file)}`],
      { stdio: "ignore" },
    );
    if (result.error) throw result.error;
    if (result.status !== 0 || result.signal != null) {
      const detail = result.signal
        ? `signal ${result.signal}`
        : `code ${result.status ?? "unknown"}`;
      throw new Error(`editor exited with ${detail}`);
    }

    return readFileSync(file, "utf8");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function getAssistantText(message: SessionMessage): string | undefined {
  if (!("role" in message) || message.role !== "assistant") return undefined;

  const text = message.content
    .filter(
      (content): content is { type: "text"; text: string } =>
        content.type === "text",
    )
    .map((content) => content.text)
    .join("\n\n")
    .trim();

  return text || undefined;
}

function getLastAssistantText(ctx: ExtensionContext): string | undefined {
  const branch = ctx.sessionManager.getBranch();

  for (let index = branch.length - 1; index >= 0; index--) {
    const entry = branch[index];
    if (entry.type !== "message") continue;

    const text = getAssistantText(entry.message);
    if (text) return text;
  }

  return undefined;
}

export default function (pi: ExtensionAPI) {
  const editBuffer = async (ctx: ExtensionContext) => {
    if (!ctx.hasUI) return;

    const current = ctx.ui.getEditorText();
    try {
      const updated = edit(current, "edit");
      if (updated !== current) ctx.ui.setEditorText(updated);
    } catch (error) {
      ctx.ui.notify(
        `External editor failed: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    }
  };

  const comment = async (ctx: ExtensionContext) => {
    if (!ctx.hasUI) {
      ctx.ui.notify("/comment requires interactive mode", "error");
      return;
    }

    const assistantText = getLastAssistantText(ctx);
    if (!assistantText) {
      ctx.ui.notify("No assistant message found", "error");
      return;
    }

    try {
      const updated = edit(
        `${COMMENT_INSTRUCTIONS}${assistantText}\n`,
        "comment",
      )
        .replace(COMMENT_INSTRUCTIONS, "")
        .trimEnd();

      if (!updated || updated === assistantText.trimEnd()) {
        ctx.ui.notify("/comment cancelled (no changes)", "info");
        return;
      }

      pi.sendUserMessage(
        `I annotated your last message in my editor. Treat this as feedback on your previous response:\n\n${updated}`,
        ctx.isIdle() ? undefined : { deliverAs: "steer" },
      );
      ctx.ui.notify("Sent /comment feedback", "info");
    } catch (error) {
      ctx.ui.notify(
        `/comment failed: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    }
  };

  pi.registerShortcut("alt+z", {
    description: "Edit current buffer in external editor",
    handler: editBuffer,
  });

  pi.registerShortcut("alt+c", {
    description: "Annotate the last assistant message in an external editor",
    handler: comment,
  });

  pi.registerCommand("comment", {
    description: "Annotate the last assistant message in an external editor",
    handler: async (_args, ctx) => comment(ctx),
  });
}
