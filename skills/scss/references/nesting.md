# SCSS Nesting

## Maximum Depth: 3 Levels

Nesting produces compound selectors in compiled output. Deep nesting creates high-specificity selectors that are hard to override and debug.

**Good — 2 levels:**

```scss
.nav {
  display: flex;

  &:hover {
    background: var(--color-bg-secondary);
  }
}
```

Compiled: `.nav` and `.nav:hover` — clean, low specificity.

**Bad — 5 levels:**

```scss
.nav {
  .nav-list {
    .nav-item {
      .nav-link {
        .nav-icon {
          color: red;
        }
      }
    }
  }
}
```

Compiled: `.nav .nav-list .nav-item .nav-link .nav-icon` — specificity nightmare.

## What Counts as a "Level"

Nesting pseudo-classes, pseudo-elements, `@media`, and BEM `&` modifiers does not meaningfully increase specificity or reduce readability. These are "free" nesting:

```scss
.card {
  padding: var(--space-4);

  // Free: pseudo-elements
  &::before {
    content: "";
  }

  // Free: state pseudo-classes
  &:hover,
  &:focus-visible {
    outline: 2px solid var(--color-border-focus);
  }

  // Free: BEM modifier
  &--featured {
    border: 2px solid var(--color-accent-primary);
  }

  // Free: BEM element
  &__title {
    font-size: var(--font-size-lg);
  }

  // Free: media query
  @media (min-width: 768px) {
    padding: var(--space-6);
  }
}
```

What counts toward the 3-level limit: descendant/child combinators that produce `.a .b .c` type selectors.

## BEM with `&`

Use `&` for BEM elements and modifiers to keep them co-located with the block:

**Good:**

```scss
.card {
  background: var(--color-bg-primary);

  &__header {
    padding: var(--space-4);
    border-block-end: 1px solid var(--color-border-secondary);
  }

  &__body {
    padding: var(--space-4);
  }

  &--compact {
    padding: var(--space-2);
  }
}
```

**Bad — nesting BEM elements inside BEM elements:**

```scss
.card {
  &__header {
    &__title {
      // Compiles to .card__header__title — wrong BEM
      // BEM elements belong to the block, not to other elements
    }
  }
}
```

If you need `.card__header-title`, write it as a separate `&__header-title` directly under `.card`, or consider if it should be its own block.

## When to Flatten

Flatten when:

- Nesting exceeds 3 descendant levels
- The compiled selector is hard to read or reason about
- Multiple classes at the same level create a long nested block
- A nested rule would be clearer as a standalone class

**Good — flattened:**

```scss
.nav {
  display: flex;
}

.nav__list {
  gap: var(--space-4);
}

.nav__link {
  color: var(--color-text-primary);

  &:hover {
    color: var(--color-text-secondary);
  }
  &--active {
    font-weight: var(--font-weight-bold);
  }
}
```

**Bad — everything nested under `.nav`:**

```scss
.nav {
  display: flex;

  .nav__list {
    gap: var(--space-4);

    .nav__link {
      color: var(--color-text-primary);
      // 3 levels deep in compiled output
    }
  }
}
```

## Inspecting Compiled Output

When uncertain about nesting depth, check the compiled CSS:

```bash
sass --style=expanded input.scss output.css
```

Look for selectors with more than 2-3 space-separated parts. Those are candidates for flattening.
