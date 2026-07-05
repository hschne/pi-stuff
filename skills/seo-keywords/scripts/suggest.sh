#!/usr/bin/env bash
# Expand a seed keyword into real long-tail queries using Google's public
# Suggest (autocomplete) endpoint — the same one the search box uses.
# No API key, no account. These are phrases people actually type.
#
# Usage:   suggest.sh "ruby meetup" [-c country] [-l lang]
# Example: suggest.sh "ruby meetup" -c us -l en
#
# Use a SHORT head-term seed ("ruby meetup"), not a full sentence
# ("how to start a ruby meetup") — autocomplete needs room to complete.
# Fans the seed over A-Z and question words, then dedupes. Volume/difficulty
# are NOT provided here — use these as real demand signals to classify intent
# and pick targets, not as ranked volume.
set -euo pipefail

seed=""; gl="us"; hl="en"
while [ $# -gt 0 ]; do
  case "$1" in
    -c) gl="$2"; shift 2 ;;
    -l) hl="$2"; shift 2 ;;
    -*) echo "unknown option: $1" >&2; exit 2 ;;
    *)  seed="$1"; shift ;;
  esac
done
[ -n "$seed" ] || { echo 'usage: suggest.sh "seed keyword" [-c country] [-l lang]' >&2; exit 2; }
command -v curl    >/dev/null || { echo "error: curl required" >&2; exit 1; }
command -v python3 >/dev/null || { echo "error: python3 required" >&2; exit 1; }

endpoint="https://suggestqueries.google.com/complete/search"
modifiers=( "" {a..z} how what why when where which who can does is best vs for without )

tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
for m in "${modifiers[@]}"; do
  q="$seed"; [ -n "$m" ] && q="$seed $m"
  curl -fsS --get "$endpoint" \
    --data-urlencode "client=firefox" \
    --data-urlencode "hl=$hl" \
    --data-urlencode "gl=$gl" \
    --data-urlencode "q=$q" 2>/dev/null \
  | python3 -c 'import json,sys
try:
    for s in json.load(sys.stdin)[1]: print(s)
except Exception: pass' >> "$tmp" || true
  sleep 0.15
done

sort -u "$tmp"
