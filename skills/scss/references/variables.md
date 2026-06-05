# SCSS Variables

## SCSS Variables vs CSS Custom Properties

These serve different purposes. Use both, but for the right things.

|                         | SCSS `$variable`                        | CSS `var(--custom-property)` |
| ----------------------- | --------------------------------------- | ---------------------------- |
| Evaluated at            | Compile time                            | Runtime                      |
| Can change at runtime   | No                                      | Yes                          |
| Works in media queries  | Yes (`@media (min-width: $breakpoint)`) | No                           |
| Works in `@each`/`@for` | Yes                                     | No                           |
| Themeable (light/dark)  | No (unless you compile twice)           | Yes                          |
| Inherited through DOM   | No                                      | Yes                          |
| Available in DevTools   | No (compiled away)                      | Yes                          |

### Decision Guide

Use **SCSS variables** for:

- Breakpoint values in `@media` queries
- Map keys for loops and functions
- Compile-time math constants
- Values that never change at runtime

Use **CSS custom properties** for:

- Colors, spacing, typography tokens (anything themeable)
- Component APIs (override via context)
- Values that change with `:hover`, `[data-theme]`, or media queries
- Anything the developer might inspect or tweak in DevTools

**Good — each in its place:**

```scss
@use "sass:map";

// Compile-time: breakpoints (used in @media, can't use CSS vars there)
$breakpoints: (
  "sm": 576px,
  "md": 768px,
  "lg": 1024px,
);

// Runtime: design tokens as CSS custom properties
:root {
  --color-text-primary: #111;
  --color-bg-primary: #f4f1ea;
  --space-4: 0.5rem;
}

.card {
  color: var(--color-text-primary); // runtime, themeable
  padding: var(--space-4); // runtime, themeable

  @media (min-width: map.get($breakpoints, "md")) {
    padding: var(--space-6); // breakpoint uses SCSS, value uses CSS
  }
}
```

**Bad — SCSS variables for themeable values:**

```scss
$color-primary: #3498db; // Can't change at runtime for dark mode
$spacing-md: 16px; // Can't inspect or override in DevTools

.card {
  color: $color-primary; // Compiled away, not themeable
  padding: $spacing-md;
}
```

## Naming Conventions

### SCSS Variables

Use `$category-property-variant`:

```scss
$breakpoint-sm: 576px;
$breakpoint-md: 768px;
$z-index-modal: 300;
$z-index-toast: 400;
```

### CSS Custom Properties

Use `--category-property-variant`:

```scss
:root {
  --color-text-primary: #111;
  --color-text-secondary: #4c4944;
  --font-size-base: 1rem;
  --font-size-lg: 1.2rem;
  --space-4: 0.5rem;
}
```

## Maps

Use maps for related sets of values that need programmatic access:

```scss
@use "sass:map";

$breakpoints: (
  "sm": 576px,
  "md": 768px,
  "lg": 1024px,
  "xl": 1280px,
);

$z-layers: (
  "base": 0,
  "dropdown": 100,
  "sticky": 200,
  "modal": 300,
);
```

### When to Use Maps vs Flat Variables

Use **maps** when:

- Values are iterated over (`@each`)
- Values are accessed by key in functions/mixins
- The set is logically grouped and extensible

Use **flat variables** when:

- Values are referenced individually and rarely together
- There are fewer than 4 related values
- Map access syntax adds noise without benefit

**Good — map for breakpoints (iterated in mixin):**

```scss
$breakpoints: (
  "sm": 576px,
  "md": 768px,
  "lg": 1024px,
);

@mixin respond-to($name) {
  @media (min-width: map.get($breakpoints, $name)) {
    @content;
  }
}
```

**Good — flat variables for one-off constants:**

```scss
$max-grid-columns: 12;
$sidebar-width: 280px;
```

## Default Values

Use `!default` in library/shared code so consumers can override before importing:

```scss
// _shared-config.scss
$border-radius: 4px !default;
$transition-speed: 200ms !default;
```

```scss
// Consumer overrides before @use
// (Note: with @use, use `with` clause instead)
@use "shared-config" with (
  $border-radius: 0,
  $transition-speed: 100ms
);
```
