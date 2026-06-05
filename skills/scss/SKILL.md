---
name: scss
description: SCSS authoring conventions for maintainable, scalable stylesheets. Use when writing, refactoring, debugging, or reviewing SCSS files — covers file organization, nesting, mixins, functions, variables, and the modern module system.
---

# SCSS

Technical guidance for writing clean SCSS. Covers SCSS-specific compilation features — for CSS output concerns (layout, selectors, sizing, colors, motion), use the **css** skill instead.

## When to Use This Skill

- Writing, refactoring, debugging, or reviewing `.scss` files
- Deciding between SCSS features and native CSS equivalents
- Organizing SCSS partials and imports
- Writing or reviewing mixins, functions, or loops

## Core Rules

- Use `@use` and `@forward` for all imports. Never use `@import` (deprecated, removed in Dart Sass 3).
- Keep nesting to 3 levels maximum. Pseudo-classes, pseudo-elements, media queries, and BEM modifiers via `&` are acceptable nesting targets.
- Use CSS custom properties for runtime/themeable values. Use SCSS variables only for compile-time constants (breakpoints, static calculations, map keys).
- Prefer `@mixin` over `@extend`. Extend produces unpredictable output across files and breaks with `@use`. Reserve `@extend` for same-file placeholder selectors only.
- Use `sass:math`, `sass:color`, `sass:map`, `sass:list`, and `sass:string` built-in modules. Never use deprecated global functions (`darken()`, `lighten()`, unitless division `/`).
- Follow BEM naming: `.block`, `.block__element`, `.block--modifier`. Use `&__element` and `&--modifier` inside the block for co-location, but never nest BEM elements inside BEM elements.
- Order declarations logically: positioning → box model → typography → visual → misc. Be consistent within the project.
- Write one component per partial file. Name partials with a leading underscore: `_nav.scss`.
- Use `@layer` to control cascade order. SCSS passes `@layer` through to CSS output unchanged.
- Avoid generating selectors deeper than 3 levels in compiled output. Inspect output when in doubt.

## SCSS vs Native CSS Decision Guide

| Concern                                    | Use SCSS                       | Use native CSS                      |
| ------------------------------------------ | ------------------------------ | ----------------------------------- |
| Theming, runtime values                    | —                              | CSS custom properties               |
| Compile-time constants (breakpoints, math) | SCSS `$variables`              | —                                   |
| File splitting                             | `@use` / `@forward`            | —                                   |
| Nesting                                    | SCSS nesting (broader support) | Native nesting (if baseline OK)     |
| Color manipulation at build time           | `sass:color`                   | `color-mix()`, `oklch()` if runtime |
| Repeated declaration groups                | `@mixin`                       | —                                   |
| Cascade control                            | —                              | `@layer`, `:where()`, `:is()`       |
| Responsive breakpoints                     | `@mixin` wrapping `@media`     | Container queries for components    |

## Workflow

1. Identify the SCSS concern (file organization, nesting, mixin, variable, etc.).
2. Read the matching reference(s) below.
3. Apply the convention. Prefer the simplest approach that works.
4. Check compiled CSS output for specificity bloat or unexpected selectors.
5. Run the project's linter/formatter if configured.

## Alignment with CSS Skill

This skill and the **css** skill are complementary:

- **scss** covers authoring concerns: file organization, `@use`, nesting, mixins, functions, SCSS variables.
- **css** covers output concerns: layout, selectors, sizing, colors, motion, custom properties, cascade layers.

When both apply (e.g., writing a mixin that outputs layout CSS), read both skills. If guidance conflicts, prefer the **css** skill for output-level decisions and this skill for authoring-level decisions.

## References

Read the reference that matches the SCSS concern you are working on:

| Topic                | Description                                                                 | Reference                                            |
| -------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- |
| module system        | `@use`, `@forward`, namespacing, built-in modules, migration from `@import` | [module-system](references/module-system.md)         |
| nesting              | Max depth, BEM with `&`, acceptable vs excessive nesting, compiled output   | [nesting](references/nesting.md)                     |
| mixins and functions | When to use `@mixin` vs `@extend`, function patterns, `@content` blocks     | [mixins-functions](references/mixins-functions.md)   |
| file organization    | Partial naming, import order, splitting by concern, scaling patterns        | [file-organization](references/file-organization.md) |
| variables            | SCSS variables vs CSS custom properties, maps, naming conventions           | [variables](references/variables.md)                 |
