import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type {
  ExtensionAPI,
  ToolResultEvent,
} from "@mariozechner/pi-coding-agent";
import {
  getAgentDir,
  isEditToolResult,
  isReadToolResult,
  isWriteToolResult,
  loadSkills,
  stripFrontmatter,
} from "@mariozechner/pi-coding-agent";

type Trigger = "read" | "edit" | "write";

interface SkillRule {
  skills: string[];
  paths: string[];
  on: Trigger[];
}

interface SkillSource {
  name: string;
  filePath: string;
}

const CONFIG_NAME = "skill-rules.json";
const DEFAULT_ON: Trigger[] = ["edit", "write"];
const VALID_TRIGGERS = new Set<Trigger>(["read", "edit", "write"]);

export default function skillRulesExtension(pi: ExtensionAPI) {
  let rules: SkillRule[] = [];
  let skillSources = new Map<string, SkillSource>();
  const injected = new Set<string>();

  pi.on("session_start", async (_event, ctx) => {
    injected.clear();
    rules = loadRules(ctx.cwd);
    skillSources = discoverSkills(ctx.cwd);
  });

  pi.on("tool_result", (event, ctx) => {
    if (event.isError) return;
    const trigger = triggerFor(event);
    if (!trigger) return;

    const rawPath = event.input.path;
    if (typeof rawPath !== "string" || rawPath.trim() === "") return;

    const rel = toRelativePosix(path.resolve(ctx.cwd, rawPath), ctx.cwd);
    if (!rel) return;

    const matched = matchSkills(rules, rel, trigger);
    const fresh = matched.filter((name) => !injected.has(name));
    if (fresh.length === 0) return;

    const blocks: Array<{ type: "text"; text: string }> = [];
    for (const name of fresh) {
      const source = skillSources.get(name);
      if (!source) {
        process.stderr.write(`[skill-rules] skill not found: ${name}\n`);
        continue;
      }
      try {
        const body = stripFrontmatter(
          readFileSync(source.filePath, "utf-8"),
        ).trim();
        injected.add(name);
        blocks.push({
          type: "text",
          text: `<skill name="${name}">\n${body}\n</skill>`,
        });
      } catch (err) {
        process.stderr.write(
          `[skill-rules] failed to read ${source.filePath}: ${msg(err)}\n`,
        );
      }
    }

    if (blocks.length === 0) return;
    return { content: [...blocks, ...event.content] };
  });

  pi.registerCommand("skill-rules", {
    description: "skill-rules — path-triggered skill injection diagnostics",
    handler: async (_args, ctx) => {
      const lines = [
        `skill-rules: ${rules.length} rule(s), ${skillSources.size} skill(s) available`,
        ...rules.map(
          (r) =>
            `  ${r.skills.join(", ")} on ${r.on.join(", ")} for ${r.paths.join(", ")}`,
        ),
      ];
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });
}

// --- Trigger detection ---

function triggerFor(event: ToolResultEvent): Trigger | undefined {
  if (isReadToolResult(event)) return "read";
  if (isEditToolResult(event)) return "edit";
  if (isWriteToolResult(event)) return "write";
  return undefined;
}

// --- Config loading ---

function loadRules(cwd: string): SkillRule[] {
  return [
    path.join(homedir(), ".pi", "agent", CONFIG_NAME),
    path.join(cwd, ".pi", CONFIG_NAME),
  ].flatMap((p) => loadRulesFile(p));
}

function loadRulesFile(configPath: string): SkillRule[] {
  if (!existsSync(configPath)) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (err) {
    process.stderr.write(
      `[skill-rules] ${configPath}: bad JSON: ${msg(err)}\n`,
    );
    return [];
  }

  const raw = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        Array.isArray((parsed as any).rules)
      ? (parsed as any).rules
      : null;

  if (!raw) {
    process.stderr.write(
      `[skill-rules] ${configPath}: expected array of rules\n`,
    );
    return [];
  }

  const rules: SkillRule[] = [];
  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      process.stderr.write(
        `[skill-rules] ${configPath}#${i}: rule must be an object\n`,
      );
      continue;
    }

    const skills = toStringList(entry.skills ?? entry.skill);
    const paths = toStringList(entry.paths);
    const on = toTriggerList(entry.on);

    if (skills.length === 0) {
      process.stderr.write(
        `[skill-rules] ${configPath}#${i}: missing skill(s)\n`,
      );
      continue;
    }
    if (paths.length === 0) {
      process.stderr.write(`[skill-rules] ${configPath}#${i}: missing paths\n`);
      continue;
    }

    rules.push({ skills, paths, on });
  }
  return rules;
}

function toStringList(value: unknown): string[] {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];
  return [
    ...new Set(
      items
        .filter((v): v is string => typeof v === "string")
        .flatMap((v) => v.split(","))
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}

function toTriggerList(value: unknown): Trigger[] {
  if (value === undefined) return [...DEFAULT_ON];
  return [
    ...new Set(
      toStringList(value).filter((t): t is Trigger =>
        VALID_TRIGGERS.has(t as Trigger),
      ),
    ),
  ];
}

// --- Skill discovery ---

function discoverSkills(cwd: string): Map<string, SkillSource> {
  const sources = new Map<string, SkillSource>();
  try {
    const { skills } = loadSkills({
      cwd,
      agentDir: getAgentDir(),
      skillPaths: [],
      includeDefaults: true,
    });
    for (const s of skills) {
      sources.set(s.name, { name: s.name, filePath: s.filePath });
    }
  } catch (err) {
    process.stderr.write(
      `[skill-rules] failed to discover skills: ${msg(err)}\n`,
    );
  }
  return sources;
}

// --- Path matching ---

function matchSkills(
  rules: SkillRule[],
  relPath: string,
  trigger: Trigger,
): string[] {
  const names: string[] = [];
  for (const rule of rules) {
    if (!rule.on.includes(trigger)) continue;
    if (rule.paths.some((pattern) => globMatch(pattern, relPath))) {
      names.push(...rule.skills);
    }
  }
  return [...new Set(names)];
}

function globMatch(pattern: string, filePath: string): boolean {
  const p = normalizePattern(pattern);
  return globToRegExp(p).test(filePath);
}

function normalizePattern(pattern: string): string {
  let p = pattern.trim().replaceAll("\\", "/");
  while (p.startsWith("./")) p = p.slice(2);
  while (p.startsWith("/")) p = p.slice(1);
  // Expand `**.ext` to `**/*.ext` so `app/controllers/**.rb` works intuitively
  p = p.replace(/\*\*(\.\w)/g, "**/*$1");
  return p;
}

function globToRegExp(pattern: string): RegExp {
  let re = "^";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*" && pattern[i + 1] === "*") {
      re += pattern[i + 2] === "/" ? "(?:.*/)?" : ".*";
      i += pattern[i + 2] === "/" ? 2 : 1;
    } else if (ch === "*") {
      re += "[^/]*";
    } else if (ch === "?") {
      re += "[^/]";
    } else {
      re += ch.replace(/[|\\{}()[\]^$+?.]/, "\\$&");
    }
  }
  return new RegExp(re + "$");
}

// --- Helpers ---

function toRelativePosix(abs: string, cwd: string): string | undefined {
  const rel = path.relative(cwd, abs);
  if (!rel || rel === ".." || rel.startsWith(`..${path.sep}`)) return undefined;
  return rel.split(path.sep).join("/");
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
