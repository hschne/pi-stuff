---
name: worktree
description: Create, configure, set up, inspect, and remove Git worktrees with the worktree command. Use when work should happen in a separate checkout or when changing worktree placement.
---

# Worktree

Use `~/.scripts/worktree` rather than calling `git worktree` directly. Run
`~/.scripts/worktree --help` for the current command and option reference.

## Create a worktree

For an interactive task description:

```bash
~/.scripts/worktree new "feature description"
```

For a deterministic name and branch:

```bash
~/.scripts/worktree create <name> --branch <branch>
```

Use lowercase letters, digits, and hyphens for `name`. Creation is complete when
`worktree path <name>` prints an existing checkout on the requested branch.

## Resolve worktrees

```bash
~/.scripts/worktree root
~/.scripts/worktree path <name>
~/.scripts/worktree list
```

Use these commands instead of reconstructing paths. A configured directory
prefix can make the checkout directory differ from its logical name.

## Configure placement

The default root is `<repo>/worktrees`. Repository-local Git configuration can
override the root and add a directory prefix:

```bash
git config worktree-manager.root <path>
git config worktree-manager.prefix <prefix>
```

Relative roots resolve from the repository root. `WORKTREE_ROOT` and
`WORKTREE_PREFIX` provide temporary environment overrides. Verify placement
with `worktree root` and `worktree path <name>` before creating a checkout.

## Run project setup

```bash
~/.scripts/worktree setup <name>
```

If `bin/worktree-setup` is executable in the checkout, the command runs it from
that checkout. Setup is complete when the project script exits successfully.

## Inspect changes

`worktree diff <name>` opens interactive DiffView. Run it only when the user
requests an interactive diff.

For noninteractive inspection, use ordinary read-only Git commands inside the
path returned by `worktree path <name>`.

## Remove a worktree

```bash
~/.scripts/worktree destroy <name>
```

The command refuses dirty worktrees. Inspect and preserve changes before using
`--force`. Removal is complete when `worktree path <name>` no longer exists and
the entry is absent from `worktree list`.
