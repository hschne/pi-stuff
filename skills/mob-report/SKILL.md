---
name: mob-report
description: Print the lackey board — every mob lackey with its pane, what it is working on, its own latest report, its Linear ticket and its GitHub PR. Use when asked for the board or for lackey status.
---

# Lackey board

```bash
scripts/board
```

One tab-separated line per live lackey: `STATE NAME ROLE PANE TICKET BRANCH
REPORT PR`. `scripts/board --help` covers `--state`, `--root` and `--repo`.

Then one Linear call:

```
list_issues(assignee: "me", state: "started", fields: ["title", "status", "url"], limit: 250)
```

Match on the ticket ID. Repeat without `state` only when a ticket on the board is
missing from the result.

## Output

| Lackey | Role | Pane | Working on | Report | Ticket | PR |

**Working on** is the Linear title; without a ticket, read the branch slug as
words. Link the ticket to its Linear URL with its status beside it, and the PR to
its URL with its state and CI. Empty cells are `—`. Live rows first.

Lead with what waits on Hans — a failing PR, a lackey reporting `blocked` or
`done`, a `gone` lackey — or say nothing does.
