/**
 * Ralph config discovery and parsing.
 *
 * A ralph config is a markdown file with frontmatter (loop settings) and a body
 * (the task prompt handed to each iteration's worker).
 *
 * Discovery for `/ralph @name` (default name is `ralph`):
 *   1. <cwd>/.pi/ralph/<name>.md        (project)
 *   2. ~/.pi/agent/ralph/<name>.md      (user global)
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { parseFrontmatter } from "@mariozechner/pi-coding-agent";

export const DEFAULT_CONFIG_NAME = "ralph";
export const DEFAULT_MAX_ITERATIONS = 100;
/** Default delegation vessel: the builtin pi-subagents "naked" delegate agent. */
export const DEFAULT_AGENT = "delegate";
/** Consecutive identical stop-check fingerprints before aborting as "stuck". */
export const DEFAULT_NO_PROGRESS_LIMIT = 2;

export interface StopCondition {
  /** Inline shell command run via `bash -lc`. */
  run?: string;
  /** Path to a script file (resolved against the config dir, then cwd). */
  script?: string;
}

export interface RalphConfig {
  /** Loop name, derived from filename (e.g. `ralph`, `cleanup`). */
  name: string;
  /** Absolute path to the config file. */
  path: string;
  /** Directory containing the config file (for resolving relative scripts). */
  dir: string;
  /** Task prompt body handed to each iteration. */
  body: string;
  /** pi-subagents agent used as the delegation vessel (default: `delegate`). */
  agent: string;
  model?: string;
  thinking?: string;
  skills?: string[];
  maxIterations: number;
  noProgressLimit: number;
  stop: StopCondition;
  description?: string;
}

export interface ConfigError {
  message: string;
}

export type ConfigResult =
  | { ok: true; config: RalphConfig }
  | { ok: false; error: string };

const VALID_THINKING = new Set(["off", "minimal", "low", "medium", "high"]);

function configSearchPaths(cwd: string, name: string): string[] {
  return [
    join(cwd, ".pi", "ralph", `${name}.md`),
    join(homedir(), ".pi", "agent", "ralph", `${name}.md`),
  ];
}

/** List discoverable config names across project + user scope (for status/help). */
export function listConfigNames(cwd: string): string[] {
  const names = new Set<string>();
  // Lightweight: only report the ones that exist via direct stat in known dirs.
  // (Avoids a recursive scan; ralph configs are flat in these dirs.)
  const dirs = [
    join(cwd, ".pi", "ralph"),
    join(homedir(), ".pi", "agent", "ralph"),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    try {
      for (const entry of readdirSync(dir)) {
        if (entry.endsWith(".md")) names.add(entry.slice(0, -3));
      }
    } catch {
      // ignore
    }
  }
  return [...names].sort();
}

function parseSkills(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const skills = value.map((s) => String(s).trim()).filter(Boolean);
    return skills.length > 0 ? skills : undefined;
  }
  if (typeof value === "string") {
    const skills = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return skills.length > 0 ? skills : undefined;
  }
  return undefined;
}

function parseStop(value: unknown): StopCondition | { error: string } {
  if (!value || typeof value !== "object") {
    return {
      error: "frontmatter `stop` must be a block with `run:` or `script:`",
    };
  }
  const record = value as Record<string, unknown>;
  const run =
    typeof record.run === "string" && record.run.trim()
      ? record.run.trim()
      : undefined;
  const script =
    typeof record.script === "string" && record.script.trim()
      ? record.script.trim()
      : undefined;
  if (!run && !script) {
    return {
      error:
        "frontmatter `stop` must define `run:` (inline command) or `script:` (path)",
    };
  }
  if (run && script) {
    return {
      error: "frontmatter `stop` must define only one of `run:` or `script:`",
    };
  }
  return { run, script };
}

