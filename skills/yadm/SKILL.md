---
name: yadm
description: "Manage dotfiles with yadm. Use when tracking, adding, removing, listing, diffing, committing, pushing, or restoring files in Hans's yadm-managed dotfiles; when the user says dotfiles, yadm, track this config, add this file to dotfiles, stop tracking a dotfile, or check dotfile status."
---

# yadm Dotfiles

Manage Hans's dotfiles with `yadm`, not homeshick.

## Core Rules

- Use `yadm` for dotfiles. Do not use homeshick helpers such as `htd`, `hud`, `hdd`, `hod`, `hld`, or `hpd`.
- Stage explicit paths only. Dotfiles repos often contain unrelated local edits, so avoid `yadm add -A`, `yadm add .`, and broad path adds.
- Before committing, run `yadm status --short` and verify the staged files are only files changed or intentionally tracked in this session.
- Do not commit unless the user asks.

## Common Tasks

### Track a file

```bash
yadm add ~/.config/example/config.toml
yadm status --short ~/.config/example/config.toml
```

Expected result: the path appears as staged (`A`, `M`, or similar) and no unrelated paths were staged by your command.

### Check current dotfile state

```bash
yadm status --short
```

Use this before and after yadm operations. Mention unrelated existing changes without touching them.

### See whether a file is already tracked

```bash
yadm ls-files | grep -Fx '.config/example/config.toml'
```

`yadm ls-files` paths are relative to `$HOME`, usually without a leading `~/`.

### Review a dotfile diff

```bash
yadm diff -- ~/.config/example/config.toml
yadm diff --cached -- ~/.config/example/config.toml
```

Use `--cached` for staged changes.

### Stop tracking a file but keep it on disk

```bash
yadm rm --cached ~/.config/example/config.toml
yadm status --short ~/.config/example/config.toml
```

Use this when the user wants a file removed from yadm but not deleted locally.

### Delete a tracked file

```bash
yadm rm ~/.config/example/config.toml
yadm status --short ~/.config/example/config.toml
```

Use this only when the user wants both the tracked file and local file removed.

### Commit and push dotfile changes

Only when requested:

```bash
yadm status --short
yadm add <explicit-path-1> <explicit-path-2>
yadm status --short
yadm commit -m "concise message"
yadm push
```

Review `yadm status --short` before committing. If unrelated staged changes exist, ask before proceeding.
