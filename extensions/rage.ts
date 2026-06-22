import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

type Severity = "mild" | "moderate" | "strong";

interface RageMatch {
  word: string;
  index: number;
  severity: Severity;
  group: string;
}

interface WordEntry {
  word: string;
  severity: Severity;
  group: string;
}

const STATUS_KEY = "rage";
const ICON = "󰈸";

var WORDLIST = [
  // === FUCK family (strong) ===
  // Canonical forms
  { word: "fuck", severity: "strong", group: "fuck" },
  { word: "fucking", severity: "strong", group: "fuck" },
  { word: "fucked", severity: "strong", group: "fuck" },
  { word: "fucker", severity: "strong", group: "fuck" },
  { word: "fuckin", severity: "strong", group: "fuck" },
  { word: "fucks", severity: "strong", group: "fuck" },
  // Compound words
  { word: "motherfucker", severity: "strong", group: "fuck" },
  { word: "motherfucking", severity: "strong", group: "fuck" },
  { word: "mothafucka", severity: "strong", group: "fuck" },
  { word: "fuckup", severity: "strong", group: "fuck" },
  { word: "fuckoff", severity: "strong", group: "fuck" },
  { word: "clusterfuck", severity: "strong", group: "fuck" },
  { word: "fuckwit", severity: "strong", group: "fuck" },
  { word: "fucktard", severity: "strong", group: "fuck" },
  { word: "fuckface", severity: "strong", group: "fuck" },
  { word: "fuckhead", severity: "strong", group: "fuck" },
  // Typos — transpositions
  { word: "fukc", severity: "strong", group: "fuck" },
  { word: "fukcing", severity: "strong", group: "fuck" },
  { word: "fukced", severity: "strong", group: "fuck" },
  { word: "fukcer", severity: "strong", group: "fuck" },
  { word: "fcuk", severity: "strong", group: "fuck" },
  { word: "fcuking", severity: "strong", group: "fuck" },
  { word: "fcuked", severity: "strong", group: "fuck" },
  { word: "fuk", severity: "strong", group: "fuck" },
  { word: "fuking", severity: "strong", group: "fuck" },
  { word: "fuked", severity: "strong", group: "fuck" },
  { word: "fuker", severity: "strong", group: "fuck" },
  { word: "fuxk", severity: "strong", group: "fuck" },
  { word: "fuxking", severity: "strong", group: "fuck" },
  // === SHIT family (strong) ===
  { word: "shit", severity: "strong", group: "shit" },
  { word: "shitty", severity: "strong", group: "shit" },
  { word: "shitting", severity: "strong", group: "shit" },
  { word: "shits", severity: "strong", group: "shit" },
  { word: "shitted", severity: "strong", group: "shit" },
  // Compound words
  { word: "bullshit", severity: "strong", group: "shit" },
  { word: "horseshit", severity: "strong", group: "shit" },
  { word: "dipshit", severity: "strong", group: "shit" },
  { word: "shitshow", severity: "strong", group: "shit" },
  { word: "shithead", severity: "strong", group: "shit" },
  { word: "shithole", severity: "strong", group: "shit" },
  { word: "shitface", severity: "strong", group: "shit" },
  { word: "shitfaced", severity: "strong", group: "shit" },
  { word: "shitstain", severity: "strong", group: "shit" },
  { word: "shitbag", severity: "strong", group: "shit" },
  // Typos
  { word: "hsit", severity: "strong", group: "shit" },
  { word: "siht", severity: "strong", group: "shit" },
  { word: "shti", severity: "strong", group: "shit" },
  { word: "sjit", severity: "strong", group: "shit" },
  { word: "shjt", severity: "strong", group: "shit" },
  { word: "bulshit", severity: "strong", group: "shit" },
  { word: "bullsht", severity: "strong", group: "shit" },
  // === ASS family (moderate) ===
  { word: "ass", severity: "moderate", group: "ass" },
  { word: "asses", severity: "moderate", group: "ass" },
  // Compound words (these are strong)
  { word: "asshole", severity: "strong", group: "ass" },
  { word: "assholes", severity: "strong", group: "ass" },
  { word: "jackass", severity: "strong", group: "ass" },
  { word: "dumbass", severity: "strong", group: "ass" },
  { word: "fatass", severity: "moderate", group: "ass" },
  { word: "asshat", severity: "strong", group: "ass" },
  { word: "asswipe", severity: "strong", group: "ass" },
  { word: "badass", severity: "mild", group: "ass" },
  // === DAMN family (moderate) ===
  { word: "damn", severity: "moderate", group: "damn" },
  { word: "damned", severity: "moderate", group: "damn" },
  { word: "damnit", severity: "moderate", group: "damn" },
  { word: "dammit", severity: "moderate", group: "damn" },
  { word: "goddamn", severity: "moderate", group: "damn" },
  { word: "goddamnit", severity: "moderate", group: "damn" },
  { word: "goddammit", severity: "moderate", group: "damn" },
  // === BITCH family (strong) ===
  { word: "bitch", severity: "strong", group: "bitch" },
  { word: "bitches", severity: "strong", group: "bitch" },
  { word: "bitching", severity: "strong", group: "bitch" },
  { word: "bitchy", severity: "strong", group: "bitch" },
  { word: "bitchass", severity: "strong", group: "bitch" },
  // === BASTARD (strong) ===
  { word: "bastard", severity: "strong", group: "bastard" },
  { word: "bastards", severity: "strong", group: "bastard" },
  // === PISS family (moderate) ===
  { word: "piss", severity: "moderate", group: "piss" },
  { word: "pissed", severity: "moderate", group: "piss" },
  { word: "pissing", severity: "moderate", group: "piss" },
  { word: "pissoff", severity: "moderate", group: "piss" },
  // === DICK (moderate) ===
  { word: "dick", severity: "moderate", group: "dick" },
  { word: "dickhead", severity: "strong", group: "dick" },
  // === CRAP (moderate) ===
  { word: "crap", severity: "moderate", group: "crap" },
  { word: "crappy", severity: "moderate", group: "crap" },
  { word: "crapping", severity: "moderate", group: "crap" },
  // === HELL (mild) ===
  { word: "hell", severity: "mild", group: "hell" },
  // === Abbreviations (mild) ===
  { word: "wtf", severity: "mild", group: "wtf" },
  { word: "stfu", severity: "mild", group: "stfu" },
  { word: "lmfao", severity: "mild", group: "lmfao" },
  { word: "lmao", severity: "mild", group: "lmao" },
  // === CUNT (strong) ===
  { word: "cunt", severity: "strong", group: "cunt" },
  { word: "cunts", severity: "strong", group: "cunt" },
] satisfies WordEntry[];
function collapseRepeats(text: string) {
  return text.replace(/(.)\1+/g, "$1");
}
function buildPattern(words: WordEntry[]) {
  const sorted = [...words].sort((a, b) => b.word.length - a.word.length);
  const pattern = sorted.map((w) => w.word).join("|");
  return new RegExp(`\\b(${pattern})\\b`, "gi");
}
var DEFAULT_PATTERN = buildPattern(WORDLIST);
var WORD_MAP = new Map(WORDLIST.map((w) => [w.word.toLowerCase(), w]));
export function detect(text: string) {
  const matches: RageMatch[] = [];
  const seen = /* @__PURE__ */ new Set<number>();
  runPattern(text, text.toLowerCase(), matches, seen);
  const collapsed = collapseRepeats(text.toLowerCase());
  if (collapsed !== text.toLowerCase()) {
    runPattern(text, collapsed, matches, seen);
  }
  return { count: matches.length, matches };
}
function runPattern(
  _originalText: string,
  searchText: string,
  matches: RageMatch[],
  seen: Set<number>,
) {
  DEFAULT_PATTERN.lastIndex = 0;
  let match;
  while ((match = DEFAULT_PATTERN.exec(searchText)) !== null) {
    if (seen.has(match.index)) continue;
    const word = match[0].toLowerCase();
    const entry = WORD_MAP.get(word);
    if (!entry) continue;
    seen.add(match.index);
    matches.push({
      word,
      index: match.index,
      severity: entry.severity,
      group: entry.group,
    });
  }
}

