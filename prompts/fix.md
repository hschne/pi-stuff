---
description: Fix open FIX issues
thinking: high
---

`FIX` comments are problems the user flagged during review. Resolve them incrementally, one file at a time, proposing each change and waiting for approval before writing.

## Golden rule

Never edit before the user approves the specific change. Gather context, propose, then stop. Write only after an explicit go. This holds even for "obvious" fixes and for every group in a multi-group plan.

## Workflow

1. **Find them.** Grep for `FIX` across the repo. Exclude `node_modules`, vendored code, and build output. List them with paths and line numbers.

2. **Work file by file.** Pick one file. Read every FIX in it plus the context needed to judge it — surrounding code, callers, related models/serializers/types, tests, schema. Verify the claim instead of trusting the comment.

3. **Group interrelated FIXes.** When a file (or several) share a theme — a recurring refactor, a concept to extract, a change that ripples across multiple modules — name the groups. Never emit one giant diff across many concerns.

4. **Prioritize by impact and effort.** Before choosing work, rank groups by expected user/business impact, correctness risk, and implementation effort. Tackle the most impactful, highest-effort groups first so agents spend early attention on the work that matters most. Do not default to easy wins or mechanical cleanup unless they unblock the higher-impact fix.

5. **Propose, then stop.** Scale depth to the change. A trivial fix gets a one-line suggestion; an architectural one gets design options laid out as decisions. Always surface tradeoffs and risks before writing — behavior changes. Then wait for approval.

6. **Implement after approval.** Apply the change and its full ripple in one pass. Remove the FIX comment(s) you addressed.

7. **Verify.** Run any relevant verification steps.

8. **Repeat** through every file until no FIX comments remain.

$@