export function resolveConfigPath(
  cwd: string,
  name: string,
): string | undefined {
  for (const candidate of configSearchPaths(cwd, name)) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

export function loadConfig(cwd: string, rawName?: string): ConfigResult {
  const name = rawName?.replace(/^@/, "").trim() || DEFAULT_CONFIG_NAME;
  if (!/^[\w.-]+$/.test(name)) {
    return { ok: false, error: `Invalid ralph config name: "${name}"` };
  }

  const path = resolveConfigPath(cwd, name);
  if (!path) {
    const searched = configSearchPaths(cwd, name)
      .map((p) => `  - ${p}`)
      .join("\n");
    return {
      ok: false,
      error: `No ralph config "${name}" found. Searched:\n${searched}`,
    };
  }

  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch (error) {
    return {
      ok: false,
      error: `Failed to read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const { frontmatter, body } =
    parseFrontmatter<Record<string, unknown>>(content);

  if (!frontmatter || typeof frontmatter !== "object") {
    return {
      ok: false,
      error: `${path}: frontmatter must be a key-value object`,
    };
  }

  const taskBody = body.trim();
  if (!taskBody) {
    return { ok: false, error: `${path}: config body (task prompt) is empty` };
  }

  const stop = parseStop(frontmatter.stop);
  if ("error" in stop) {
    return { ok: false, error: `${path}: ${stop.error}` };
  }

  let agent = DEFAULT_AGENT;
  if (frontmatter.agent !== undefined) {
    if (typeof frontmatter.agent !== "string" || !frontmatter.agent.trim()) {
      return {
        ok: false,
        error: `${path}: frontmatter \`agent\` must be a non-empty string`,
      };
    }
    agent = frontmatter.agent.trim();
  }

  let model: string | undefined;
  if (frontmatter.model !== undefined) {
    if (typeof frontmatter.model !== "string" || !frontmatter.model.trim()) {
      return {
        ok: false,
        error: `${path}: frontmatter \`model\` must be a non-empty string`,
      };
    }
    model = frontmatter.model.trim();
  }

  let thinking: string | undefined;
  if (frontmatter.thinking !== undefined) {
    const t = String(frontmatter.thinking).trim();
    if (!VALID_THINKING.has(t)) {
      return {
        ok: false,
        error: `${path}: frontmatter \`thinking\` must be one of ${[...VALID_THINKING].join(", ")}`,
      };
    }
    thinking = t;
  }

  let maxIterations = DEFAULT_MAX_ITERATIONS;
  if (frontmatter.maxIterations !== undefined) {
    const n = Number(frontmatter.maxIterations);
    if (!Number.isInteger(n) || n < 1) {
      return {
        ok: false,
        error: `${path}: frontmatter \`maxIterations\` must be a positive integer`,
      };
    }
    maxIterations = n;
  }

  let noProgressLimit = DEFAULT_NO_PROGRESS_LIMIT;
  if (frontmatter.noProgressLimit !== undefined) {
    const n = Number(frontmatter.noProgressLimit);
    if (!Number.isInteger(n) || n < 1) {
      return {
        ok: false,
        error: `${path}: frontmatter \`noProgressLimit\` must be a positive integer`,
      };
    }
    noProgressLimit = n;
  }

  const dir = resolve(path, "..");

  return {
    ok: true,
    config: {
      name,
      path,
      dir,
      body: taskBody,
      model,
      thinking,
      skills: parseSkills(frontmatter.skills),
      agent,
      maxIterations,
      noProgressLimit,
      stop,
      description:
        typeof frontmatter.description === "string"
          ? frontmatter.description.trim()
          : undefined,
    },
  };
}

/** Resolve a `stop.script` path against the config dir, then cwd. */
export function resolveScriptPath(
  config: RalphConfig,
  cwd: string,
): string | undefined {
  const script = config.stop.script;
  if (!script) return undefined;
  if (isAbsolute(script)) return existsSync(script) ? script : undefined;
  const candidates = [resolve(config.dir, script), resolve(cwd, script)];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}
