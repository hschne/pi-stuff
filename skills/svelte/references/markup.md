# Markup and Styling

Conventions for templates, accessibility, and class handling.

## A11y on Event Wrappers

If a non-interactive wrapper listens to touch or pointer events only for event plumbing, add `role="presentation"`.

**Good:**

```svelte
<div
  ontouchmove={handleTouchMove}
  role="presentation"
  class={['fixed inset-x-0', isActive ? 'z-50' : 'z-10']}
  style:top={topPosition}
  style:overscroll-behavior="contain"
>
  {@render children()}
</div>
```

**Bad:**

```svelte
<div
  ontouchmove={handleTouchMove}
  class={`fixed left-0 right-0 ${isActive ? 'z-50' : 'z-10'}`}
  style="top: {topPosition}; overscroll-behavior: contain;"
>
  {@render children()}
</div>
```

## Conditional Classes

Use the native `class={[...]}` array syntax (Svelte 5.16+, clsx built-in). Avoid `class:` directives — they can't handle special characters like Tailwind's `/` and don't work on components.

**Good:**

```svelte
<!-- Boolean toggle -->
<div class={['btn', primary && 'btn-primary', disabled && 'btn-disabled']} />

<!-- Either/or with ternary -->
<p class={['text-sm', active ? 'text-base-content/70' : 'text-base-content/40']} />

<!-- Works on components -->
<Icon class={['h-4 w-4', selected && 'rotate-180']} />
```

**Bad:**

```svelte
<!-- String construction -->
<div class={`btn ${primary ? 'btn-primary' : ''}`} />
<div class={['btn', primary ? 'btn-primary' : ''].join(' ')} />

<!-- class: directive — breaks with / chars, doesn't work on components -->
<div class="btn" class:btn-primary={primary} />
```
