#!/usr/bin/env bash
# axe-audit.sh — Run axe-core accessibility audit on a URL
# Usage: axe-audit.sh <url> [--include <selector>] [--disable <rule-id>]
#
# Examples:
#   axe-audit.sh http://localhost:4000
#   axe-audit.sh http://localhost:4000/about
#   axe-audit.sh http://localhost:4000 --disable color-contrast
#
# Requires: npx (Node.js), Chromium, and ChromeDriver

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: axe-audit.sh <url> [axe-core/cli flags...]"
  echo ""
  echo "Examples:"
  echo "  axe-audit.sh http://localhost:4000"
  echo "  axe-audit.sh http://localhost:4000 --disable color-contrast"
  exit 1
fi

url="$1"
shift

chrome="$(command -v chromium || command -v chromium-browser || command -v google-chrome || command -v google-chrome-stable || true)"
chromedriver="$(command -v chromedriver || true)"

if [[ -z "$chrome" ]]; then
  echo "Error: Chromium or Chrome is required." >&2
  exit 2
fi

if [[ -z "$chromedriver" ]]; then
  echo "Error: ChromeDriver is required; install pkgs.chromedriver through NixOS." >&2
  exit 2
fi

echo "Running axe-core audit on: $url"
echo "---"

# Run axe-core CLI. --exit passes through the exit code (non-zero if violations found).
# Additional flags are forwarded.
if npx --yes @axe-core/cli@4.12.1 "$url" --exit \
  --chrome-path "$chrome" \
  --chromedriver-path "$chromedriver" \
  "$@" 2>&1; then
  exit_code=0
else
  exit_code=$?
fi

echo ""
echo "---"
if [[ $exit_code -eq 0 ]]; then
  echo "✅ No accessibility violations found."
else
  echo "❌ Accessibility violations detected (exit code: $exit_code)."
  echo "   Fix violations and re-run to verify."
fi

exit "$exit_code"
