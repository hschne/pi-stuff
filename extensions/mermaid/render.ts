import { Resvg } from "@resvg/resvg-js";
import { renderMermaidSVG } from "beautiful-mermaid";

export interface DiagramColors {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
  border: string;
}

export interface RenderedDiagram {
  data: string;
  widthPx: number;
  heightPx: number;
}

const MAX_RENDER_WIDTH = 1600;
const CACHE_LIMIT = 64;
const cache = new Map<string, RenderedDiagram>();

function mix(foreground: string, background: string, percent: number): string {
  const parse = (color: string) => [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
  const fg = parse(foreground);
  const bg = parse(background);
  const weight = percent / 100;
  return `#${fg
    .map((channel, index) =>
      Math.round(channel * weight + bg[index] * (1 - weight))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Resolve CSS variables that resvg otherwise rasterizes as black. */
export function resolveSvgColors(svg: string, colors: DiagramColors): string {
  const values: Record<string, string> = {
    bg: colors.bg,
    fg: colors.fg,
    line: colors.muted,
    accent: colors.accent,
    muted: colors.muted,
    surface: mix(colors.fg, colors.bg, 3),
    border: colors.border,
    _text: colors.fg,
    "_text-sec": colors.muted,
    "_text-muted": colors.muted,
    "_text-faint": mix(colors.fg, colors.bg, 25),
    _line: colors.muted,
    _arrow: colors.accent,
    "_node-fill": mix(colors.fg, colors.bg, 3),
    "_node-stroke": colors.border,
    "_group-fill": colors.bg,
    "_group-hdr": mix(colors.fg, colors.bg, 5),
    "_inner-stroke": mix(colors.fg, colors.bg, 12),
    "_key-badge": mix(colors.fg, colors.bg, 10),
  };

  return svg.replace(
    /var\(--([\w-]+)\)/g,
    (reference, name: string) => values[name] ?? reference,
  );
}

function cacheResult(key: string, value: RenderedDiagram): RenderedDiagram {
  cache.delete(key);
  cache.set(key, value);

  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }

  return value;
}

export function renderDiagram(
  source: string,
  colors: DiagramColors,
): RenderedDiagram {
  const key = `${JSON.stringify(colors)}\0${source}`;
  const cached = cache.get(key);
  if (cached) return cacheResult(key, cached);

  const svg = resolveSvgColors(
    renderMermaidSVG(source, {
      bg: colors.bg,
      fg: colors.fg,
      accent: colors.accent,
      muted: colors.muted,
      border: colors.border,
      line: colors.muted,
    }),
    colors,
  );

  const rasterizer = new Resvg(svg, {
    fitTo: { mode: "width", value: MAX_RENDER_WIDTH },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: "sans-serif",
    },
    shapeRendering: 2,
    textRendering: 1,
  });
  const image = rasterizer.render();
  const result = {
    data: image.asPng().toString("base64"),
    widthPx: image.width,
    heightPx: image.height,
  };

  return cacheResult(key, result);
}
