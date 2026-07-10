#!/usr/bin/env bash

set -euo pipefail

readonly DEFAULT_BORDER_COLOR="#3b3d52"

work=""
cleanup() {
  [[ -n "$work" ]] && rm -rf "$work"
}

function main() {
  local input="" output=""
  local crop=false fuzz=8
  local bg="auto" padding=0
  local radius=0 border=0 border_color="$DEFAULT_BORDER_COLOR"
  local size=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --*=*)
      local pair="$1"
      shift
      set -- "${pair%%=*}" "${pair#*=}" "$@"
      ;;
    --crop)
      crop=true
      shift
      ;;
    --fuzz)
      fuzz="${2:?Error: --fuzz requires a value}"
      shift 2
      ;;
    --bg)
      bg="${2:?Error: --bg requires a value}"
      shift 2
      ;;
    --padding)
      padding="${2:?Error: --padding requires a value}"
      shift 2
      ;;
    --border-radius)
      radius="${2:?Error: --border-radius requires a value}"
      shift 2
      ;;
    --border)
      border="${2:?Error: --border requires a value}"
      shift 2
      ;;
    --border-color)
      border_color="${2:?Error: --border-color requires a value}"
      shift 2
      ;;
    --size)
      size="${2:?Error: --size requires a value}"
      shift 2
      ;;
    -*)
      die "Unknown option: $1"
      ;;
    *)
      if [[ -z "$input" ]]; then
        input="$1"
      elif [[ -z "$output" ]]; then
        output="$1"
      else
        die "Unexpected argument: $1"
      fi
      shift
      ;;
    esac
  done

  [[ -n "$input" && -n "$output" ]] || {
    usage
    exit 1
  }
  command -v magick >/dev/null 2>&1 || die "magick (ImageMagick) is required but not installed"
  [[ -f "$input" ]] || die "input not found: $input"

  work="$(mktemp -d)"
  trap cleanup EXIT
  local img="$work/img.png"
  cp "$input" "$img"

  if [[ "$crop" == true ]]; then
    crop_to_content "$img" "$fuzz"
  fi

  [[ "$bg" == "auto" ]] && bg="$(sample_bg "$img")"

  if [[ "$padding" -gt 0 ]]; then
    magick "$img" -bordercolor "$bg" -border "$padding" "$img"
  fi

  if [[ "$radius" -gt 0 ]]; then
    round_corners "$img" "$radius"
  fi

  if [[ "$border" -gt 0 ]]; then
    stroke_border "$img" "$border" "$border_color" "$radius"
  fi

  if [[ -n "$size" ]]; then
    magick "$img" -resize "${size}>" -background "$bg" -gravity center -extent "$size" "$img"
  fi

  cp "$img" "$output"
  echo "wrote $output ($(dims "$output"), bg $bg)"
}

# Trim the surrounding background so the image is cropped to its content.
crop_to_content() {
  local img="$1" fuzz="$2" corner bbox
  corner="$(magick "$img" -format "%[pixel:p{2,2}]" info:)"
  bbox="$(magick "$img" -bordercolor "$corner" -border 1 -fuzz "${fuzz}%" -format "%@" info:)"
  magick "$img" -crop "$bbox" +repage "$img"
}

# Sample the center pixel: framed images have transparent corners, and a
# corner sample would pick that up instead of the real background.
sample_bg() {
  local img="$1" w h
  read -r w h <<<"$(dims_wh "$img")"
  magick "$img" -format "%[pixel:p{$((w / 2)),$((h / 2))}]" info:
}

# Keep only the pixels inside a rounded rectangle; outside becomes transparent.
round_corners() {
  local img="$1" radius="$2" w h
  read -r w h <<<"$(dims_wh "$img")"
  magick "$img" -alpha set \
    \( +clone -alpha transparent -background none -fill white \
    -draw "roundrectangle 0,0,$((w - 1)),$((h - 1)),$radius,$radius" \) \
    -compose DstIn -composite "$img"
}

# Stroke a rectangle just inside the edge so the whole border stays visible.
stroke_border() {
  local img="$1" width="$2" color="$3" radius="$4" w h off
  read -r w h <<<"$(dims_wh "$img")"
  off="$(((width + 1) / 2))"
  magick "$img" -fill none -stroke "$color" -strokewidth "$width" \
    -draw "roundrectangle $off,$off,$((w - 1 - off)),$((h - 1 - off)),$radius,$radius" \
    "$img"
}

dims() {
  magick "$1" -format "%wx%h" info:
}

dims_wh() {
  magick "$1" -format "%w %h" info:
}

usage() {
  cat <<EOF
Usage: $(basename "$0") INPUT OUTPUT [OPTIONS]

Frame an image with ImageMagick: crop to content, pad, round the corners, add a
border, and/or fit it onto a fixed canvas. Steps run in that order; each is
opt-in, so the same script frames a README screenshot or resizes any image.

Options:
  --crop                 Trim the surrounding background to the content bbox.
  --fuzz PCT             Color tolerance for --crop (default: 8).
  --bg COLOR             Padding/canvas fill; "auto" samples the center (default: auto).
  --padding PX           Background padding added around the content (default: 0).
  --border-radius PX     Corner radius; outside the radius becomes transparent (default: 0).
  --border PX            Border stroke width (default: 0, no border).
  --border-color COLOR   Border color (default: $DEFAULT_BORDER_COLOR).
  --size WxH             Fit the result onto a WxH canvas, centered on --bg.
  -h, --help             Show this help.

Options accept either "--key value" or "--key=value".

Examples:
  # README screenshot: crop, pad, rounded corners, subtle border
  $(basename "$0") raw.png doc/assets/preview.png --crop --padding 32 --border-radius 26 --border 2

  # Fit any image onto a solid 1280x640 canvas
  $(basename "$0") logo.png card.png --size 1280x640 --bg '#1a1b26'
EOF
}

die() {
  echo "Error: $1" >&2
  exit "${2:-1}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
