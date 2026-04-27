---
name: tailwind
description: Use Tailwind and DaisyUI for styling applications. Covers utility-first styling, component usage.
---

# DaisyUI and Tailwind

Use this skill when adding or changing styling in ERB or Svelte.

## Core Principles

- Prefer Tailwind utilities and DaisyUI components over custom CSS
- Prefer modern layout primitives like flex and grid
- Keep styling close to markup
- Avoid JavaScript string interpolation for class toggling when framework-native patterns exist
- For nested rounded surfaces, match radii mathematically: outer radius = inner radius + padding
- For floating surfaces with shadows, add a subtle `base-content/20` ring or outline so the edge remains visible on light backgrounds

## Visual Polish Patterns

### Matching Inner and Outer Border Radius

When a rounded child sits inside a padded rounded parent, calculate the parent radius from the child radius plus padding.

**Good:**

```html
<div class="rounded-[calc(var(--radius-xl)+0.5rem)] p-2">
  <img class="rounded-xl" />
</div>
```

**Bad:**

```html
<div class="rounded-2xl p-2">
  <img class="rounded-xl" />
</div>
```

Use the inverse formula when the outer radius is fixed: inner radius = outer radius - padding.

### Shadow Edge Definition

For shadowed cards, popovers, and map popups, add a subtle edge so the shadow does not blur into the background.

Prefer Tailwind for normal markup:

```html
<div class="shadow-xl ring-1 ring-base-content/20">...</div>
```

For third-party DOM or scoped CSS where Tailwind utilities cannot target the rendered element reliably, keep the existing shadow and use an outline:

```css
.floating-surface {
  outline: 1px solid
    color-mix(in oklab, var(--color-base-content) 20%, transparent);
  box-shadow: var(--shadow-xl);
}
```

## Use Cases

Invoke this skill when:

- styling Rails views
- styling Svelte components
- choosing between custom CSS and utility classes
- refactoring class logic in templates
