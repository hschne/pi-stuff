import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { Buffer } from "node:buffer";

// =============================================================================
// Logging
// =============================================================================

const XDG_STATE_HOME =
  process.env.XDG_STATE_HOME || join(homedir(), ".local", "state");
const LOG_PATH = join(XDG_STATE_HOME, "pi", "debug.log");

function debugLog(msg: string): void {
  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {
    // best-effort
  }
}

// =============================================================================
// Types
// =============================================================================

type Provider =
  | "anthropic"
  | "google-gemini-cli"
  | "openrouter"
  | "openai-codex";

interface ClaudeUsageData {
  provider: "anthropic";
  utilization: number;
  resetsAt: number | null;
}

interface GeminiUsageData {
  provider: "google-gemini-cli";
  utilization: number; // percentage used (0-100)
  resetsAt: number | null;
}

interface OpenRouterUsageData {
  provider: "openrouter";
  credits: number;
}

interface OpenAICodexUsageData {
  provider: "openai-codex";
  utilization: number;
  resetsAt: number | null;
}

type UsageData =
  | ClaudeUsageData
  | GeminiUsageData
  | OpenRouterUsageData
  | OpenAICodexUsageData;

interface ClaudeOAuthUsageResponse {
  five_hour?: { utilization?: number; resets_at?: string };
}

interface GeminiQuotaResponse {
  buckets?: Array<{
    modelId?: string;
    remainingFraction?: number;
    resetTime?: string;
  }>;
}

interface OpenRouterCreditsResponse {
  data?: {
    total_credits: number;
    total_usage: number;
  };
}

interface OpenAICodexUsageResponse {
  rate_limit?: {
    primary_window?: {
      used_percent?: number;
      reset_at?: number;
      limit_window_seconds?: number;
      reset_after_seconds?: number;
    } | null;
    secondary_window?: {
      used_percent?: number;
      reset_at?: number;
      limit_window_seconds?: number;
      reset_after_seconds?: number;
    } | null;
  };
}

type OpenAICodexRateWindow = NonNullable<
  NonNullable<OpenAICodexUsageResponse["rate_limit"]>["primary_window"]
>;

// =============================================================================
// Constants
// =============================================================================

const STATUS_KEY = "usage";
const BASE_INTERVAL = 3 * 60 * 1000; // 3 minutes
const JITTER_MAX = 30 * 1000; // ±30 seconds
const TIMEOUT = 15 * 1000; // 15 seconds
const ICON = "󰓅";

const CLAUDE_USAGE_ENDPOINT = "https://api.anthropic.com/api/oauth/usage";
const CLAUDE_BETA_HEADER = "oauth-2025-04-20";
const GEMINI_QUOTA_ENDPOINT = "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota";

const OPENROUTER_CREDITS_ENDPOINT = "https://openrouter.ai/api/v1/credits";
const OPENAI_CODEX_USAGE_ENDPOINT = "https://chatgpt.com/backend-api/codex/usage";

const SUPPORTED_PROVIDERS: Provider[] = [
  "anthropic",
  "google-gemini-cli",
  "openrouter",
  "openai-codex",
];

// =============================================================================
// State
// =============================================================================

let cachedUsage: UsageData | null = null;
let lastError: string | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function resetState() {
  cachedUsage = null;
  lastError = null;
}

// =============================================================================
// Helpers
// =============================================================================

function isSupported(provider: string | undefined): provider is Provider {
  return !!provider && SUPPORTED_PROVIDERS.includes(provider as Provider);
}

function parseISO8601ToUnix(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime())
    ? null
    : Math.floor(date.getTime() / 1000);
}

