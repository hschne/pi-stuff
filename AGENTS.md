# Agent Guidelines

## Communication

- Use direct technical prose without filler.
- Do not use emojis in commits, issues, PR comments, or code.
- Answer the user's question before editing files or running implementation commands.
- When responding to feedback or analysis, state whether you agree or disagree before describing changes.
- State what works for the current task; do not predict or make sweeping claims.

## Code

The human owns architecture, including system boundaries, module APIs, and separation of concerns. Stay within those decisions and surface new design choices instead of making them silently.

- Read files completely before broad changes, before editing a file not yet fully inspected, and for investigations or audits. Search snippets are insufficient for these tasks.
- Prefer direct code. Add abstractions, helpers, or indirection only when current behavior requires them; inline single-line helpers with one call site.
- Preserve backward compatibility only when the user requests it.
- Use subagents only when the user explicitly requests them.

## Git

Multiple agent sessions may modify different files in the same working tree. Limit Git operations to this session's changes so other sessions' staged, unstaged, and untracked work remains untouched.

When committing:

- Commit only when the user asks.
- Include only files changed in this session.
- Stage explicit paths and run `git status` before committing to verify the staged set.
- Use concise, informative commit messages.

Never run `git reset --hard`, `git checkout .`, `git clean -fd`, `git stash`, `git add -A`, `git add .`, `git commit --no-verify`, or force-push.

During a rebase, resolve conflicts only in files changed in this session. If another file conflicts, abort and ask the user.

## User Override

If a user request conflicts with this document, explain the conflict and ask for explicit confirmation before proceeding.

## System

Make system configuration changes in `~/Source/nixfiles`; the machine runs NixOS.
