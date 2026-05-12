---
name: issues
description: Breaks a plan, spec, PRD, or issue into independently grabbable implementation issues using tracer-bullet vertical slices. Use when converting plans into tickets or creating issue tracker work items.
---

# Issues

Break a plan into independently grabbable issues using vertical slices, also called tracer bullets.

## When to Use This Skill

- The user wants to convert a plan, spec, PRD, or parent issue into implementation issues.
- The user wants tickets that AFK agents can pick up independently.
- The user asks to split work into vertical slices rather than layer-by-layer tasks.

## Core Rules

- Each issue should deliver a narrow but complete path through all required layers.
- A completed slice must be demoable or verifiable on its own.
- Prefer many thin slices over a few thick ones.
- Use the project’s domain glossary vocabulary.
- Carry forward relevant assets from the source plan, PRD, parent issue, or conversation into each issue that needs them.
- Do not close or modify the parent issue.

## Workflow

1. Gather context from the conversation or the referenced issue, URL, file, plan, or PRD.
2. Identify source assets such as screenshots, mockups, diagrams, prototypes, recordings, uploaded files, or URLs.
3. Explore the codebase when needed to understand current state, domain vocabulary, and constraints.
4. Draft vertical slices with title, type, blockers, covered user stories, and relevant assets.
5. Publish issues in dependency order, blockers first, so later issues can reference real issue IDs.
6. The user will review the output files directly. Do not ask for validation before publishing.

## Vertical Slice Examples

A vertical slice delivers one user-visible behavior end to end. A horizontal slice completes one technical layer but cannot be verified as a complete behavior on its own.

**Good:**

```md
Title: Let customers reset their password by email
What to build: Customers can request a reset link, receive an email, open the link, set a new password, and sign in with it.
Acceptance criteria:

- [ ] A customer can request a password reset from the sign-in screen
- [ ] The reset link expires after the configured window
- [ ] A customer can sign in with the new password after reset
```

**Bad:**

```md
Title: Add password reset database fields
What to build: Add reset token and reset timestamp columns to users.
Acceptance criteria:

- [ ] User model exposes reset fields
```

The bad example is horizontal: it may be necessary work, but by itself no user can complete a password reset.

## Issue Template

```md
## Parent

A reference to the parent issue on the issue tracker, if the source was an existing issue. Otherwise omit this section.

## What to build

A concise description of this vertical slice. Describe end-to-end behavior, not layer-by-layer implementation.

Avoid specific file paths or code snippets because they go stale quickly. Exception: if a prototype produced a compact snippet that encodes a decision more precisely than prose can, inline only the decision-rich part and note that it came from a prototype.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Assets

Links or attachments from the source PRD, parent issue, or conversation that are needed to implement this slice. Include screenshots, mockups, diagrams, prototypes, recordings, uploaded files, or URLs. Add a short note explaining what each asset shows. Omit this section if no assets are relevant to the slice.

## Blocked by

- A reference to the blocking ticket, if any

Or: None - can start immediately
```
