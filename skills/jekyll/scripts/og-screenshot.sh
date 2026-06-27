#!/usr/bin/env bash
# Render a 1200x630 Open Graph image from a served URL using headless Chromium.
# Captures the top viewport of the page (the hero), which makes a decent OG card.
#
# Usage:   og-screenshot.sh <url> <output.png> [light|dark]
# Example: og-screenshot.sh http://127.0.0.1:4000/ assets/og.png dark
#
# Requires a Chromium/Chrome binary. Override detection with CHROMIUM=/path/to/chrome.
# The page must already be served (e.g. `bundle exec jekyll serve`).
set -euo pipefail

url=${1:?usage: og-screenshot.sh <url> <output.png> [light|dark]}
out=${2:?usage: og-screenshot.sh <url> <output.png> [light|dark]}
scheme=${3:-light}

bin=${CHROMIUM:-$(command -v chromium 2>/dev/null \
  || command -v chromium-browser 2>/dev/null \
  || command -v google-chrome 2>/dev/null \
  || command -v google-chrome-stable 2>/dev/null || true)}
if [ -z "$bin" ]; then
  echo "no Chromium/Chrome found; set CHROMIUM=/path/to/chrome" >&2
  exit 1
fi

flags=(
  --headless=new
  --hide-scrollbars
  --disable-gpu
  --force-color-profile=srgb
  --window-size=1200,630
  --virtual-time-budget=5000   # let webfonts / async content settle
)

# Headless Chromium defaults to prefers-color-scheme: light. Force dark for
# dark-first designs. The numeric blink setting maps 0->dark in current
# Chromium; if a release flips it, swap to 1 and re-check the output.
if [ "$scheme" = dark ]; then
  flags+=(--blink-settings=preferredColorScheme=0)
fi

"$bin" "${flags[@]}" --screenshot="$out" "$url" >/dev/null 2>&1

if command -v file >/dev/null 2>&1; then
  file "$out"
else
  echo "wrote $out"
fi
