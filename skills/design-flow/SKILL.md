---
name: design-flow
description: Run a complete guided design-to-build workflow from requirements through structure, visual system, implementation planning, and build. Use when the user wants the full design process, wants to start a UI project from scratch, or asks for a design flow.
---

# Design Flow

Guide one feature from discovery through implementation. Complete and confirm each phase before starting the next.

## Sequence

```text
1. Discover      → resolve the product and experience decisions
2. Brief         → document intent and constraints
3. Architecture  → define navigation, structure, and flows
4. Tokens        → establish the visual system
5. Tasks         → plan vertical implementation slices
6. Build         → implement and verify each slice
—
7. Review        → run separately when built UI exists
```

## Rules

1. At the start, show phases 1–6 and ask whether any should be skipped. Common reasons:
   - the problem and audience are already settled → skip discovery;
   - a single component has no navigation or page-flow decisions → skip architecture;
   - the project already has a complete token system → skip tokens.
2. Before each phase, state its output and ask whether to begin.
3. After each phase, summarize the artifact, key decisions, and open questions. Wait for confirmation before continuing.
4. Reconcile each completed artifact with the next phase rather than treating phases independently.
5. If the user stops, record what is complete and identify the next phase.

## Phase Contracts

### 1. Discover

Inspect prior project context, then question the user one decision at a time. Recommend an answer with each question. Resolve:

- primary user and job to be done;
- desired outcome and success signal;
- emotional tone and aesthetic references or anti-references;
- content and critical states;
- device, accessibility, performance, framework, and brand constraints.

**Complete when:** consequential decisions are resolved or explicitly marked open.

### 2. Brief

Inspect existing components, tokens, themes, fonts, layouts, and UI dependencies. Save `.agents/.design/<feature-slug>/DESIGN_BRIEF.md` with:

- problem and experience-led solution;
- up to three experience principles;
- aesthetic direction and tone;
- existing patterns to preserve;
- component inventory;
- key interactions and responsive behavior;
- accessibility requirements and out-of-scope items.

**Complete when:** the user approves the brief and its open questions are explicit.

### 3. Architecture

Define only the structural decisions needed by the feature:

- navigation and entry points;
- page/content hierarchy;
- URL patterns when relevant;
- primary, alternate, empty, error, and recovery flows;
- responsive structural changes;
- boundaries between pages and reusable components.

Save `.agents/.design/<feature-slug>/DESIGN_ARCHITECTURE.md`.

**Complete when:** every critical user goal has a path through the proposed structure.

### 4. Tokens

Inspect and extend the existing visual system rather than replacing it. Define semantic light and dark values for color, typography, spacing, layout, radii, shadows, motion, and breakpoints in the project’s native format. Derive choices from the approved aesthetic direction and record deliberate deviations.

**Complete when:** components can be built without inventing recurring visual values locally.

### 5. Tasks

Break the approved design into ordered vertical slices. Each task includes structure, styling, interaction, states, reuse/new-component status, dependencies, and a visual verification condition. Put foundational, risky, and visually defining work early. Save `.agents/.design/<feature-slug>/TASKS.md`.

**Complete when:** each task fits one working session and produces an independently inspectable result.

### 6. Build

Implement tasks in order using existing components and project conventions. Start mobile-first, preserve the approved aesthetic direction, verify interactions and responsive states, and check off each completed task. Ask before proceeding to the next slice.

**Complete when:** all approved tasks pass project checks and their visual verification conditions.

### 7. Review on Request

Run only when built UI exists and the user asks for review. Exercise the running interface, capture desktop, tablet, mobile, dark-mode, and relevant component states, then compare them with the brief and architecture. Save prioritized findings to `.agents/.design/<feature-slug>/DESIGN_REVIEW.md` and evidence under `screenshots/`.

**Complete when:** every finding cites visible evidence and distinguishes must-fix issues from optional polish.

## Resume

Artifacts live under `.agents/.design/<feature-slug>/`. When resuming, inspect existing feature folders, ask which feature applies if ambiguous, read its artifacts, and continue from the first incomplete phase.
