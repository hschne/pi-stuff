# SCSS File Organization

## Partials

SCSS partials start with `_` and are not compiled independently. They are pulled in via `@use`:

```
_sass/
├── _theme.scss        # Design tokens (CSS custom properties)
├── _base.scss         # Element-level resets and defaults
├── _components.scss   # Component styles (or split per component)
├── _highlight.scss    # Syntax highlighting
├── _media.scss        # Responsive overrides
├── _utilities.scss    # Utility classes
```

## Import Order

Import in dependency order — tokens first, then base, then components, then overrides:

```scss
// main.scss
@use "theme"; // 1. Design tokens, custom properties
@use "base"; // 2. Element resets, global defaults
@use "components"; // 3. Component styles
@use "highlight"; // 4. Domain-specific components
@use "media"; // 5. Responsive overrides
@use "utilities"; // 6. Utility classes (highest priority)
```

This order aligns with `@layer` priority: `theme < base < components < utilities`.

## One Component Per File

When a components file grows large, split it into one partial per component:

```
_sass/
├── components/
│   ├── _index.scss    # @forward barrel
│   ├── _nav.scss
│   ├── _footer.scss
│   ├── _card.scss
│   └── _pagination.scss
```

```scss
// components/_index.scss
@forward "nav";
@forward "footer";
@forward "card";
@forward "pagination";
```

```scss
// main.scss
@use "components";
```

### When to Split

Split when:

- A file exceeds ~200 lines
- Components are independently maintained
- Multiple people work on different components

Keep a single file when:

- The project is small
- Components share context and are read together
- Splitting would create many tiny files with no benefit

## Scaling Patterns

### Small Projects (< 10 files)

Flat structure, one file per concern:

```
_sass/
├── _theme.scss
├── _base.scss
├── _components.scss
├── _media.scss
└── _utilities.scss
```

### Medium Projects (10–30 files)

Split components and add an abstracts folder for shared mixins/functions:

```
_sass/
├── abstracts/
│   ├── _index.scss
│   ├── _mixins.scss
│   └── _functions.scss
├── base/
│   ├── _index.scss
│   ├── _reset.scss
│   └── _typography.scss
├── components/
│   ├── _index.scss
│   ├── _nav.scss
│   ├── _card.scss
│   └── _pagination.scss
├── _theme.scss
├── _media.scss
└── _utilities.scss
```

### Large Projects (30+ files)

Full 7-1 pattern with layout and page-specific partials:

```
scss/
├── abstracts/     # Variables, mixins, functions, placeholders
├── base/          # Reset, typography, base elements
├── components/    # Reusable UI components
├── layout/        # Page-level layout (header, footer, grid)
├── pages/         # Page-specific overrides
├── themes/        # Theme variations
├── vendors/       # Third-party overrides
└── main.scss      # Manifest
```

Use the smallest structure that keeps files navigable. Don't adopt the 7-1 pattern unless the project actually needs it.

## Naming Conventions

- Partials: `_component-name.scss` (kebab-case, leading underscore)
- Barrel files: `_index.scss` (enables `@use 'folder'` shorthand)
- Main entry: `main.scss` (no underscore — this file gets compiled)
- Reference folders: lowercase, plural (`components/`, `abstracts/`)
