---
name: ticgit
description: "Use TicGit (`ti`) for Git-native issue tracking, PRD/writeup workflows, ticket triage, implementation handoffs, dependencies, progress comments, reviews, and agent backlog loops. Use when creating, migrating, reading, implementing, closing, syncing, or automating tickets, PRDs, writeups, specs, or issue workflows with `ti`. Also use to publish slices produced by the generic issues skill into this tracker."
---

# TicGit

TicGit (`ti`) is the source of truth for Git-native planning and tickets in this repo.

## Start Here

Run `ti agent` first. It prints the authoritative, version-matched command guide — create, read, state/triage, comments, dependencies, specs, reviews, and sync — and includes the exact flags for the installed `ti`. Treat it as the reference for command syntax. This skill adds the project conventions and judgment that `ti agent` does not cover; if the two ever disagree on a flag or command name, `ti agent` wins because it tracks the binary.

When you need a flag you are unsure of, prefer `ti <command> --help` over guessing.

## Core Conventions

- Read with `--markdown` (`ti list`, `ti next`, `ti show`); Markdown output includes context and suggested next commands.
- PRDs, research, design notes, and evolving plans are `ti writeup`s. Actionable vertical slices are tickets.
- Keep ticket descriptions to what/why plus acceptance criteria. Put implementation detail in `ti spec`, not the description. Check for a spec before implementing; add one if the path is unclear.
- Track ordering with structural dependencies (`ti dep`), never prose alone. `ti next` skips tickets with unresolved dependencies — a "Blocked by" line in a description does nothing on its own.
- Record meaningful findings and blockers as you go with `ti comment`.
- Before closing, leave a `ti comment` summarizing what changed and the verification you ran. Git holds the diff; the ticket must hold the what, the why, and the proof it passed.
- Close tickets only after implementation and verification are complete.

## Where Information Lives: Writeup, Description, Spec

Give every piece of information one home so the three never duplicate or drift:

- **Writeup (PRD)** — the durable, feature-wide design that spans many tickets: problem, solution, architecture, cross-cutting decisions, data-model shape, guardrails, testing strategy. Versioned. Keep it at the decision/architecture level.
- **Ticket description** — one slice's behavior and acceptance criteria: the definition of done. Avoid file paths and code; they go stale, and reviewers check against this.
- **Spec** (`ti spec`) — one ticket's concrete build plan: exact files, classes, migrations, routes, step-by-step how, and gotchas for that slice. Mutable; rewrite or `ti spec --clear` freely as the plan changes.

The common mistake is putting per-ticket file-level detail in the writeup, where it then duplicates the spec. Keep file-level _how_ in the spec and feature-level _why/what_ in the writeup. A spec is optional — add one when the path is not obvious from the description plus the writeup.

## Mapping Issue/PRD Slices to TicGit

The issues skill (and most PRD/issue templates) produce slices with a recurring set of fields. Map them onto `ti` as follows so behavior, how-to, ordering, and context each land in the right place:

| Slice field                         | TicGit target                                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Title                               | first line of the `-F` file                                                                                                             |
| What to build + Acceptance criteria | ticket description (the rest of the `-F` file)                                                                                          |
| Implementation detail / the "how"   | `ti spec -t <id> -F <file>` — keep it out of the description                                                                            |
| Blockers / "Blocked by"             | `ti dep <blocker-id> -t <id>` — structural; prose alone does not gate `ti next`                                                         |
| Assets / URLs                       | inline in the description, or `ti comment` for ongoing notes                                                                            |
| Parent / source PRD                 | `ti writeup link <writeup-id> <ticket-id>` for PRD context; `ti new --subissue <parent-id>` only when a real parent ticket (epic) helps |

Prefer writeup-to-ticket links over subissues for PRD context, because writeups preserve long-form version history.

## Publishing a Batch of Linked Slices

Create in dependency order (blockers first) so later tickets can reference real IDs. Capture each new ID with `--id-only`, then attach its spec, link the source writeup, and wire dependencies once the blocker exists:

```sh
ID=$(ti new -F /tmp/slice-1.md --tags <area>,slice --priority 1 --id-only)
ti spec -t "$ID" -F /tmp/slice-1-spec.md
ti writeup link <writeup-id> "$ID"
# after the blocker ticket exists:
ti dep "$BLOCKER_ID" -t "$ID"
```

## Verifying After Publishing

Confirm the graph is real, not just prose — especially the first time tickets are published for a feature:

- `ti list --markdown` — all tickets present with expected tags and priority.
- `ti next` — returns the slice you expect to start first; blocked slices are skipped.
- `ti show <id> --json` — `depends_on`/`blocks` reflect the intended order (structural, not a sentence).
- `ti writeup show <writeup-id>` — lists its linked tickets.

Tickets are local until shared. Run `ti sync` when you intentionally want to pull/push ticket metadata with the remote; decide on this explicitly rather than assuming tickets propagate.

## PRD / Planning Workflow

1. Capture the PRD or long-form plan as a writeup:
   ```sh
   ti writeup new --title "PRD: <name>" --file /tmp/prd.md --tags prd,<area>
   ```
2. Revise by appending versions, then read the full history:
   ```sh
   ti writeup edit <writeup-id> --file /tmp/revised-prd.md
   ti writeup show <writeup-id> --all
   ```
3. Slice the writeup into thin, independently verifiable tickets — use the **issues** skill for the slicing method — then publish, spec, link, and wire them as in the sections above.

## Implementing One Ticket

Sync and read the queue (`ti sync`, `ti next --markdown`, `ti show <id> --markdown`, `ti show <id> --filter .spec`), then claim and drive the state machine with `ti checkout`/`ti claim`/`ti state`. Comment when you learn something or finish a meaningful phase. Mark genuine blockers with `ti state blocked` and a comment naming the dependency. Before closing, comment a summary of what changed plus the verification evidence, optionally move through review (`ti review new --ticket <id>`), then `ti close`. See `ti agent` for the exact command forms.

## Setup

For a repository that does not yet use TicGit:

```sh
ti init
printf '%s\n' "$(git remote get-url origin)" > .git-meta
ti setup
```

Commit `.git-meta` with the normal code changes so other clones auto-configure.

## Backlog Automation

For loops that implement tickets until no work remains, use `ti list --open --json --subissues` as the deterministic source of open ticket count. The bundled helper prints that count:

```sh
bash ~/.pi/agent/skills/ticgit/scripts/open-ticket-count.sh
```

A worker loop should implement exactly one `ti next` ticket per iteration, claim it, verify it, close it, and stop when the helper returns `0`.

## Migration From File-Based Issues

When replacing Markdown issue files, preserve information before deleting files:

- PRD files become `ti writeup`s tagged `prd`.
- Open issue files become open tickets.
- Done issue files become tickets that are immediately closed after preserving their content, unless historical migration is intentionally skipped.
- Filename priority becomes `ti priority`; prose blockers become `ti dep`; moving to `done/` becomes `ti close`.

After migration, update project agent instructions to point to TicGit and remove stale references so future agents do not use both systems.
