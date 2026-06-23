/**
 * Comment Extension
 *
 * /comment opens the last assistant message in $VISUAL/$EDITOR inside a
 * floating kitty window. When the editor closes, changed content is sent back
 * to the agent as a user message.
 *
 * Requires Hyprland and kitty, matching editor-popup.ts.
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ExtensionAPI,
  ExtensionContext,
  SessionMessageEntry,
} from "@earendil-works/pi-coding-agent";

type SessionMessage = SessionMessageEntry["message"];

const INSTRUCTIONS = `<!--
Add inline comments or edits to the agent message below.
Save your changes, then close the editor to send this to the agent.
Close without changes to cancel.
-->

`;

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function getAssistantText(message: SessionMessage): string | undefined {
  if (!("role" in message) || message.role !== "assistant") {
    return undefined;
  }

  const text = message.content
    .filter(
      (content): content is { type: "text"; text: string } =>
        content.type === "text",
    )
    .map((content) => content.text)
    .join("\n\n")
    .trim();

  return text.length > 0 ? text : undefined;
}

function getLastAssistantText(ctx: ExtensionContext): string | undefined {
  const branch = ctx.sessionManager.getBranch();

  for (let i = branch.length - 1; i >= 0; i--) {
    const entry = branch[i];
    if (entry.type !== "message") {
      continue;
    }

    const text = getAssistantText(entry.message);
    if (text) {
      return text;
    }
  }

  return undefined;
}

function stripInstructions(content: string): string {
  return content.startsWith(INSTRUCTIONS)
    ? content.slice(INSTRUCTIONS.length)
    : content;
}

function buildUserMessage(comment: string): string {
  return `I annotated your last message in my editor. Treat this as feedback on your previous response:\n\n${comment}`;
}

function configureFloatingKitty(appId: string): void {
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
}

export default function (pi: ExtensionAPI) {
  const commentHandler = async (ctx: ExtensionContext) => {
    if (!ctx.hasUI) {
      ctx.ui.notify("/comment requires interactive mode", "error");
      return;
    }

    const assistantText = getLastAssistantText(ctx);
    if (!assistantText) {
      ctx.ui.notify("No assistant message found", "error");
      return;
    }

    const editor = process.env.VISUAL || process.env.EDITOR || "vim";
    const shell = process.env.SHELL || "/bin/sh";
    const tempDir = mkdtempSync(join(tmpdir(), "pi-comment-"));
    const tmpFile = join(tempDir, "comment.md");
    const initialContent = INSTRUCTIONS + assistantText + "\n";
    const initialComment = assistantText.trimEnd();
    writeFileSync(tmpFile, initialContent);

    let resolveDone: (() => void) | undefined;

    const cleanup = () => {
      rmSync(tempDir, { recursive: true, force: true });
    };

    const finish = () => {
      resolveDone?.();
      resolveDone = undefined;
    };

    const sendComment = () => {
      const comment = stripInstructions(
        readFileSync(tmpFile, "utf8"),
      ).trimEnd();
      if (comment.length === 0 || comment === initialComment) {
        ctx.ui.notify("/comment cancelled (no changes)", "info");
        return;
      }

      pi.sendUserMessage(
        buildUserMessage(comment),
        ctx.isIdle() ? undefined : { deliverAs: "steer" },
      );
      ctx.ui.notify("Sent /comment feedback", "info");
    };

    try {
      const appId = `pi-comment-${process.pid}-${Date.now()}`;
      configureFloatingKitty(appId);

      const command = `${editor} ${shellQuote(tmpFile)}`;
      const term = spawn("kitty", ["--class", appId, shell, "-c", command], {
        stdio: "ignore",
      });

      term.on("error", (err) => {
        ctx.ui.notify(`/comment editor failed: ${err.message}`, "error");
        cleanup();
        finish();
      });

      term.on("exit", (status, signal) => {
        try {
          if (status !== 0 || signal != null) {
            const detail = signal
              ? `signal ${signal}`
              : `code ${status ?? "unknown"}`;
            ctx.ui.notify(`/comment editor exited with ${detail}`, "warning");
          }
          sendComment();
        } catch (err) {
          ctx.ui.notify(
            `/comment failed: ${err instanceof Error ? err.message : String(err)}`,
            "error",
          );
        } finally {
          cleanup();
          finish();
        }
      });

      await new Promise<void>((resolve) => {
        resolveDone = resolve;
      });
    } catch (err) {
      ctx.ui.notify(
        `/comment failed: ${err instanceof Error ? err.message : String(err)}`,
        "error",
      );
      cleanup();
    }
  };

  pi.registerCommand("comment", {
    description:
      "Annotate the last assistant message in an external editor and send on close",
    handler: async (_args, ctx) => commentHandler(ctx),
  });

  pi.registerShortcut("ctrl+shift+a", {
    description: "Annotate the last assistant message in an external editor",
    handler: commentHandler,
  });
}
