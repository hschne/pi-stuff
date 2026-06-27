---
name: tmux-plugin-authoring
description: "Use when creating, debugging, or reviewing a tmux plugin: writing a *.tmux run file, exposing @-prefixed options, building status-line or window-list format fragments, or rendering custom tmux status content."
---

# tmux Plugin Authoring

Build tpm-installable tmux plugins that configure cleanly and render without
hijacking the user's theme.

## Core Rules

- **Entry point is an executable `*.tmux` bash file at the repo root.** tpm
  sources every `*.tmux` file it finds in a plugin. Keep it bash and
  dependency-free; plain shell is the portable baseline tmux users expect.
- **Resolve your own directory for companion files.** At the top of the entry
  file:
  `CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`.
  Publish it with `tmux set-environment -g <PLUGIN>_DIR "$CURRENT_DIR"` so
  hooks, scripts, or other-language integrations load without hardcoding the
  tpm install path (which varies by `TMUX_PLUGIN_MANAGER_PATH`).
- **Configure through `@`-prefixed user options.** Set a default only when the
  option is unset, so a user who set it earlier in their config (before the
  plugin run line) keeps their value.
- **Expose rendering as format fragments, never as full formats.** Store your
  pieces in options the user interpolates with `#{E:@your_fragment}`. Do not
  overwrite `status-format`, `status-left`, `status-right`,
  `window-status-format`, or `window-status-current-format` — those belong to
  the user's theme. You supply parts; they assemble the whole.
- **Target panes and windows explicitly with `-t`.** `set-option -p` /
  `set-option -w` without `-t` resolve to the client's _active_ pane/window,
  not the one your code means — background panes get written to the wrong
  place. Pass `-t "$pane_id"` (or `"$TMUX_PANE"` from a process running in the
  pane).
- **Redraw after changing status-affecting options** with `refresh-client -S`.
  Option writes alone don't repaint the status line.

## Workflow

### 1. Scaffold the entry file

```bash
#!/usr/bin/env bash
set -euo pipefail

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set_default() {
  local opt="$1" val="$2"
  [ -z "$(tmux show-options -gqv "$opt" 2>/dev/null)" ] && tmux set-option -g "$opt" "$val"
  return 0
}
```

Make it executable (`chmod +x`). tpm runs it on load; running it by hand
(`./my-plugin.tmux`) applies it to the current server for quick iteration.

### 2. Declare options with defaults

Set every tunable as an `@`-prefixed global, only when unset:

```bash
set_default "@my-plugin-color"     "green"
set_default "@my-plugin-glyph"     "●"
set_default "@my-plugin-separator" "│"
```

**Good** — user override survives because you guard on unset:

```bash
[ -z "$(tmux show-options -gqv "$opt" 2>/dev/null)" ] && tmux set-option -g "$opt" "$val"
```

**Bad** — clobbers a value the user set earlier in their config:

```bash
tmux set-option -g "@my-plugin-color" "green"
```

### 3. Build format fragments

Store a format string in an option and let the user drop it into _their_
format with `#{E:@...}`. Reference your own option values live inside the
fragment so changing a colour/glyph option re-renders without rebuilding:

```bash
seg='#{?#{@pane_marker},#[fg=#{@my-plugin-color}]#{@my-plugin-glyph} #{@pane_label},}'
tmux set-option -g "@my_plugin_segment" "$seg"
```

The user then writes (in their own config):

```tmux
set -g window-status-format "#I #{E:@my_plugin_segment} "
```

See the [format language reference](references/formats.md) for directive
syntax (`#{?...}` conditionals, `#{P:...}` / `#{W:...}` loops, `#{E:...}`
expansion, `#[...]` styles, comparisons, modifiers).

### 4. Consume per-pane / per-window state (if producers feed you)

If a hook or external process marks panes/windows, read those user options in
the fragment (e.g. `#{@pane_marker}`) and have the producer set them with
explicit targets:

```bash
tmux set-option -p -t "$pane_id" @pane_marker "active" \; refresh-client -S
```

Document the exact option names and value vocabulary as the plugin's contract,
so producers and the renderer stay decoupled.

### 5. Test in an isolated server

Never iterate against the user's live server. Use the bundled sandbox, which
spins up a throwaway tmux on its own socket, runs your plugin, and dumps the
`@` options it set:

```bash
bash <skill-dir>/scripts/sandbox.sh ./my-plugin.tmux
```

It prints attach and cleanup commands. Mock pane/window state with
`tmux -L <socket> set-option -p -t <pane> @your_option <value>` to preview
every render state without wiring real producers.

### 6. Verify before shipping

- `bash -n my-plugin.tmux` — syntax check.
- Run the entry file, then `tmux show-options -g | grep '^@my-plugin'` — confirm
  defaults landed and types look right.
- **Verify glyph/powerline characters survived edits.** Multi-byte glyphs
  (`●`, ``, `│`) are invisible or mangled in tool output; after editing a
  format line, count them or re-read the raw bytes — a dropped glyph passes
  syntax checks but renders wrong.
- Attach the sandbox and eyeball each state.

## When debugging rendering

- A fragment shows literally (e.g. `#{E:@x}` printed as text) → the option is
  unset or empty; check it exists with `show-options -gqv @x`.
- A status update doesn't appear → you changed an option but skipped
  `refresh-client -S`, or you wrote to the active pane instead of the target
  (missing `-t`).
- Conditionals always take one branch → check `#{?cond,a,b}` comparison syntax
  and that the referenced variable is non-empty (`#{?#{@x},...}` tests
  emptiness; `#{?#{==:#{@x},val},...}` tests equality).

## References

Read the reference when working on rendering:

| Topic           | When to Read                                                         | Reference                        |
| --------------- | -------------------------------------------------------------------- | -------------------------------- |
| format language | Writing or debugging `#{...}` fragments, conditionals, loops, styles | [formats](references/formats.md) |
