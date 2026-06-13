#!/usr/bin/env bash
# Print the number of open TicGit tickets in the current repository.
# Includes subissues so automation does not stop while child tickets remain open.
set -euo pipefail

if ! command -v ti >/dev/null 2>&1; then
  echo "ti not found" >&2
  exit 127
fi

json=$(ti list --open --subissues --json)
python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' <<<"$json"
