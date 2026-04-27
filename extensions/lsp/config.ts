import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import type { LspConfig, ServerConfig } from "./types.js";

/**
 * Deep merge two objects. Arrays are replaced, not merged.
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== null &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Load and parse a JSON settings file.
 * Returns empty object if file doesn't exist or is invalid.
 */
function loadSettingsFile(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error(`[lsp] Failed to load settings from ${path}:`, err);
    return {};
  }
}

/**
 * Extract LSP config from settings object.
 */
function extractLspConfig(
  settings: Record<string, unknown>,
): Partial<LspConfig> {
  const lsp = settings.lsp;

  if (!lsp || typeof lsp !== "object") {
    return {};
  }

  const lspObj = lsp as Record<string, unknown>;
  const servers = lspObj.servers;

  if (!servers || typeof servers !== "object") {
    return {};
  }

  return { servers: servers as Record<string, ServerConfig> };
}

/**
 * Load LSP configuration from global and project settings.
 * Project settings override global settings.
 */
export function loadConfig(cwd: string): LspConfig {
  const globalPath = join(homedir(), ".pi", "agent", "settings.json");
  const projectPath = join(cwd, ".pi", "settings.json");

  // Load settings files
  const globalSettings = loadSettingsFile(globalPath);
  const projectSettings = loadSettingsFile(projectPath);

  // Extract LSP config from each
  const globalLsp = extractLspConfig(globalSettings);
  const projectLsp = extractLspConfig(projectSettings);

  // Start with empty config
  const baseConfig: LspConfig = { servers: {} };

  // Merge global, then project
  const merged = deepMerge(deepMerge(baseConfig, globalLsp), projectLsp);

  // Filter out disabled servers
  const activeServers: Record<string, ServerConfig> = {};
  for (const [id, config] of Object.entries(merged.servers)) {
    if (!config.disabled) {
      activeServers[id] = config;
    }
  }

  return { servers: activeServers };
}

/**
 * Return matching configured extensions for a file path, longest first.
 * Supports compound extensions like `.html.erb`.
 */
export function extensionsForFile(
  filePath: string,
  configuredExtensions: string[],
): string[] {
  const name = basename(filePath);
  return configuredExtensions
    .filter((extension) => name.endsWith(extension))
    .sort((a, b) => b.length - a.length);
}

/**
 * Find which servers handle a given file path.
 */
export function findServersForFile(
  config: LspConfig,
  filePath: string,
): { id: string; config: ServerConfig; extension: string }[] {
  const result: { id: string; config: ServerConfig; extension: string }[] = [];

  for (const [id, serverConfig] of Object.entries(config.servers)) {
    const [extension] = extensionsForFile(filePath, serverConfig.extensions);
    if (extension) {
      result.push({ id, config: serverConfig, extension });
    }
  }

  return result;
}

/**
 * Find the first server that handles a given file path.
 */
export function findServerForFile(
  config: LspConfig,
  filePath: string,
): { id: string; config: ServerConfig; extension: string } | undefined {
  return findServersForFile(config, filePath)[0];
}