function messageText(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  if (!("content" in message)) return null;

  const content = message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;

  const parts = content
    .filter(
      (part) =>
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string",
    )
    .map((part) => part.text);

  return parts.length > 0 ? parts.join(" ") : null;
}

function countRage(ctx: ExtensionContext): number {
  const sessionEvents = ctx.sessionManager.getBranch();
  let count = 0;

  for (const event of sessionEvents) {
    if (event.type !== "message") continue;
    if (event.message.role !== "user") continue;

    const text = messageText(event.message);
    if (!text) continue;

    count += detect(text).count;
  }

  return count;
}

function rageColor(count: number): "dim" | "warning" | "error" {
  if (count > 5) return "error";
  if (count > 1) return "warning";
  return "dim";
}

function updateStatus(ctx: ExtensionContext): void {
  const count = countRage(ctx);

  if (count === 0) {
    ctx.ui.setStatus(STATUS_KEY, undefined);
    return;
  }

  ctx.ui.setStatus(
    STATUS_KEY,
    ctx.ui.theme.fg(rageColor(count), `${ICON} ${count}`),
  );
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    updateStatus(ctx);
  });

  pi.on("message_end", async (_event, ctx) => {
    updateStatus(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    updateStatus(ctx);
  });

  pi.on("session_tree", async (_event, ctx) => {
    updateStatus(ctx);
  });

  pi.on("session_compact", async (_event, ctx) => {
    updateStatus(ctx);
  });
}
