/**
 * Parse `/ralph` command arguments.
 *
 *   /ralph                         → default config
 *   /ralph @cleanup                → named config (the `@` is optional sugar)
 *   /ralph --thinking=high
 *   /ralph @cleanup --model=anthropic/claude-opus-4-8 --thinking=low --max=20
 *
 * No freeform task text is supported: the task lives in the config body and
 * whatever issues/checklist the project defines.
 */

import type { LoopOverrides } from "./loop.js";

export interface ParsedRalphArgs {
  ok: true;
  name?: string;
  overrides: LoopOverrides;
}

export interface ParsedRalphArgsError {
  ok: false;
  error: string;
}

const VALID_THINKING = new Set(["off", "minimal", "low", "medium", "high"]);

export function parseRalphArgs(
  raw: string,
): ParsedRalphArgs | ParsedRalphArgsError {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const overrides: LoopOverrides = {};
  let name: string | undefined;

  for (const token of tokens) {
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      const key = eq === -1 ? token.slice(2) : token.slice(2, eq);
      const value = eq === -1 ? "" : token.slice(eq + 1);

      switch (key) {
        case "model":
          if (!value)
            return {
              ok: false,
              error:
                "--model requires a value (e.g. --model=anthropic/claude-sonnet-4-6)",
            };
          overrides.model = value;
          break;
        case "thinking":
          if (!VALID_THINKING.has(value)) {
            return {
              ok: false,
              error: `--thinking must be one of ${[...VALID_THINKING].join(", ")}`,
            };
          }
          overrides.thinking = value;
          break;
        case "max":
        case "max-iterations": {
          const n = Number(value);
          if (!Number.isInteger(n) || n < 1)
            return { ok: false, error: "--max must be a positive integer" };
          overrides.maxIterations = n;
          break;
        }
        default:
          return { ok: false, error: `Unknown flag: --${key}` };
      }
      continue;
    }

    // First non-flag token is the config name (with optional `@` prefix).
    if (name !== undefined) {
      return {
        ok: false,
        error: `Unexpected argument "${token}". /ralph takes only @name and flags (no freeform task text).`,
      };
    }
    name = token.replace(/^@/, "");
  }

  return { ok: true, name, overrides };
}
