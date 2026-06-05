# SCSS Mixins and Functions

## `@mixin` vs `@extend`

Prefer `@mixin` in almost all cases. `@extend` has significant downsides:

|                                | `@mixin`                                  | `@extend`                                  |
| ------------------------------ | ----------------------------------------- | ------------------------------------------ |
| Output                         | Duplicates declarations at each call site | Merges selectors into one rule             |
| Works across files with `@use` | Yes                                       | No (breaks with `@use`)                    |
| Works with `@media`            | Yes                                       | No (cannot extend across media boundaries) |
| Output predictability          | High — what you write is what you get     | Low — selector merging can surprise        |
| Gzip performance               | Repeated declarations compress very well  | Minimal advantage after gzip               |
| Debugging                      | Source maps point to include site         | Source maps point to merged selector       |

### When `@extend` Is Acceptable

Only use `@extend` with placeholder selectors (`%`) **in the same file**:

```scss
%visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only {
  @extend %visually-hidden;
}

.skip-link:not(:focus) {
  @extend %visually-hidden;
}
```

Never `@extend` a concrete class. Never `@extend` across files.

## Mixin Patterns

### Responsive Breakpoints

```scss
@use "sass:map";

$breakpoints: (
  "sm": 576px,
  "md": 768px,
  "lg": 1024px,
  "xl": 1280px,
);

@mixin respond-to($name) {
  @if not map.has-key($breakpoints, $name) {
    @error 'Unknown breakpoint: #{$name}. Available: #{map.keys($breakpoints)}';
  }
  @media (min-width: map.get($breakpoints, $name)) {
    @content;
  }
}
```

### Content Blocks with `@content`

Use `@content` for mixins that wrap declarations in a context:

```scss
@mixin hover-focus {
  &:hover,
  &:focus-visible {
    @content;
  }
}

.link {
  color: var(--color-text-primary);

  @include hover-focus {
    color: var(--color-text-secondary);
  }
}
```

### Parameterized Mixins

Keep parameters minimal. Use defaults for common cases:

```scss
@mixin truncate($lines: 1) {
  @if $lines == 1 {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
```

### When NOT to Use a Mixin

Don't use a mixin if:

- It wraps a single declaration — just write the declaration.
- It duplicates what a CSS custom property could do (e.g., `@mixin theme-color` → use `var(--color-x)` instead).
- It generates utility classes — use `@each`/`@for` loops instead, or consider if utilities belong in plain CSS.

## Functions

SCSS functions return values. Use them for calculations and transformations, not for outputting declarations.

**Good — returns a value:**

```scss
@use "sass:math";

@function px-to-rem($px, $base: 16) {
  @return math.div($px, $base) * 1rem;
}

.element {
  font-size: px-to-rem(18); // 1.125rem
}
```

**Bad — function with side effects:**

```scss
// Don't output properties from a function — use a mixin instead
@function bad-example($size) {
  // Functions should only return values
}
```

### Map Accessor Functions

Useful for design token maps:

```scss
@use "sass:map";

$z-layers: (
  "base": 0,
  "dropdown": 100,
  "sticky": 200,
  "modal": 300,
  "toast": 400,
);

@function z($layer) {
  @if not map.has-key($z-layers, $layer) {
    @error 'Unknown z-layer: #{$layer}. Available: #{map.keys($z-layers)}';
  }
  @return map.get($z-layers, $layer);
}

.modal {
  z-index: z("modal"); // 300
}
```

## Error Handling

Use `@error` for hard failures (wrong arguments) and `@warn` for soft warnings (deprecations):

```scss
@mixin grid-cols($count) {
  @if $count < 1 or $count > 12 {
    @error 'grid-cols expects 1–12, got #{$count}';
  }
  grid-template-columns: repeat($count, 1fr);
}
```
