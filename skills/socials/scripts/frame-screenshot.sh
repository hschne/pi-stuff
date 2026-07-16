#!/usr/bin/env bash

set -euo pipefail

readonly CANVAS_WIDTH=2400
readonly CANVAS_HEIGHT=1350
readonly MAX_PANEL_WIDTH=2100
readonly MAX_PANEL_HEIGHT=1050
readonly CORNER_RADIUS=38

function main() {
  local input=""
  local output=""
  local gradient_from="#3d59a1"
  local gradient_to="#414868"

  while [[ $# -gt 0 ]]; do
    case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    -o | --output)
      [[ $# -ge 2 ]] || die "--output requires a path"
      output="$2"
      shift 2
      ;;
    --from)
      [[ $# -ge 2 ]] || die "--from requires a color"
      gradient_from="$2"
      shift 2
      ;;
    --to)
      [[ $# -ge 2 ]] || die "--to requires a color"
      gradient_to="$2"
      shift 2
      ;;
    -*)
      die "Unknown option: $1"
      ;;
    *)
      [[ -z "$input" ]] || die "Only one input image is supported"
      input="$1"
      shift
      ;;
    esac
  done

  [[ -n "$input" ]] || die "Input image is required"
  [[ -f "$input" ]] || die "Input image not found: $input"
  command -v magick >/dev/null 2>&1 || die "ImageMagick's magick command is required"

  if [[ -z "$output" ]]; then
    output="${input%.*}-social.png"
  fi

  frame_screenshot "$input" "$output" "$gradient_from" "$gradient_to"
  printf '%s\n' "$output"
}

frame_screenshot() {
  local input="$1"
  local output="$2"
  local gradient_from="$3"
  local gradient_to="$4"
  local tmpdir
  local dimensions
  local panel_width
  local panel_height
  local panel_x
  local panel_y
  local shadow_x
  local shadow_y

  tmpdir="$(mktemp -d)"
  trap "rm -rf '$tmpdir'" EXIT

  mkdir -p "$(dirname "$output")"
  magick "$input" -resize "${MAX_PANEL_WIDTH}x${MAX_PANEL_HEIGHT}" "$tmpdir/capture.png"

  dimensions="$(magick identify -format '%w %h' "$tmpdir/capture.png")"
  read -r panel_width panel_height <<<"$dimensions"
  panel_x=$(((CANVAS_WIDTH - panel_width) / 2))
  panel_y=$(((CANVAS_HEIGHT - panel_height) / 2))
  shadow_x=$((panel_x - 32))
  shadow_y=$((panel_y - 42))

  magick -size "${panel_width}x${panel_height}" xc:none \
    -fill white \
    -draw "roundrectangle 0,0,$((panel_width - 1)),$((panel_height - 1)),${CORNER_RADIUS},${CORNER_RADIUS}" \
    "$tmpdir/mask.png"

  magick "$tmpdir/capture.png" "$tmpdir/mask.png" \
    -alpha off -compose CopyOpacity -composite "$tmpdir/panel.png"

  magick -size "${CANVAS_HEIGHT}x${CANVAS_WIDTH}" \
    "gradient:${gradient_from}-${gradient_to}" -rotate 90 \
    "$tmpdir/background.png"

  magick "$tmpdir/mask.png" -background '#10131f' -shadow 42x32+0+24 \
    "$tmpdir/shadow.png"

  magick "$tmpdir/background.png" \
    "$tmpdir/shadow.png" -geometry "+${shadow_x}+${shadow_y}" -compose over -composite \
    "$tmpdir/panel.png" -geometry "+${panel_x}+${panel_y}" -compose over -composite \
    -strip "$output"

  [[ "$(magick identify -format '%m %w %h' "$output")" == "PNG ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" ]] || \
    die "Output validation failed: $output"

  rm -rf "$tmpdir"
  trap - EXIT
}

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS] INPUT.png

Frame a screenshot as a 2400x1350 social-media image.

Options:
  -o, --output PATH  Output path
      --from COLOR   Gradient start color (default: #3d59a1)
      --to COLOR     Gradient end color (default: #414868)
  -h, --help         Show this help message
EOF
}

die() {
  echo "Error: $1" >&2
  exit "${2:-1}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
