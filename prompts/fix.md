---
description: Fix open FIX issues
model: anthropic/claude-opus-4-8
thinking: high
---

`FIX` comments are problems the user flagged during review. Resolve them incrementally, one file at a time, proposing each change and waiting for approval before writing.

## Golden rule

Never edit before the user approves the specific change. Gather context, propose, then stop. Write only after an explicit go. This holds even for "obvious" fixes and for every group in a multi-group plan.

## Workflow

1. **Find them.** Grep for `FIX` across the repo. Exclude `node_modules`, vendored code, build output, and fixtures. List them with paths and line numbers.

2. **Work file by file.** Pick one file. Read every FIX in it plus the context needed to judge it — surrounding code, callers, related models/serializers/types, tests, schema. Verify the claim instead of trusting the comment.

3. **Group interrelated FIXes.** When a file (or several) share a theme — a recurring refactor, a concept to extract, a change that ripples across multiple modules — name the groups and tackle them group by group, most-mechanical first. Never emit one giant diff across many concerns.

4. **Propose, then stop.** Scale depth to the change. A trivial fix gets a one-line suggestion; an architectural one gets design options laid out as decisions. Always surface tradeoffs and risks before writing — behavior changes. Then wait for approval.

5. **Implement after approval.** Apply the change and its full ripple in one pass. Remove the FIX comment(s) you addressed.

6. **Verify.** Run any relevant verification steps.

7. **Repeat** through every file until no FIX comments remain.

$@
