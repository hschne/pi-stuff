import type { AssistantMessage } from "@earendil-works/pi-ai";
import type {
  ExtensionAPI,
  ExtensionContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const TOKSEC_CUSTOM_TYPE = "toksec";
const MIN_GENERATION_MS = 50;

interface UsageStats {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  contextPercent: number;
  contextWindow: number;
  thinkingLevel: string;
}

interface ModelRef {
  provider: string;
  id: string;
  short: string;
}

interface ToksecStats {
  count: number;
  outputTokens: number;
  generationMs: number;
}

interface ToksecSample {
  version: 1;
  provider: string;
  modelId: string;
  outputTokens: number;
  generationMs: number;
}

interface ActiveToksecMeasurement extends ModelRef {
  firstOutputAt?: number;
  deltaChars: number;
}

/**
 * Aggregates usage and session data from the current message branch
 */
function getUsageStats(ctx: any): UsageStats {
  let input = 0,
    output = 0,
    cacheRead = 0,
    cacheWrite = 0,
    cost = 0;
  let thinkingLevel = "off";
  let lastAssistant: AssistantMessage | undefined;

  const sessionEvents = ctx.sessionManager?.getBranch() || [];
  for (const e of sessionEvents) {
    if (e.type === "thinking_level_change" && e.thinkingLevel) {
      thinkingLevel = e.thinkingLevel;
    }
    if (e.type === "message" && e.message.role === "assistant") {
      const m = e.message as AssistantMessage;
      if (m.stopReason === "error" || m.stopReason === "aborted") continue;
      input += m.usage.input;
      output += m.usage.output;
      cacheRead += m.usage.cacheRead;
      cacheWrite += m.usage.cacheWrite;
      cost += m.usage.cost.total;
      lastAssistant = m;
    }
  }

  const contextWindow = ctx.model?.contextWindow || 0;
  const contextTokens = lastAssistant
    ? lastAssistant.usage.input +
      lastAssistant.usage.output +
      (lastAssistant.usage.cacheRead || 0) +
      (lastAssistant.usage.cacheWrite || 0)
    : 0;
  const contextPercent =
    contextWindow > 0 ? (contextTokens / contextWindow) * 100 : 0;

  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    cost,
    contextPercent,
    contextWindow,
    thinkingLevel,
  };
}

function shortModelName(name: string | undefined, id: string): string {
  let modelName = name || id || "no-model";
  if (modelName.startsWith("Claude ")) modelName = modelName.slice(7);
  return modelName;
}

function currentModel(ctx: ExtensionContext | any): ModelRef | undefined {
  const model = ctx.model;
  if (!model) return undefined;
  return {
    provider: model.provider,
    id: model.id,
    short: shortModelName(model.name, model.id),
  };
}

function modelKey(model: Pick<ModelRef, "provider" | "id">): string {
  return `${model.provider}/${model.id}`;
}

function isToksecSample(data: unknown): data is ToksecSample {
  if (!data || typeof data !== "object") return false;
  const sample = data as Partial<ToksecSample>;
  return (
    sample.version === 1 &&
    typeof sample.provider === "string" &&
    typeof sample.modelId === "string" &&
    typeof sample.outputTokens === "number" &&
    typeof sample.generationMs === "number"
  );
}

function addToksecSample(
  stats: Map<string, ToksecStats>,
  sample: ToksecSample,
): boolean {
  if (!Number.isFinite(sample.outputTokens) || sample.outputTokens <= 0)
    return false;
  if (
    !Number.isFinite(sample.generationMs) ||
    sample.generationMs < MIN_GENERATION_MS
  )
    return false;

  const key = modelKey({ provider: sample.provider, id: sample.modelId });
  const entry = stats.get(key) ?? {
    count: 0,
    outputTokens: 0,
    generationMs: 0,
  };
  entry.count += 1;
  entry.outputTokens += sample.outputTokens;
  entry.generationMs += sample.generationMs;
  stats.set(key, entry);
  return true;
}

