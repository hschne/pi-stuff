import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type {
  AutocompleteItem,
  AutocompleteProvider,
} from "@earendil-works/pi-tui";

const SKILL_TOKEN_END = "(?![a-z0-9-])";
const SKILL_ALIAS_RE = new RegExp(
  `(^|\\s)\\/([a-z0-9][a-z0-9-]{0,63})${SKILL_TOKEN_END}`,
  "g",
);
// Keep leading `/` under Pi's native slash-command autocomplete; inline
// aliases are suggested after whitespace.
const SKILL_AUTOCOMPLETE_RE = /[ \t](\/[a-z0-9-]*)$/;
const SKILL_AUTOCOMPLETE_STOP_RE = /[ \t]\/[a-z0-9-]*[ \t]$/;
const MAX_AUTOCOMPLETE_ITEMS = 20;

type PiCommand = ReturnType<ExtensionAPI["getCommands"]>[number];

function skillName(command: PiCommand): string | undefined {
  if (command.source !== "skill") return undefined;

  const name = command.name.startsWith("skill:")
    ? command.name.slice("skill:".length)
    : command.name;
  return name || undefined;
}

export function getSkillNames(pi: ExtensionAPI): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const command of pi.getCommands()) {
    const name = skillName(command);
    if (!name || seen.has(name)) continue;

    seen.add(name);
    names.push(name);
  }

  return names;
}

function skillAutocompleteItems(
  pi: ExtensionAPI,
  query: string,
): AutocompleteItem[] {
  const seen = new Set<string>();
  const items: AutocompleteItem[] = [];

  for (const command of pi.getCommands()) {
    const name = skillName(command);
    if (!name || seen.has(name) || !name.startsWith(query)) continue;

    seen.add(name);
    items.push({
      value: `/${name}`,
      label: `/${name}`,
      ...(command.description ? { description: command.description } : {}),
    });
    if (items.length === MAX_AUTOCOMPLETE_ITEMS) break;
  }

  return items;
}

export function createSkillAutocompleteProvider(
  pi: ExtensionAPI,
  current: AutocompleteProvider,
): AutocompleteProvider {
  return {
    triggerCharacters: ["/"],

    async getSuggestions(lines, cursorLine, cursorCol, options) {
      const beforeCursor = (lines[cursorLine] ?? "").slice(0, cursorCol);

      if (!options.force && SKILL_AUTOCOMPLETE_STOP_RE.test(beforeCursor)) {
        return null;
      }

      const prefix = beforeCursor.match(SKILL_AUTOCOMPLETE_RE)?.[1];
      if (!prefix) {
        return current.getSuggestions(lines, cursorLine, cursorCol, options);
      }

      const items = skillAutocompleteItems(pi, prefix.slice(1));
      if (items.length === 0) {
        return current.getSuggestions(lines, cursorLine, cursorCol, options);
      }

      return { prefix, items };
    },

    applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
      return current.applyCompletion(
        lines,
        cursorLine,
        cursorCol,
        item,
        prefix,
      );
    },

    shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
      return (
        current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ??
        true
      );
    },
  };
}

export function referencedSkills(
  text: string,
  knownSkillNames: ReadonlySet<string>,
): string[] {
  const names: string[] = [];

  for (const match of text.matchAll(SKILL_ALIAS_RE)) {
    const name = match[2];
    if (name && knownSkillNames.has(name) && !names.includes(name)) {
      names.push(name);
    }
  }

  return names;
}

export default function inlineSkill(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    ctx.ui.addAutocompleteProvider((current) =>
      createSkillAutocompleteProvider(pi, current),
    );
  });

  pi.on("input", (event) => {
    if (event.source === "extension" || !event.text.includes("/")) {
      return { action: "continue" };
    }

    // Keep Pi's leading slash-command namespace entirely native.
    if (event.text.trimStart().startsWith("/")) {
      return { action: "continue" };
    }

    const names = referencedSkills(event.text, new Set(getSkillNames(pi)));
    if (names.length !== 1) return { action: "continue" };

    return { action: "transform", text: `/skill:${names[0]} ${event.text}` };
  });
}
