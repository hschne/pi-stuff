# pi-ralph

Deterministic [ralph loops](https://ghuntley.com/ralph/) for the Pi coding agent.

Re-runs a fresh-context worker subagent until a **scriptable stop condition**
(an exit code) is satisfied — replacing the flaky "did the iteration edit a
file?" convergence heuristic that prompt-template loops rely on.

## Why

A prompt-template `loop: + converge: true` decides it is done by scanning the
iteration for `write`/`edit` tool calls. That signal is fragile: `bash`-based
mutations are invisible, compaction can drop the evidence, and a worker that did
real work via the shell looks like "no change". pi-ralph instead asks a script:
**"are we done?"** The machine answers, not the agent.

## How it works

Each pass of the loop:

1. Run the configured `stop` command in the project cwd.
   - exit `0` → **done**, stop the loop.
   - exit `≠0` → work remains, run another iteration.
2. **No-progress guard** (automatic when the stop command prints to stdout): if
   the stdout "fingerprint" is byte-identical for `noProgressLimit` consecutive
   passes, abort — the worker is spinning without reducing the work.
3. Delegate one iteration to a fresh-context subagent (via the `pi-subagents`
   slash bridge), with the config's `model`, `thinking`, and `skills` applied and
   the config body as the task.
4. Repeat until done / no-progress / `maxIterations` / interrupt.

Loop state lives in the **repo** (the stop script reads it), not in a sidecar
file — so there is no persistence to manage. Re-running `/ralph` resumes
naturally from wherever the repo is.

## Commands

| Command                                            | Description                           |
| -------------------------------------------------- | ------------------------------------- |
| `/ralph [@name] [--model=] [--thinking=] [--max=]` | Start a loop                          |
| `/ralph-stop`                                      | Stop the active loop (also: `esc`)    |
| `/ralph-status`                                    | Show loop state and available configs |

- `/ralph` → `.pi/ralph/ralph.md`
- `/ralph @cleanup` → `.pi/ralph/cleanup.md` (the `@` is optional sugar)
- Runtime flags override frontmatter: `--model=`, `--thinking=`, `--max=`.
- No freeform task text: the task lives in the config body.

## Config

`.pi/ralph/<name>.md` (project) or `~/.pi/agent/ralph/<name>.md` (user global):

```markdown
---
agent: delegate # optional; pi-subagents delegation vessel (default: delegate)
model: anthropic/claude-sonnet-4-6 # optional; defaults to session model
thinking: medium # optional
skills: implement-issue # optional; comma-separated, injected into worker
maxIterations: 100 # safety cap
noProgressLimit: 2 # identical stop fingerprints before aborting
stop:
  script: stop.sh # path (resolved against config dir, then cwd)
  # or: run: test -z "$(find .agents/issues -maxdepth 1 -name '*.md')"
description: Implement open issues one at a time
---

Each iteration, implement exactly one open issue. ...
```

### Writing a good stop script

Print a progress fingerprint, exit 0 when done:

```bash
#!/usr/bin/env bash
set -euo pipefail
count=$(find .agents/issues -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')
echo "${count} open issue(s)"   # fingerprint → powers the no-progress guard
test "${count}" -eq 0           # exit 0 when done
```

A bare exit-code-only script (no stdout) skips the no-progress guard and relies
on `maxIterations`.

## Dependencies

Requires [`pi-subagents`](https://github.com/nicobailon/pi-subagents) — pi-ralph
delegates iterations through its `subagent:slash:*` event bridge. There is **no**
dependency on `pi-prompt-template-model`.

## Worker agent

The repo's config body **is** the prompt. It is handed as the task to a
fresh-context pi-subagents agent (the "vessel"); the vessel's own system prompt
stays neutral so the config drives behavior. No custom agent file is required.

- Default vessel: the builtin **`delegate`** agent (generic, `inheritSkills:
false`, `read/grep/find/ls/bash/edit/write`, inherits the parent model).
- Override per config with `agent:` in frontmatter to point at any discoverable
  agent, e.g. a project-specific `.pi/agents/my-worker.md`.

pi-subagents requires a _named, discoverable_ agent — it has no inline-agent
option and skips disabled agents — which is why `agent:` resolves to a real
agent rather than an ad-hoc definition.

```

```
