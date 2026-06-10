/**
 * Desktop Notification Extension
 *
 * Sends a native desktop notification via notify-send when the agent finishes
 * and is waiting for input.
 *
 * Adapted from mitsuhiko's notify extension, using notify-send (Linux)
 * instead of OSC 777 terminal escape sequences.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Markdown, type MarkdownTheme } from "@mariozechner/pi-tui";

type AssistantLike = {
  role?: string;
  stopReason?: string;
  errorMessage?: string;
};

// Mirrors AgentSession._isRetryableError: errors the core auto-retries with
// exponential backoff. We must stay silent for these until retries settle.
const RETRYABLE_ERROR =
  /overloaded|provider.?returned.?error|rate.?limit|too many requests|429|500|502|503|504|service.?unavailable|server.?error|internal.?error|network.?error|connection.?error|connection.?refused|connection.?lost|other side closed|fetch failed|upstream.?connect|reset before headers|socket hang up|ended without|http2 request did not get a response|timed? out|timeout|terminated|retry delay/i;

// The core retries with exponential backoff (default 2s/4s/8s). The retry's
// agent_start cancels the pending notification, so this window only needs to
// outlast the gap between a failed agent_end and the next attempt starting.
const RETRY_GRACE_MS = Number(process.env.PI_NOTIFY_RETRY_GRACE_MS) || 20000;

const findLastAssistant = (
  messages: Array<{ role?: string }>,
): AssistantLike | undefined => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i] as AssistantLike;
    if (message?.role === "assistant") return message;
  }
  return undefined;
};

const isTextPart = (part: unknown): part is { type: "text"; text: string } =>
  Boolean(
    part &&
    typeof part === "object" &&
    "type" in part &&
    part.type === "text" &&
    "text" in part,
  );

const extractLastAssistantText = (
  messages: Array<{ role?: string; content?: unknown }>,
): string | null => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "assistant") {
      continue;
    }

    const content = message.content;
    if (typeof content === "string") {
      return content.trim() || null;
    }

    if (Array.isArray(content)) {
      const text = content
        .filter(isTextPart)
        .map((part) => part.text)
        .join("\n")
        .trim();
      return text || null;
    }

    return null;
  }

  return null;
};

const plainMarkdownTheme: MarkdownTheme = {
  heading: (text) => text,
  link: (text) => text,
  linkUrl: () => "",
  code: (text) => text,
  codeBlock: (text) => text,
  codeBlockBorder: () => "",
  quote: (text) => text,
  quoteBorder: () => "",
  hr: () => "",
  listBullet: () => "",
  bold: (text) => text,
  italic: (text) => text,
  strikethrough: (text) => text,
  underline: (text) => text,
};

const simpleMarkdown = (text: string, width = 80): string => {
  const markdown = new Markdown(text, 0, 0, plainMarkdownTheme);
  return markdown.render(width).join("\n");
};

const formatNotification = (text: string | null): string => {
  const simplified = text ? simpleMarkdown(text) : "";
  const normalized = simplified.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Task completed";
  }

  const maxBody = 200;
  return normalized.length > maxBody
    ? `${normalized.slice(0, maxBody - 1)}…`
    : normalized;
};

export default function (pi: ExtensionAPI) {
  const isSubagent = process.env.PI_SUBAGENT_CHILD === "1";

  const sendNotification = async (
    title: string,
    body: string,
    urgency: "low" | "normal" | "critical" = "normal",
  ): Promise<void> => {
    await pi.exec("notify-send", ["-t", "60000", "-u", urgency, title, body]);
  };

  // Pending notification for a retryable error. Held back until we know whether
  // the core auto-retries (agent_start fires -> cancel) or gives up (timer fires).
  let pendingRetryTimer: ReturnType<typeof setTimeout> | undefined;

  const clearPending = (): void => {
    if (pendingRetryTimer) {
      clearTimeout(pendingRetryTimer);
      pendingRetryTimer = undefined;
    }
  };

  // A new agent loop starting while an error is pending means the core kicked
  // off an auto-retry — suppress the intermediate error notification.
  pi.on("agent_start", () => {
    if (isSubagent) return;
    clearPending();
  });

  pi.on("agent_end", async (event) => {
    if (isSubagent) return;

    const messages = event.messages ?? [];
    const lastAssistant = findLastAssistant(messages);
    const errorMessage =
      lastAssistant?.stopReason === "error"
        ? (lastAssistant.errorMessage ?? "")
        : undefined;

    // Retryable error: defer. If a retry starts it gets cancelled in
    // agent_start; otherwise this fires once retries are exhausted.
    if (errorMessage !== undefined && RETRYABLE_ERROR.test(errorMessage)) {
      clearPending();
      const body = formatNotification(`Failed: ${errorMessage}`);
      pendingRetryTimer = setTimeout(() => {
        pendingRetryTimer = undefined;
        void sendNotification("π", body, "critical");
      }, RETRY_GRACE_MS);
      return;
    }

    // Success or non-retryable error: notify now and drop any pending retry.
    clearPending();
    const body =
      errorMessage !== undefined
        ? formatNotification(`Failed: ${errorMessage}`)
        : formatNotification(extractLastAssistantText(messages));
    await sendNotification(
      "π",
      body,
      errorMessage !== undefined ? "critical" : "low",
    );
  });
}