function rebuildToksecStats(ctx: ExtensionContext): Map<string, ToksecStats> {
  const stats = new Map<string, ToksecStats>();
  const branch = ctx.sessionManager?.getBranch() ?? [];

  for (const entry of branch as {
    type?: string;
    customType?: string;
    data?: unknown;
  }[]) {
    if (entry.type !== "custom" || entry.customType !== TOKSEC_CUSTOM_TYPE)
      continue;
    if (isToksecSample(entry.data)) addToksecSample(stats, entry.data);
  }

  return stats;
}

function outputTokensFromMessage(
  message: unknown,
  fallbackChars: number,
): number {
  const usage = (message as { usage?: { output?: unknown } } | undefined)
    ?.usage;
  if (typeof usage?.output === "number" && usage.output > 0)
    return usage.output;
  return Math.max(0, Math.ceil(fallbackChars / 4));
}

function isOutputEvent(event: unknown): boolean {
  if (!event || typeof event !== "object") return false;
  const type = (event as { type?: unknown }).type;
  return (
    type === "text_start" ||
    type === "text_delta" ||
    type === "text_end" ||
    type === "thinking_start" ||
    type === "thinking_delta" ||
    type === "thinking_end" ||
    type === "toolcall_start" ||
    type === "toolcall_delta" ||
    type === "toolcall_end"
  );
}

function isFinalAssistantMessage(message: unknown): boolean {
  if (!message || typeof message !== "object") return false;
  const msg = message as { role?: unknown; stopReason?: unknown };
  return (
    msg.role === "assistant" &&
    msg.stopReason !== "error" &&
    msg.stopReason !== "aborted"
  );
}

function formatToksec(
  stats: Map<string, ToksecStats>,
  model: ModelRef | undefined,
): string {
  if (!model) return "--t/s";
  const entry = stats.get(modelKey(model));
  if (!entry || entry.count === 0 || entry.generationMs <= 0) return "--t/s";

  const rate = Math.round(entry.outputTokens / (entry.generationMs / 1000));
  return `${Math.min(9999, Math.max(0, rate))}t/s`;
}

/**
 * Returns formatted working directory (last 3 components with .. prefix)
 */
function getFolderName(): string {
  const pwd = process.cwd();
  const home = process.env.HOME || "";
  const displayPwd = pwd.startsWith(home) ? `~${pwd.slice(home.length)}` : pwd;

  const parts = displayPwd.split(/[/\\]/).filter(Boolean);
  if (parts.length > 3) {
    const sep = displayPwd.includes("\\") ? "\\" : "/";
    return ".." + sep + parts.slice(-3).join(sep);
  }
  return displayPwd;
}

/**
 * Renders the usage and cost part (right aligned)
 */
