# tmux Format Language

Reference for the `#{...}` format directives plugins use to render status-line
and window-list content. `man tmux` (FORMATS section) is authoritative; this is
the working subset for plugin authors.

## Two different brace syntaxes

- `#{...}` — a **format directive**: variables, conditionals, loops, option
  references. Expanded by tmux.
- `#[...]` — an **embedded style**: colours and attributes
  (`#[fg=red,bold]`, `#[default]`, `#[nobold]`). Not a format; sets drawing
  state for the text that follows.

Mixing them is normal: `#[fg=#{@my-color}]#{@pane_label}` styles with a value
pulled from an option.

## Variables and option references

- `#{pane_id}`, `#{window_index}`, `#{session_name}`, `#{pane_current_command}`,
  etc. — built-in variables. Unknown/missing variables expand to nothing.
- `#{@my-option}` — a user option's value (the `@` prefix makes it a user
  option). This is how plugins read their own config and per-pane/per-window
  state.
- `#{E:@my-fragment}` — expand the value of `@my-fragment` _as a format_. Use
  this so users interpolate a stored fragment into their own format string. A
  plain `#{@my-fragment}` would print the fragment's literal text instead of
  evaluating it.

## Conditionals

`#{?condition,true-part,false-part}`

The condition is true when it expands to a **non-empty** string (other than
`0`). Common forms:

```
#{?#{@pane_marker},SET,unset}              # true when @pane_marker is non-empty
#{?#{==:#{@pane_status},waiting},blue,}    # equality comparison
#{?#{m:*err*,#{@pane_label}},match,}       # glob/regex match (m:)
```

Comparison and predicate prefixes inside `#{...}`:

| Prefix         | Meaning                                   |
| -------------- | ----------------------------------------- | ----------- | ---------------- |
| `==:a,b`       | string equality                           |
| `!=:a,b`       | string inequality                         |
| `m:pat,str`    | `str` matches glob `pat` (`m/r:` = regex) |
| `<:`,`>:` etc. | numeric comparison                        |
| `              |                                           | :a,b` `&&:` | logical or / and |

Nest conditionals for multi-way choices (front-load the most important case):

```
#{?#{==:#{@s},crashed},#[fg=red],#{?#{==:#{@s},waiting},#[fg=blue],#[fg=green]}}
```

## Loops over panes and windows

- `#{P:format}` — repeat `format` for every **pane** in the window, concatenated.
- `#{W:format}` — repeat for every **window** in the session.
- `#{S:format}` — repeat for every session.

Inside the loop body, variables resolve per-iteration, so per-pane user options
work:

```
#{P:#{?#{@pane_marker},#{@pane_label} ,}}   # labels of marked panes, space-joined
```

To test "does any pane match", combine a loop with `m:`:

```
#{?#{m:*crashed*,#{P:#{@pane_status} }},ATTENTION,}
```

## Modifiers (string manipulation)

Applied as `#{modifier:...}`:

| Modifier             | Effect                                                               |
| -------------------- | -------------------------------------------------------------------- |
| `s/pat/repl/:str`    | substitute (regex). Trailing-separator trim idiom: `#{s/ │ $//:...}` |
| `=N:str` / `=-N:str` | left/right truncate to N chars                                       |
| `t:str`              | format a time variable                                               |
| `b:str` / `d:str`    | basename / dirname of a path                                         |

Truncation example for labels:

```
#{=20:#{@pane_label}}     # at most 20 chars
```

## Common plugin idioms

Fallback to the default when no state is set:

```
#{?#{P:#{@pane_marker}},#{P:...your segment...},#W}
```

Per-window accent colour, with one state winning over another:

```
#{?#{m:*crashed*,#{P:#{@pane_status} }},red,#{?#{m:*waiting*,#{P:#{@pane_status} }},blue,}}
```

Reference colour/glyph options live (so user overrides apply without a rebuild):

```
#[fg=#{@my-plugin-color}]#{@my-plugin-glyph}
```

## Gotchas

- A `#{...}` that references a missing/empty option yields nothing — guard with
  `#{?#{@x},...,...}` rather than assuming a value.
- `#{E:...}` is required to evaluate a stored fragment; without it you get the
  literal text.
- Commas and braces inside a conditional's parts must balance; deeply nested
  conditionals are easier to read built up in the shell as separate variables
  then concatenated.
- Styles (`#[...]`) persist until changed — reset with `#[default]` (or
  `#[fg=default]`, `#[nobold]`) so your fragment doesn't bleed into the rest of
  the user's status line.
