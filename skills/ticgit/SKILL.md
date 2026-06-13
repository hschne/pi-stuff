---
name: ticgit
description: "Use TicGit (`ti`) for Git-native issue tracking, PRD/writeup workflows, ticket triage, implementation handoffs, dependencies, progress comments, reviews, and agent backlog loops. Use when creating, migrating, reading, implementing, closing, syncing, or automating tickets, PRDs, writeups, specs, or issue workflows with `ti`."
---

# TicGit

Use TicGit (`ti`) as the source of truth for Git-native planning and tickets.

## Core Rules

- Prefer `ti list --markdown`, `ti next --markdown`, and `ti show <id> --markdown` when reading; Markdown includes context and agent-oriented next commands.
- Treat PRDs, research, design notes, and evolving plans as `ti writeup`s. Treat actionable vertical slices as tickets.
- Put implementation detail in `ti spec`, not in long ticket descriptions. The description should explain what/why and acceptance criteria; the spec should explain how.
- Track ordering with `ti depends`; `ti next` skips unresolved dependencies, which makes automation safer than prose-only blockers.
- Record meaningful findings, blockers, verification commands, and completion notes with `ti comment`.
- Close tickets only after implementation and verification are complete.

## Setup

For a repository that does not yet use TicGit:

```sh
ti init
printf '%s\n' "$(git remote get-url origin)" > .git-meta
ti setup
```

Commit `.git-meta` with the normal code changes so other clones auto-configure. Run `ti sync` when you intentionally want to pull/push ticket metadata with the remote.

## PRD / Planning Workflow

1. Capture the PRD or long-form plan as a writeup:
   ```sh
   ti writeup new --title "PRD: <name>" --file /tmp/prd.md --tags prd,<area>
   ```
2. Revise it by appending versions:
   ```sh
   ti writeup edit <writeup-id> --file /tmp/revised-prd.md
   ti writeup show <writeup-id> --all
   ```
3. Break it into thin, independently verifiable tickets. Use a temp file where line 1 is the title and the body contains `What to build`, `Acceptance criteria`, and relevant assets:
   ```sh
   ti new -F /tmp/ticket.md --tags <area>,slice --priority 1 --markdown
   ti spec -t <ticket-id> -F /tmp/spec.md
   ti writeup link <writeup-id> <ticket-id>
   ```
4. Add dependencies after all blocking tickets exist:
   ```sh
   ti depends <blocker-id> -t <dependent-id>
   ```

Use `ti new --subissue <parent-id>` only when a parent ticket is useful as an epic. Prefer writeup-to-ticket links for PRD context because writeups preserve long-form version history.

## Implementing One Ticket

1. Sync/read the queue:
   ```sh
   ti sync
   ti next --markdown
   ti show <id> --markdown
   ti show <id> --filter .spec
   ```
2. Claim and mark active:
   ```sh
   ti checkout <id>
   ti claim
   ti state in-progress
   ```
3. Work narrowly. Comment when you learn something important or finish a meaningful phase:
   ```sh
   ti comment "Found root cause: <summary>"
   ti comment "Implemented <summary>; running <verification command>"
   ```
4. If blocked, make the state machine reflect it:
   ```sh
   ti state blocked
   ti comment "Blocked on <specific dependency or decision>"
   ```
5. Before closing, comment verification evidence, move through review when useful, then close:
   ```sh
   ti comment "Verification: <command> passed"
   ti state review
   ti review new --ticket <id>
   ti close <id>
   ```

## Backlog Automation

For loops that implement tickets until no work remains, use `ti list --open --json --subissues` as the deterministic source of open ticket count. The bundled helper prints that count:

```sh
bash ~/.pi/agent/skills/ticgit/scripts/open-ticket-count.sh
```

A worker loop should implement exactly one `ti next` ticket per iteration, claim it, verify it, close it, and stop when the helper returns `0`.

## Useful Commands

```sh
ti agent                         # installed TicGit agent guide
ti list --markdown               # open tickets
ti list --all --markdown         # all tickets
ti list --open --subissues       # open tickets including child tickets
ti next --markdown               # best unblocked next ticket
ti show <id> --json              # stable machine output
ti history <id>                  # ticket change history
ti stats                         # dashboard
ti tui                           # interactive browser
ti views save <name>             # save filters from the previous ti list
```

## Migration From File-Based Issues

When replacing Markdown issue files, preserve information before deleting files:

- PRD files become `ti writeup`s tagged `prd`.
- Open issue files become open tickets.
- Done issue files become tickets that are immediately closed after preserving their content, unless historical migration is intentionally skipped.
- Filename priority becomes `ti priority`; prose blockers become `ti depends`; moving to `done/` becomes `ti close`.

After migration, update project agent instructions to point to TicGit and remove stale `.agents` references so future agents do not use both systems.
