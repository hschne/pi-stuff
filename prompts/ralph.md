---
description: Autonomous issue implementer — picks, implements, verifies, and commits one issue per iteration
model: anthropic/claude-sonnet-4-6
thinking: medium
subagent: worker
loop: unlimited
converge: true
---

Each iteration, do exactly one thing:

1. Read AGENTS.md and the current PRD for full context.
2. Run `git log -n 5 --format="%H%n%ad%n%B---" --date=short` for implemented issues.
3. Find open issues. If there are none, say "No open issues" and stop.
4. Pick the highest-priority issue and read it.
5. Implement the issue fully.
6. Run the project's verification checklist.
7. If verification passes, move the issue to done and commit all changes with a clear message.
8. If verification fails, fix the failures and re-run. Do not mark done until everything passes.

## Rules

- ONE issue per iteration. Do not batch.
- Do not create, modify, or split issues. Only implement what exists.
- Do not skip verification.
- At the end, output only one line:
  - `Implemented <ISSUE-ID>`
  - or `No open issues`

$@
