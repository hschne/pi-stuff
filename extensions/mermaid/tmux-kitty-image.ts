import { getCellDimensions, type Component } from "@earendil-works/pi-tui";

const PLACEHOLDER = String.fromCodePoint(0x10eeee);
const MAX_WIDTH_CELLS = 100;
const MAX_HEIGHT_CELLS = 40;
const CHUNK_SIZE = 4096;

// Kitty's row/column diacritics. Forty entries cover the component's height;
// one hundred entries cover its maximum width if explicit columns are needed.
const DIACRITICS = [
  0x0305, 0x030d, 0x030e, 0x0310, 0x0312, 0x033d, 0x033e, 0x033f, 0x0346,
  0x034a, 0x034b, 0x034c, 0x0350, 0x0351, 0x0352, 0x0353, 0x0357, 0x035b,
  0x0363, 0x0364, 0x0365, 0x0366, 0x0367, 0x0368, 0x0369, 0x036a, 0x036b,
  0x036c, 0x036d, 0x036e, 0x036f, 0x0483, 0x0484, 0x0485, 0x0486, 0x0592,
  0x0593, 0x0594, 0x0595, 0x0597, 0x0598, 0x0599, 0x059c, 0x059d, 0x059e,
  0x059f, 0x05a0, 0x05a1, 0x05a8, 0x05a9, 0x05ab, 0x05ac, 0x05af, 0x05c4,
  0x0610, 0x0611, 0x0612, 0x0613, 0x0614, 0x0615, 0x0616, 0x0617, 0x0618,
  0x0619, 0x061a, 0x064b, 0x064c, 0x064d, 0x064e, 0x064f, 0x0650, 0x0651,
  0x0652, 0x0653, 0x0654, 0x0655, 0x0656, 0x0657, 0x0658, 0x0659, 0x065a,
  0x065b, 0x065c, 0x065d, 0x065e, 0x065f, 0x0670, 0x06d6, 0x06d7, 0x06d8,
  0x06d9, 0x06da, 0x06db, 0x06dc, 0x06df, 0x06e0, 0x06e1, 0x06e2, 0x06e3,
  0x06e4,
];

let nextImageId = 1;

function allocateImageId(): number {
  const id = nextImageId;
  nextImageId = (nextImageId % 0xffffff) + 1;
  return id;
}

function wrapForTmux(sequence: string): string {
  if (!process.env.TMUX) return sequence;
  return `\x1bPtmux;${sequence.replaceAll("\x1b", "\x1b\x1b")}\x1b\\`;
}

function sendKittyCommand(command: string): void {
  process.stdout.write(wrapForTmux(command));
}

function transmit(
  data: string,
  imageId: number,
  columns: number,
  rows: number,
): void {
  if (data.length <= CHUNK_SIZE) {
    sendKittyCommand(
      `\x1b_Ga=T,U=1,f=100,i=${imageId},c=${columns},r=${rows},q=2;${data}\x1b\\`,
    );
    return;
  }

  let offset = 0;
  let first = true;
  while (offset < data.length) {
    const chunk = data.slice(offset, offset + CHUNK_SIZE);
    const last = offset + CHUNK_SIZE >= data.length;
    const header = first
      ? `a=T,U=1,f=100,i=${imageId},c=${columns},r=${rows},q=2,m=1`
      : `m=${last ? 0 : 1},q=2`;
    sendKittyCommand(`\x1b_G${header};${chunk}\x1b\\`);
    first = false;
    offset += CHUNK_SIZE;
  }
}

function deleteImage(imageId: number): void {
  sendKittyCommand(`\x1b_Ga=d,d=I,i=${imageId},q=2\x1b\\`);
}

function imageCellSize(
  dimensions: { widthPx: number; heightPx: number },
  maxWidth: number,
  maxHeight: number,
): { columns: number; rows: number } {
  const cells = getCellDimensions();
  const widthScale = (maxWidth * cells.widthPx) / dimensions.widthPx;
  const heightScale = (maxHeight * cells.heightPx) / dimensions.heightPx;
  const scale = Math.min(widthScale, heightScale);
  return {
    columns: Math.max(
      1,
      Math.min(
        maxWidth,
        Math.ceil((dimensions.widthPx * scale) / cells.widthPx),
      ),
    ),
    rows: Math.max(
      1,
      Math.min(
        maxHeight,
        Math.ceil((dimensions.heightPx * scale) / cells.heightPx),
      ),
    ),
  };
}

function placeholderRow(imageId: number, row: number, columns: number): string {
  const r = (imageId >> 16) & 0xff;
  const g = (imageId >> 8) & 0xff;
  const b = imageId & 0xff;
  const color = `\x1b[38;2;${r};${g};${b}m`;
  const rowMark = String.fromCodePoint(DIACRITICS[row] ?? DIACRITICS[0]);
  const columnMark = String.fromCodePoint(DIACRITICS[0]);
  return `${color}${PLACEHOLDER}${rowMark}${columnMark}${PLACEHOLDER.repeat(columns - 1)}\x1b[39m`;
}

export function supportsTmuxKittyImages(): boolean {
  if (!process.env.TMUX) return false;
  const terminal = process.env.TERM_PROGRAM?.toLowerCase();
  return Boolean(
    process.env.KITTY_WINDOW_ID ||
    process.env.GHOSTTY_RESOURCES_DIR ||
    process.env.WEZTERM_PANE ||
    terminal === "kitty" ||
    terminal === "ghostty" ||
    terminal === "wezterm",
  );
}

export class TmuxKittyImage implements Component {
  private readonly data: string;
  private readonly dimensions: { widthPx: number; heightPx: number };
  private imageId?: number;
  private cachedWidth?: number;
  private cachedLines?: string[];

  constructor(data: string, dimensions: { widthPx: number; heightPx: number }) {
    this.data = data;
    this.dimensions = dimensions;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }

  dispose(): void {
    if (this.imageId !== undefined) deleteImage(this.imageId);
    this.imageId = undefined;
  }

  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) return this.cachedLines;

    if (this.imageId !== undefined) deleteImage(this.imageId);
    const imageId = allocateImageId();
    this.imageId = imageId;

    const size = imageCellSize(
      this.dimensions,
      Math.max(1, Math.min(width - 2, MAX_WIDTH_CELLS)),
      MAX_HEIGHT_CELLS,
    );
    transmit(this.data, imageId, size.columns, size.rows);

    this.cachedWidth = width;
    this.cachedLines = Array.from({ length: size.rows }, (_, row) =>
      placeholderRow(imageId, row, size.columns),
    );
    return this.cachedLines;
  }
}
