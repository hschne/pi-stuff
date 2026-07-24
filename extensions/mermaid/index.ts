import { createHash } from "node:crypto";

import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import {
  Container,
  getCapabilities,
  Image,
  Spacer,
  Text,
} from "@earendil-works/pi-tui";
import { renderMermaidASCII } from "beautiful-mermaid";
import { Type } from "@sinclair/typebox";

import { renderDiagram, type DiagramColors } from "./render.js";
import { supportsTmuxKittyImages, TmuxKittyImage } from "./tmux-kitty-image.js";

const CUSTOM_TYPE = "mermaid-diagram";
const MAX_SOURCE_LINES = 400;
const MAX_SOURCE_CHARS = 20_000;
const RENDER_MERMAID_PARAMS = Type.Object({
  source: Type.String({
    description: "Mermaid source without Markdown fences.",
    minLength: 1,
    maxLength: MAX_SOURCE_CHARS,
  }),
});

interface MermaidDetails {
  source: string;
  hash: string;
  index: number;
}

function hashSource(source: string): string {
  return createHash("sha256").update(source).digest("hex").slice(0, 8);
}

function ansi256ToHex(index: number): string {
  const basic = [
    "#000000",
    "#800000",
    "#008000",
    "#808000",
    "#000080",
    "#800080",
    "#008080",
    "#c0c0c0",
    "#808080",
    "#ff0000",
    "#00ff00",
    "#ffff00",
    "#0000ff",
    "#ff00ff",
    "#00ffff",
    "#ffffff",
  ];
  if (index < basic.length) return basic[index];
  if (index >= 232) {
    const value = Math.min(255, 8 + (index - 232) * 10);
    const hex = value.toString(16).padStart(2, "0");
    return `#${hex}${hex}${hex}`;
  }

  const value = index - 16;
  const channel = (part: number) =>
    (part === 0 ? 0 : 55 + part * 40).toString(16).padStart(2, "0");
  return `#${channel(Math.floor(value / 36))}${channel(Math.floor((value % 36) / 6))}${channel(value % 6)}`;
}

function ansiToHex(ansi: string, fallback: string): string {
  const rgb = ansi.match(/(?:38|48);2;(\d+);(\d+);(\d+)m/);
  if (rgb) {
    return `#${rgb
      .slice(1)
      .map((part) => Number(part).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  const indexed = ansi.match(/(?:38|48);5;(\d+)m/);
  return indexed ? ansi256ToHex(Number(indexed[1])) : fallback;
}

function diagramColors(theme: Theme): DiagramColors {
  return {
    bg: ansiToHex(theme.getBgAnsi("customMessageBg"), "#0d1117"),
    fg: ansiToHex(theme.getFgAnsi("customMessageText"), "#e6edf3"),
    accent: ansiToHex(theme.getFgAnsi("accent"), "#4493f8"),
    muted: ansiToHex(theme.getFgAnsi("muted"), "#8b949e"),
    border: ansiToHex(theme.getFgAnsi("border"), "#30363d"),
  };
}

function renderSource(source: string): Text {
  const markdownTheme = getMarkdownTheme();
  const highlighted = markdownTheme.highlightCode?.(source, "mermaid");
  const lines = highlighted ?? source.split("\n").map(markdownTheme.codeBlock);
  return new Text(
    [
      markdownTheme.codeBlockBorder("```mermaid"),
      ...lines.map((line) => `  ${line}`),
      markdownTheme.codeBlockBorder("```"),
    ].join("\n"),
    0,
    0,
  );
}

interface MermaidRenderState {
  image?: TmuxKittyImage;
  imageKey?: string;
}

function buildDiagramComponent(
  details: MermaidDetails,
  expanded: boolean,
  theme: Theme,
  state?: MermaidRenderState,
): Container {
  const container = new Container();
  const suffix = details.index > 1 ? ` ${details.index}` : "";
  container.addChild(
    new Text(
      theme.fg(
        "customMessageLabel",
        theme.bold(`Mermaid${suffix} · ${details.hash}`),
      ),
      0,
      0,
    ),
  );
  container.addChild(new Spacer(1));

  try {
    const colors = diagramColors(theme);
    const diagram = renderDiagram(details.source, colors);
    if (supportsTmuxKittyImages()) {
      const imageKey = `${details.hash}:${JSON.stringify(colors)}`;
      if (!state?.image || state.imageKey !== imageKey) {
        state?.image?.dispose();
        const image = new TmuxKittyImage(diagram.data, {
          widthPx: diagram.widthPx,
          heightPx: diagram.heightPx,
        });
        if (state) {
          state.image = image;
          state.imageKey = imageKey;
        }
        container.addChild(image);
      } else {
        container.addChild(state.image);
      }
    } else if (getCapabilities().images) {
      container.addChild(
        new Image(
          diagram.data,
          "image/png",
          { fallbackColor: (text) => theme.fg("muted", text) },
          { maxWidthCells: 100, maxHeightCells: 40 },
          { widthPx: diagram.widthPx, heightPx: diagram.heightPx },
        ),
      );
    } else {
      container.addChild(
        new Text(
          theme.fg("toolOutput", renderMermaidASCII(details.source)),
          0,
          0,
        ),
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    container.addChild(
      new Text(theme.fg("error", `Mermaid render failed: ${message}`), 0, 0),
    );
  }

  if (expanded) {
    container.addChild(new Spacer(1));
    container.addChild(renderSource(details.source));
  }

  return container;
}

export default function mermaidExtension(pi: ExtensionAPI): void {
  pi.registerMessageRenderer<MermaidDetails>(
    CUSTOM_TYPE,
    (message, { expanded }, theme) => {
      const details = message.details;
      if (!details?.source) return new Text(String(message.content), 1, 0);
      return buildDiagramComponent(details, expanded, theme);
    },
  );

  pi.registerTool<
    typeof RENDER_MERMAID_PARAMS,
    MermaidDetails,
    MermaidRenderState
  >({
    name: "render_mermaid",
    label: "Render Mermaid",
    description:
      "Render Mermaid source as a themed inline diagram. Use this whenever you create a Mermaid diagram for the user.",
    promptSnippet:
      "render_mermaid — render Mermaid source as an inline diagram",
    promptGuidelines: [
      "Call render_mermaid whenever your response contains a Mermaid diagram so the user sees the rendered diagram, not only its source.",
      "Pass only the Mermaid source without Markdown fences.",
    ],
    parameters: RENDER_MERMAID_PARAMS,
    renderShell: "self",
    async execute(_toolCallId, { source }, _signal, _onUpdate, context) {
      const lineCount = source.split(/\r?\n/).length;
      if (lineCount > MAX_SOURCE_LINES) {
        throw new Error(`Mermaid source exceeds ${MAX_SOURCE_LINES} lines`);
      }

      renderDiagram(source, diagramColors(context.ui.theme));
      const hash = hashSource(source);
      return {
        content: [{ type: "text", text: `Rendered Mermaid diagram ${hash}.` }],
        details: { source, hash, index: 1 },
      };
    },
    renderCall() {
      return { render: () => [], invalidate() {} };
    },
    renderResult(result, { expanded }, theme, context) {
      if (!result.details?.source) {
        return new Text(theme.fg("error", "Mermaid render failed"), 0, 0);
      }
      return buildDiagramComponent(
        result.details,
        expanded,
        theme,
        context.state,
      );
    },
  });
}