function formatDuration(resetsAtUnix: number | null): string {
  if (resetsAtUnix === null) return "?";
  const seconds = resetsAtUnix - Math.floor(Date.now() / 1000);
  if (seconds <= 0) return "now";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

function getUsageColor(percent: number): "error" | "warning" | "dim" {
  if (percent >= 90) return "error";
  if (percent >= 70) return "warning";
  return "dim";
}

function toStatusErrorText(error: string): string {
  if (error === "unauthorized") return "auth!";
  if (error === "no token") return "no key";
  if (error.startsWith("HTTP ")) return error.slice(0, 8); // e.g. "HTTP 429"
  return "err!";
}

function isOpenAICodexRateWindow(
  window: OpenAICodexRateWindow | null | undefined,
): window is OpenAICodexRateWindow {
  return !!window;
}

function selectMostUsedWindow(
  windows: OpenAICodexRateWindow[],
): OpenAICodexRateWindow {
  let selected = windows[0];

  for (const window of windows) {
    const currentUtilization = selected.used_percent ?? -1;
    const nextUtilization = window.used_percent ?? -1;
    if (nextUtilization > currentUtilization) {
      selected = window;
    }
  }

  return selected;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

function getOpenAIAccountId(token: string): string | null {
  const payload = parseJwtPayload(token);
  const authClaims = payload?.["https://api.openai.com/auth"];

  if (!authClaims || typeof authClaims !== "object") {
    return null;
  }

  const accountId = (authClaims as Record<string, unknown>).chatgpt_account_id;
  return typeof accountId === "string" ? accountId : null;
}

async function checkResponse(res: Response): Promise<void> {
  if (res.status === 401) {
    throw new Error("unauthorized");
  }
  if (res.status === 429) {
    throw new Error("rate limited");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 100)}`);
  }
}

// =============================================================================
// Fetching
// =============================================================================

async function fetchClaudeUsage(token: string): Promise<ClaudeUsageData> {
  const res = await fetch(CLAUDE_USAGE_ENDPOINT, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "anthropic-beta": CLAUDE_BETA_HEADER,
      Accept: "application/json",
      "User-Agent": "pi-extension-usage/1.0",
    },
    signal: AbortSignal.timeout(TIMEOUT),
  });

  await checkResponse(res);
  const data: ClaudeOAuthUsageResponse = await res.json();

  if (data.five_hour?.utilization === undefined) {
    throw new Error("missing five_hour usage data");
  }

  const result: ClaudeUsageData = {
    provider: "anthropic",
    utilization: Math.round(data.five_hour.utilization),
    resetsAt: parseISO8601ToUnix(data.five_hour.resets_at),
  };

  return result;
}

async function fetchGeminiUsage(apiKeyJson: string): Promise<GeminiUsageData> {
  const { token, projectId } = JSON.parse(apiKeyJson) as {
    token: string;
    projectId: string;
  };

  const res = await fetch(GEMINI_QUOTA_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "pi-extension-usage/1.0",
      "X-Goog-Api-Client": "gl-node/22.17.0",
    },
    body: JSON.stringify({ project: projectId }),
    signal: AbortSignal.timeout(TIMEOUT),
  });

  await checkResponse(res);
  const data: GeminiQuotaResponse = await res.json();

  if (!data.buckets || data.buckets.length === 0) {
    throw new Error("no quota buckets");
  }

  // Find the bucket with the lowest remaining fraction
  let lowestFraction = 1;
  let lowestResetTime: string | null = null;

  for (const bucket of data.buckets) {
    if (
      bucket.remainingFraction !== undefined &&
      bucket.remainingFraction < lowestFraction
    ) {
      lowestFraction = bucket.remainingFraction;
      lowestResetTime = bucket.resetTime || null;
    }
  }

  return {
    provider: "google-gemini-cli",
    utilization: Math.round((1 - lowestFraction) * 100),
    resetsAt: parseISO8601ToUnix(lowestResetTime ?? undefined),
  };
}

async function fetchOpenRouterUsage(
  token: string,
): Promise<OpenRouterUsageData> {
  const res = await fetch(OPENROUTER_CREDITS_ENDPOINT, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "pi-extension-usage/1.0",
    },
    signal: AbortSignal.timeout(TIMEOUT),
  });

  await checkResponse(res);
  const data: OpenRouterCreditsResponse = await res.json();

  if (data.data?.total_credits === undefined) {
    throw new Error("missing credits data");
  }

  return {
    provider: "openrouter",
    credits: data.data.total_credits - data.data.total_usage,
  };
}

async function fetchOpenAICodexUsage(
  token: string,
): Promise<OpenAICodexUsageData> {
  const accountId = getOpenAIAccountId(token);
  const origin = new URL(OPENAI_CODEX_USAGE_ENDPOINT).origin;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    // chatgpt.com is behind bot protection; browser-like headers avoid false-positive challenges.
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    Origin: origin,
    Referer: `${origin}/codex/settings/usage`,
  };

  if (accountId) {
    headers["chatgpt-account-id"] = accountId;
  }

  const res = await fetch(OPENAI_CODEX_USAGE_ENDPOINT, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(TIMEOUT),
  });

  await checkResponse(res);
  const data: OpenAICodexUsageResponse = await res.json();

  const windows = [
    data.rate_limit?.primary_window,
    data.rate_limit?.secondary_window,
  ].filter(isOpenAICodexRateWindow);

  if (windows.length === 0) {
    throw new Error("missing codex usage data");
  }

  const selected = selectMostUsedWindow(windows);

  if (selected.used_percent === undefined) {
    throw new Error("missing codex utilization");
  }

  return {
    provider: "openai-codex",
    utilization: Math.round(selected.used_percent),
    resetsAt: selected.reset_at ?? null,
  };
}

// =============================================================================
// UI
// =============================================================================

function updateUI(ctx: ExtensionContext) {
  const provider = ctx.model?.provider;

  if (!isSupported(provider)) {
    ctx.ui.setStatus(STATUS_KEY, undefined);
    return;
  }

  if (lastError) {
    const errorText = toStatusErrorText(lastError);
    ctx.ui.setStatus(
      STATUS_KEY,
      ctx.ui.theme.fg("error", `${ICON} ${errorText}`),
    );
    return;
  }

  if (!cachedUsage || cachedUsage.provider !== provider) {
    ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("dim", `${ICON} ...`));
    return;
  }

  if (cachedUsage.provider === "openrouter") {
    const text = `${ICON} $${cachedUsage.credits.toFixed(2)}`;
    ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("dim", text));
    return;
  }

  const { utilization, resetsAt } = cachedUsage;
  const text = `${ICON} ${utilization}%·${formatDuration(resetsAt)}`;

  ctx.ui.setStatus(
    STATUS_KEY,
    ctx.ui.theme.fg(getUsageColor(utilization), text),
  );
}

// =============================================================================
// Refresh Logic
// =============================================================================

async function fetchUsageForProvider(
  provider: Provider,
  apiKey: string,
): Promise<UsageData> {
  switch (provider) {
    case "anthropic":
      return fetchClaudeUsage(apiKey);
    case "google-gemini-cli":
      return fetchGeminiUsage(apiKey);
    case "openrouter":
      return fetchOpenRouterUsage(apiKey);
    case "openai-codex":
      // For openai-codex usage, use the provider token directly.
      // getApiKeyAndHeaders() may return request-specific headers/apiKey variants
      // that do not work against the ChatGPT backend usage endpoint.
      return fetchOpenAICodexUsage(apiKey);
  }
}

async function performRefresh(ctx: ExtensionContext): Promise<void> {
  const provider = ctx.model?.provider;

  if (!isSupported(provider)) {
    resetState();
    updateUI(ctx);
    return;
  }

  try {
    const apiKey = await ctx.modelRegistry.getApiKeyForProvider(provider);

    if (!apiKey) {
      lastError = "no token";
      cachedUsage = null;
      updateUI(ctx);
      return;
    }

    cachedUsage = await fetchUsageForProvider(provider, apiKey);
    lastError = null;
  } catch (err) {
    lastError = err instanceof Error ? err.message : "unknown error";
    cachedUsage = null;
    debugLog(`refresh failed for ${provider}: ${lastError}`);
  }

  updateUI(ctx);
}

function jitteredInterval(): number {
  const jitter = (Math.random() * 2 - 1) * JITTER_MAX; // -30s to +30s
  return BASE_INTERVAL + jitter;
}

function scheduleRefresh(ctx: ExtensionContext) {
  stopRefreshTimer();
  let delay = jitteredInterval();
  if (lastError === "rate limited") {
    // wait at least 15 minutes if rate limited
    delay = Math.max(delay, 15 * 60 * 1000);
  }
  refreshTimer = setTimeout(async () => {
    await performRefresh(ctx);
    scheduleRefresh(ctx);
  }, delay);
}

function stopRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

// =============================================================================
// Extension Entry Point
// =============================================================================

export default function (pi: ExtensionAPI) {
  pi.on("model_select", async (event, ctx) => {
    const wasSupported = isSupported(event.previousModel?.provider);
    const isNowSupported = isSupported(event.model.provider);
    const providerChanged =
      event.previousModel?.provider !== event.model.provider;

    if (isNowSupported && (!wasSupported || providerChanged)) {
      // Switched TO a supported provider (or between supported providers)
      resetState();
      updateUI(ctx);
      await performRefresh(ctx);
      scheduleRefresh(ctx);
    } else if (!isNowSupported && wasSupported) {
      // Switched AWAY from supported provider
      stopRefreshTimer();
      resetState();
      updateUI(ctx);
    } else if (isNowSupported) {
      // Still on same supported provider
      updateUI(ctx);
    }
  });

  pi.on("session_start", async (_, ctx) => {
    if (isSupported(ctx.model?.provider)) {
      await performRefresh(ctx);
      scheduleRefresh(ctx);
    }
  });

  pi.on("session_shutdown", () => {
    stopRefreshTimer();
  });
}
