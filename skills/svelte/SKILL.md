---
name: svelte
description: Apply Svelte best practices for writing maintainable, reusable Svelte views and components. Use this whenever you are reading or writing Svelte files.
---

# Svelte

Apply best practices when writing or refactoring Svelte components.

## When To Use This Skill

- Writing new Svelte components
- Refactoring existing Svelte code
- Reviewing Svelte components

## Core Rules

- prefer constant function declarations
- prefer early returns over nested branching
- keep components presentation-focused when backend can compute state
- run `pnpm check` after Svelte changes and treat warnings as design feedback, not noise

## References

Read the reference that matches the area you are working on:

| Topic      | Description                                                    | Reference                              |
| ---------- | -------------------------------------------------------------- | -------------------------------------- |
| ordering   | Script block ordering convention (imports → props → state → …) | [ordering](references/ordering.md)     |
| reactivity | Props, state, derived, effects, untrack, and common pitfalls   | [reactivity](references/reactivity.md) |
| markup     | Template a11y, class directives, and styling conventions       | [markup](references/markup.md)         |
| patterns   | Context API, forwarding props, controlled inputs, snippets     | [patterns](references/patterns.md)     |
| typescript | Typing props, state, derived, snippets, events, and context    | [typescript](references/typescript.md) |
