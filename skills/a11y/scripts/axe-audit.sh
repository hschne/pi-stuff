#!/usr/bin/env bash
# axe-audit.sh — Run axe-core accessibility audit on a URL
# Usage: axe-audit.sh <url> [--include <selector>] [--disable <rule-id>]
#
# Examples:
#   axe-audit.sh http://localhost:4000
#   axe-audit.sh http://localhost:4000/about
#   axe-audit.sh http://localhost:4000 --disable color-contrast
#
# Requires: npx (Node.js)

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

echo "Running axe-core audit on: $url"
echo "---"

# Run axe-core CLI. --exit passes through the exit code (non-zero if violations found).
# Additional flags are forwarded.
if ! npx --yes @axe-core/cli@latest "$url" --exit "$@" 2>&1; then
  exit_code=$?
  # ChromeDriver mismatch is a common issue — suggest alternatives
  if [[ $exit_code -eq 2 ]]; then
    echo ""
    echo "Hint: If ChromeDriver version is mismatched, try:"
    echo "  npx browser-driver-manager install chrome"
    echo "Or use Lighthouse via Chrome DevTools MCP / Playwright MCP + axe-core instead."
  fi
else
  exit_code=0
fi

echo ""
echo "---"
if [[ $exit_code -eq 0 ]]; then
  echo "✅ No accessibility violations found."
else
  echo "❌ Accessibility violations detected (exit code: $exit_code)."
  echo "   Fix violations and re-run to verify."
fi

exit $exit_code
