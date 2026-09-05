---
name: tickets
description: Break a plan, spec, PRD, or parent issue into independently grabbable implementation tickets using tracer-bullet vertical slices. Use when converting plans into tickets, creating issue tracker work items, or splitting work into slices that AFK agents can pick up independently. Tracker-agnostic; installed tracker tooling owns publishing mechanics.
---

# Tickets

Break a plan into independently grabbable tickets using vertical slices, also called tracer bullets. Each ticket declares the blocking edges that gate it.

This workflow defines _what a good slice is_ and _what each slice must capture_. It is tracker-agnostic. Derive publishing commands, fields, dependency syntax, and parent links from the installed tracker and its current help.

## Core Rules

- Each ticket delivers a narrow but complete path through all required layers, not a single technical layer.
- A completed slice must be demoable or verifiable on its own.
- Size each ticket to fit in one fresh context window.
- Prefer many thin slices over a few thick ones.
- Prefer prefactoring first when it makes later tickets smaller and safer: make the change easy, then make the easy change.
- Separate behavior from implementation. The ticket states what/why and acceptance criteria; deep how-to detail is secondary and, on trackers that support it, belongs in a separate spec field rather than the description.
- Express dependencies using the tracker's native dependency feature, not prose alone. A written "Blocked by" note is human context; it does not gate a work queue or a "what's next" command. Record the real dependency through the tracker.
- Use the project's domain glossary vocabulary.
- Carry forward relevant assets (screenshots, mockups, diagrams, prototypes, recordings, uploaded files, URLs) into each ticket that needs them.
- Do not close or modify the parent issue.

## Vertical Slices vs Horizontal Layers

A vertical slice delivers one user-visible behavior end to end. A horizontal slice completes one technical layer but cannot be verified as a complete behavior on its own.

**Good (vertical):**

```md
Title: Let customers reset their password by email
What to build: Customers can request a reset link, receive an email, open the link, set a new password, and sign in with it.
Acceptance criteria:

- [ ] A customer can request a password reset from the sign-in screen
- [ ] The reset link expires after the configured window
- [ ] A customer can sign in with the new password after reset
```

**Bad (horizontal):**

```md
Title: Add password reset database fields
What to build: Add reset token and reset timestamp columns to users.
Acceptance criteria:

- [ ] User model exposes reset fields
```

The bad example may be necessary work, but by itself no user can complete a password reset.

When a feature hinges on a risky integration (a new API, new infrastructure, an unproven library), the first slice can be the thinnest end-to-end path through that risk — verifiable by a test or console run even before any UI exists — and later slices add user surface on top. This is still a tracer bullet: it pierces every layer of the risky path, it just isn't yet wrapped in a screen.

## Wide Refactors

Wide refactors are the exception to vertical slicing. A wide refactor is one mechanical change — renaming a column, retyping a shared symbol, changing a public API — whose blast radius fans across the whole codebase so no ordinary vertical slice can land green.

Sequence wide refactors with expand–contract:

1. **Expand** — add the new form beside the old one so existing callers stay green.
2. **Migrate** — move call sites in batches sized by blast radius, such as per package, directory, or feature area. Each batch is its own ticket blocked by the expand ticket.
3. **Contract** — remove the old form after no callers remain. This ticket is blocked by every migrate batch.

When migration batches cannot stay green alone, keep the sequence but let the batches share an integration branch and create a final integrate-and-verify ticket where green is promised.

## Workflow

1. Gather context from the conversation or the referenced plan, spec, PRD, parent issue, URL, or file.
2. Identify source assets to carry into tickets.
3. Explore the codebase when needed for current state, domain vocabulary, constraints, and prefactoring opportunities.
4. Draft vertical-slice tickets, or an expand–contract sequence for wide refactors. For each, capture the fields in **What Each Ticket Captures**.
5. Order tickets by dependency, blockers first, so later tickets can reference earlier ones.
6. If the user has not asked for immediate publishing, present the breakdown first: title, blocked-by edges, and what each ticket delivers. Ask whether the granularity and blocking edges are right, then iterate until approved.
7. Publish through the installed tracker: inspect its current help, assemble the captured fields into its format, route implementation detail to a spec field if one exists, record dependencies structurally, and link each ticket back to the source plan/spec.
8. Verify the published result: the dependency graph resolves so the first unblocked ticket is the one you expect to start with, and dependencies are structural rather than prose-only. Work the frontier: any ticket whose blockers are done.

## What Each Ticket Captures

Capture this information per ticket, then map it onto fields supported by the installed tracker.

- **Title** — the user-visible behavior delivered by the slice.
- **What to build** — concise end-to-end behavior, not layer-by-layer implementation. Avoid specific file paths and code; they go stale. Exception: point to a prototype, or inline only the compact decision-rich part when it encodes the decision more precisely than prose.
- **Acceptance criteria** — a short checklist of verifiable outcomes.
- **Implementation detail** (optional) — the how. Keep it out of the behavior description; route it to a spec field where the tracker supports one.
- **Blocked by** — which tickets must land first. Record through the tracker's dependency feature, not just as a sentence.
- **Assets** — links or attachments needed to build this ticket, each with a one-line note on what it shows and which behavior it informs. Omit when none apply.
- **Parent** — a reference to the source plan, spec, PRD, or parent issue, if any.
