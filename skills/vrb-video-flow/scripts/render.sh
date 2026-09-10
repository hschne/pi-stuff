#!/usr/bin/env bash

set -euo pipefail

readonly DEFAULT_ASSETS_DIR="/home/hschne/Source/vienna.rb/assets/out"

function main() {
  local input=""
  local talk_slide=""
  local music=""
  local start=""
  local end=""
  local preview_seconds=""
  local crop=""
  local output=""
  local assets_dir="$DEFAULT_ASSETS_DIR"

  while [[ $# -gt 0 ]]; do
    case "$1" in
    --input) input="${2:?Error: --input requires a value}"; shift 2 ;;
    --talk-slide) talk_slide="${2:?Error: --talk-slide requires a value}"; shift 2 ;;
    --music) music="${2:?Error: --music requires a value}"; shift 2 ;;
    --start) start="${2:?Error: --start requires a value}"; shift 2 ;;
    --end) end="${2:?Error: --end requires a value}"; shift 2 ;;
    --preview-seconds) preview_seconds="${2:?Error: --preview-seconds requires a value}"; shift 2 ;;
    --crop) crop="${2:?Error: --crop requires a value}"; shift 2 ;;
    --output) output="${2:?Error: --output requires a value}"; shift 2 ;;
    --assets-dir) assets_dir="${2:?Error: --assets-dir requires a value}"; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    *) die "Unknown option: $1" ;;
    esac
  done

  command -v ffmpeg >/dev/null 2>&1 || die "ffmpeg is required"

  [[ -n "$input" ]] || die "--input is required"
  [[ -n "$talk_slide" ]] || die "--talk-slide is required"
  [[ -n "$music" ]] || die "--music is required"
  [[ -n "$start" ]] || die "--start is required"
  [[ -n "$crop" ]] || die "--crop is required"
  [[ -n "$output" ]] || die "--output is required"
  [[ -f "$input" ]] || die "Input not found: $input"
  [[ -f "$talk_slide" ]] || die "Talk slide not found: $talk_slide"
  [[ -f "$music" ]] || die "Music not found: $music"
  [[ -f "$assets_dir/video-1920x1080.png" ]] || die "Intro slide not found in: $assets_dir"
  [[ "$crop" =~ ^[0-9]+:[0-9]+:[0-9]+:[0-9]+$ ]] || die "--crop must be WIDTH:HEIGHT:X:Y"
  [[ -z "$preview_seconds" || -z "$end" ]] || die "Use either --preview-seconds or --end, not both"
  [[ -n "$preview_seconds" || -n "$end" ]] || die "--end is required for a final render; use --preview-seconds for a preview"
  [[ "$(realpath -m "$input")" != "$(realpath -m "$output")" ]] || die "Output must not overwrite the raw input"

  local -a talk_input=(-ss "$start")
  local preset="veryfast"

  if [[ -n "$preview_seconds" ]]; then
    talk_input+=(-t "$preview_seconds")
    preset="ultrafast"
  else
    talk_input+=(-to "$end")
  fi

  mkdir -p "$(dirname "$output")"

  ffmpeg -hide_banner -loglevel warning -y \
    -loop 1 -t 4.96 -i "$assets_dir/video-1920x1080.png" \
    -loop 1 -t 4.84 -i "$talk_slide" \
    "${talk_input[@]}" -i "$input" \
    -i "$music" \
    -filter_complex "[0:v]fps=25,format=yuv420p,settb=1/25,setpts=PTS-STARTPTS[v0];[1:v]fps=25,format=yuv420p,settb=1/25,setpts=PTS-STARTPTS[v1];[2:v]crop=$crop,scale=1920:1080:flags=lanczos,fps=25,format=yuv420p,settb=1/25,setpts=PTS-STARTPTS[talk];[v0][v1]xfade=transition=fade:duration=0.8:offset=4.16[titles];[titles][talk]xfade=transition=fade:duration=0.2:offset=8.8[v];[2:a]aresample=48000,asetpts=PTS-STARTPTS,adelay=8840|8840[talka];[3:a]atrim=0:9.96,aresample=48000,volume=1.414,afade=t=out:st=6.32:d=3.64,asetpts=PTS-STARTPTS[music];[music][talka]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.95[a]" \
    -map '[v]' -map '[a]' \
    -c:v libx264 -preset "$preset" -crf 20 \
    -c:a aac -b:a 192k \
    -movflags +faststart -shortest \
    "$output"
}

usage() {
  cat <<EOF
Usage: $(basename "$0") OPTIONS

Render the fixed Vienna.rb intro followed by one cropped talk.

Required:
  --input PATH              Raw recording
  --talk-slide PATH         Generated 1920x1080 talk card
  --music PATH              Intro music
  --start SECONDS           Raw recording in-point
  --crop W:H:X:Y            Fixed crop rectangle
  --output PATH             New MP4 output

Choose one:
  --preview-seconds N       Fast preview containing N seconds of the talk
  --end SECONDS             Raw recording out-point for the final render

Optional:
  --assets-dir PATH         Asset directory (default: $DEFAULT_ASSETS_DIR)
  -h, --help                Show this help
EOF
}

die() {
  echo "Error: $1" >&2
  exit "${2:-1}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
