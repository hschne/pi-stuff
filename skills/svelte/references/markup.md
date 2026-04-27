# Markup and Styling

Conventions for templates, accessibility, and class handling.

## A11y on Event Wrappers

If a non-interactive wrapper listens to touch or pointer events only for event plumbing, add `role="presentation"`.

Bad:

```svelte
<div
  ontouchmove={handleTouchMove}
  class={`fixed left-0 right-0 ${isActive ? 'z-50' : 'z-10'}`}
  style="top: {topPosition}; overscroll-behavior: contain;"
>
  <slot />
</div>
```

Good:

```svelte
<div
  ontouchmove={handleTouchMove}
  role="presentation"
  class="fixed inset-x-0"
  class:z-50={isActive}
  class:z-10={!isActive}
  style:top={topPosition}
  style:overscroll-behavior="contain"
>
  <slot />
</div>
```

## Class Directives

Prefer Svelte class directives over manually constructing class strings with JavaScript conditionals.

Prefer:

```svelte
<div
  class="btn"
  class:btn-primary={primary}
  class:btn-disabled={disabled}
/>
```

Over:

```svelte
<div class={`btn ${primary ? 'btn-primary' : ''} ${disabled ? 'btn-disabled' : ''}`} />
```

When using Tailwind or DaisyUI, keep stable classes in `class="..."` and toggle only the conditional pieces with `class:name={condition}`.
