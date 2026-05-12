# Inertia and Svelte

This reference covers Rails-side conventions for apps that use Inertia with Svelte. For CSS and styling patterns, also read the `tailwind` skill.

## Props

- Expect server-side snake_case props to arrive as camelCase in frontend components.
- Design props intentionally and keep them explicit.

## Forms

Prefer the Inertia `Form` component over ad hoc JavaScript form handling and over `useForm` when simple forms are enough.

## Frontend Logic

- Prefer backend-driven state.
- Compute permissions, derived status, and business booleans in Ruby.
- Let javascript frameworks focus on rendering and local UI state.

Backend should own:

- authorization flags
- business rules
- derived counts and statuses
- formatted display data when helpful

Frontend should own:

- open/closed UI state
- transitions and animation
- submission/loading state
- event handlers

## Navigation

Always use the Inertia `Link` component for in-app navigation.

**Good:**

```svelte
<script>
  import { Link } from '@inertiajs/svelte'
</script>

<Link href={'/account'}>View account</Link>
```

**Bad:**

```svelte
<a href={`/account`}>View account</a>
```

Use plain `<a>` tags only for navigating to pages outside of Inertia pages (e.g. server-rendered ERB pages).