function renderRightPart(stats: UsageStats, theme: Theme): string {
  const fmt = (n: number) => (n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`);
  const cacheStr =
    stats.cacheRead || stats.cacheWrite
      ? theme.fg(
          "dim",
          ` (c: ↑${fmt(stats.cacheWrite)} ↓${fmt(stats.cacheRead)})`,
        )
      : "";
  const contextStr = stats.contextWindow
    ? theme.fg("dim", ` [${stats.contextPercent.toFixed(1)}%]`)
    : "";

  return (
    theme.fg("dim", `↑${fmt(stats.input)} ↓${fmt(stats.output)}`) +
    cacheStr +
    contextStr +
    " " +
    theme.fg("text", `$${stats.cost.toFixed(3)} `)
  );
}

/**
 * Renders the info segments (left aligned)
 */
function renderLeftPart(
  ctx: any,
  stats: UsageStats,
  footerData: any,
  theme: Theme,
  toksecStats: Map<string, ToksecStats>,
): string {
  const SEP = theme.fg("dim", "  ");
  const DOT = theme.fg("dim", " · ");
  const segments: string[] = [];

  // Model · Thinking · t/s
  const model = currentModel(ctx);
  const levelMap: Record<string, string> = {
    off: "off",
    minimal: "min",
    low: "low",
    medium: "med",
    high: "high",
    xhigh: "xhigh",
  };
  const thinking = levelMap[stats.thinkingLevel] || stats.thinkingLevel;
  segments.push(
    theme.fg("customMessageLabel", "π " + (model?.short || "no-model")) +
      DOT +
      theme.fg("dim", thinking) +
      DOT +
      theme.fg("dim", formatToksec(toksecStats, model)),
  );

  // Path
  segments.push(theme.fg("mdLink", "" + getFolderName()));

  // Git
  const branch = footerData.getGitBranch();
  if (branch) {
    segments.push(theme.fg("success", " " + branch));
  }

  // Extension Statuses (Compact)
  const statuses = footerData.getExtensionStatuses() || new Map();
  const compactStatuses: string[] = [];
  for (const value of statuses.values()) {
    if (value && !value.trimStart().startsWith("[")) {
      compactStatuses.push(value);
    }
  }
  if (compactStatuses.length > 0) {
    segments.push(theme.fg("warning", compactStatuses.join(" | ")));
  }

  return " " + segments.join(SEP);
}

export default function (pi: ExtensionAPI) {
  let enabled = true;
  let toksecStats = new Map<string, ToksecStats>();
  let activeToksec: ActiveToksecMeasurement | undefined;

  const applyFooter = (ctx: any) => {
    if (!ctx.hasUI) return;

    ctx.ui.setFooter((tui: any, theme: any, footerData: any) => {
      const unsub = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsub,
        invalidate() {},
        render(width: number): string[] {
          if (!enabled) return [];
          const stats = getUsageStats(ctx);
          const left = renderLeftPart(
            ctx,
            stats,
            footerData,
            theme,
            toksecStats,
          );
          const right = renderRightPart(stats, theme);

          const padWidth = Math.max(
            1,
            width - visibleWidth(left) - visibleWidth(right),
          );
          const content = left + " ".repeat(padWidth) + right;

          return [truncateToWidth(content, width)];
        },
      };
    });
  };

  pi.on("session_start", async (_event, ctx) => {
    toksecStats = rebuildToksecStats(ctx);
    // Clear the old standalone toksec status if it exists in a restored process.
    if (ctx.hasUI) ctx.ui.setStatus(TOKSEC_CUSTOM_TYPE, undefined);
    if (enabled) applyFooter(ctx);
  });

  pi.on("message_start", async (event, ctx) => {
    const message = event.message as { role?: unknown };
    if (message.role !== "assistant") return;

    const model = currentModel(ctx);
    if (!model) return;

    activeToksec = { ...model, firstOutputAt: undefined, deltaChars: 0 };
  });

  pi.on("message_update", async (event) => {
    if (!activeToksec) return;

    const assistantEvent = event.assistantMessageEvent as {
      type?: string;
      delta?: unknown;
    };
    if (!isOutputEvent(assistantEvent)) return;

    activeToksec.firstOutputAt ??= Date.now();
    if (
      assistantEvent.type?.endsWith("_delta") &&
      typeof assistantEvent.delta === "string"
    ) {
      activeToksec.deltaChars += assistantEvent.delta.length;
    }
  });

  pi.on("message_end", async (event) => {
    const measurement = activeToksec;
    activeToksec = undefined;

    if (!measurement?.firstOutputAt) return;
    if (!isFinalAssistantMessage(event.message)) return;

    const sample: ToksecSample = {
      version: 1,
      provider: measurement.provider,
      modelId: measurement.id,
      outputTokens: outputTokensFromMessage(
        event.message,
        measurement.deltaChars,
      ),
      generationMs: Date.now() - measurement.firstOutputAt,
    };

    if (addToksecSample(toksecStats, sample))
      pi.appendEntry(TOKSEC_CUSTOM_TYPE, sample);
  });

  pi.registerCommand("footer", {
    description: "Toggle custom footer",
    handler: async (_args, ctx) => {
      enabled = !enabled;
      if (enabled) {
        applyFooter(ctx);
        ctx.ui.notify("Custom footer enabled", "info");
      } else {
        ctx.ui.setFooter(undefined);
        ctx.ui.notify("Default footer restored", "info");
      }
    },
  });
}
