#!/usr/bin/env bash
#
# sandbox.sh — run a tmux plugin against a throwaway, isolated tmux server so
# you can preview and debug it without touching the user's live session.
#
# It starts a tmux server on its own socket (-L) with no user config
# (-f /dev/null, so the user's ~/.tmux.conf and their own tpm plugins don't
# load and pollute the result), runs the plugin's *.tmux entry file inside
# that server (via run-shell, so the plugin's bare `tmux` calls hit the
# sandbox), then dumps the @-prefixed options it set. The
# server is left running so you can attach, mock pane/window state, and
# eyeball each render; it prints the cleanup command.

set -euo pipefail

readonly SOCK="tmux-plugin-sandbox-$$"
# -f /dev/null keeps the sandbox isolated from the user's tmux config.
readonly TMUX_BIN=(tmux -f /dev/null -L "$SOCK")

main() {
  local plugin="${1:-}"

  if [[ -z "$plugin" ]]; then
    usage
    exit 1
  fi
  [[ -f "$plugin" ]] || die "not a file: $plugin"
  command -v tmux >/dev/null 2>&1 || die "tmux is required but not installed"

  plugin="$(cd "$(dirname "$plugin")" && pwd)/$(basename "$plugin")"

  "${TMUX_BIN[@]}" new-session -d -s sandbox -x 200 -y 50 "sh" 2>/dev/null
  "${TMUX_BIN[@]}" set -g base-index 1
  "${TMUX_BIN[@]}" set -ga terminal-overrides ",*:Tc"

  # run-shell executes the plugin with $TMUX pointing at this server, so its
  # internal `tmux` calls configure the sandbox rather than the default server.
  "${TMUX_BIN[@]}" run-shell "$plugin"

  echo "Ran: $plugin"
  echo
  echo "Global @-options now set on the sandbox server:"
  "${TMUX_BIN[@]}" show-options -g 2>/dev/null | grep '^@' || echo "  (none)"
  echo
  echo "Mock pane state:  tmux -f /dev/null -L $SOCK set-option -p -t <pane> @your_option <value>"
  echo "List panes:       tmux -f /dev/null -L $SOCK list-panes -a -F '#{pane_id} #{window_name}'"
  echo "Attach:           tmux -L $SOCK attach -t sandbox"
  echo "Clean up:         tmux -L $SOCK kill-server"
}

usage() {
  cat <<EOF
Usage: $(basename "$0") PATH/TO/plugin.tmux

Run a tmux plugin against an isolated throwaway server for preview/debugging.
Leaves the server running; prints attach and cleanup commands.
EOF
}

die() {
  echo "Error: $1" >&2
  exit "${2:-1}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
