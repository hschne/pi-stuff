#!/usr/bin/env bash
# Frame a raw screenshot for a README: crop to content, round the corners,
# and add a subtle border baked into the PNG.
#
# Usage:
#   frame-screenshot.sh <input> <output> [options]
#
# Options (all optional):
#   --bg <color>       Background color. Default: auto-detected from top-left pixel.
#   --radius <px>      Corner radius. Default: 26.
#   --border <color>   Border stroke color. Default: #3b3d52 (subtle grey).
#   --border-width <px> Border stroke width. Default: 2.
#   --pad <px>         Padding added around content before rounding. Default: 32.
#   --fuzz <pct>       Fuzz for content bounding-box detection. Default: 8.
#   --no-crop          Skip crop-to-content; frame the whole image as-is.
#
# Requires ImageMagick (magick). Corners become transparent, so the frame sits
# cleanly on any README background (GitHub light or dark).
set -euo pipefail

if [[ $# -lt 2 ]]; then
  sed -n '2,20p' "$0"
  exit 1
fi

input=$1
output=$2
shift 2

bg=""
radius=26
border="#3b3d52"
border_width=2
pad=32
fuzz=8
crop=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bg) bg=$2; shift 2 ;;
    --radius) radius=$2; shift 2 ;;
    --border) border=$2; shift 2 ;;
    --border-width) border_width=$2; shift 2 ;;
    --pad) pad=$2; shift 2 ;;
    --fuzz) fuzz=$2; shift 2 ;;
    --no-crop) crop=0; shift ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

command -v magick >/dev/null || { echo "magick (ImageMagick) not found" >&2; exit 1; }

# Auto-detect background from the top-left pixel when not given.
if [[ -z "$bg" ]]; then
  bg=$(magick "$input" -format "%[pixel:p{2,2}]" info:)
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

if [[ "$crop" == 1 ]]; then
  # Bounding box of non-background content, then crop + pad.
  bbox=$(magick "$input" -bordercolor "$bg" -border 1 -fuzz "${fuzz}%" -format "%@" info:)
  magick "$input" -crop "$bbox" +repage -bordercolor "$bg" -border "$pad" "$work/step.png"
else
  cp "$input" "$work/step.png"
fi

read -r W H <<<"$(magick "$work/step.png" -format "%w %h" info:)"

# Round corners: keep only the pixels inside a rounded rectangle mask.
magick "$work/step.png" -alpha set \
  \( +clone -alpha transparent -background none -fill white \
     -draw "roundrectangle 0,0,$((W - 1)),$((H - 1)),$radius,$radius" \) \
  -compose DstIn -composite "$work/rounded.png"

# Stroke a matching rounded rectangle on top for the border.
magick "$work/rounded.png" -fill none -stroke "$border" -strokewidth "$border_width" \
  -draw "roundrectangle 1,1,$((W - 2)),$((H - 2)),$radius,$radius" \
  "$output"

echo "wrote $output (${W}x${H}, bg $bg)"
