# Component Ordering

Order everything top-down by dependency: what you have → what you compute → what you do → what reacts. A reader should be able to scan a component and never see a symbol before it is declared.

## Component File Structure

A `.svelte` file has four sections, in this fixed order (all optional):

```svelte
<script module>
  // Module-level logic that runs once, not per instance. Rarely needed.
  // Page-level exports live here, e.g. `export const layout = [...]`.
</script>

<script lang="ts">
  // Instance-level logic. This is where almost everything goes.
</script>

<!-- markup -->

<style>
  /* Scoped styles */
</style>
```

- Keep `<script module>` for things that are genuinely per-module (page `layout` exports, shared constants). Instance state and props never go here.
- `<style>` stays last. If a style has to be `:global()` and reaches outside the component, that is a smell — move it to a feature stylesheet the owning page imports instead.

## Script Block Ordering

Within `<script>`, order by dependency:

1. Imports
2. Constants
3. Props (`$props`)
4. Context (`getContext` / `setContext`, `use*` composables)
5. State (`$state`)
6. Derived (`$derived`)
7. Functions (helpers, handlers)
8. Effects (`$effect`)

```svelte
<script lang="ts">
  import { untrack } from 'svelte'
  import { getMapContext } from '~/components/map'
  import type { Entry } from '~/types'

  const LAYER_ID = 'entries-layer'

  let { entries = [] }: { entries: Entry[] } = $props()

  const mapContext = getMapContext()

  let active = $state(0)

  const visible = $derived(entries.length > 0)

  const handleClick = (index: number) => {
    active = index
  }

  $effect(() => {
    if (!visible) return
    mapContext.highlight = entries[active]?.slug
  })
</script>
```

## Why this order

- **Props first.** Props are the component's inputs — its contract. They anchor everything else, so they belong at the top where they are easy to find, not buried after helpers. State, derived values, and effects all read from props, so props must come first.
- **State before derived before effects** mirrors the reactive flow: sources → computed values → side effects. Reading a component top-to-bottom then matches how reactivity actually propagates.
- **Effects last.** Effects are the endpoints of the dependency graph; they consume everything above and produce side effects. Nothing should depend on an effect, so nothing needs to appear after them.

Helper functions usually sit before effects (step 7). Co-locating a helper with the effect that uses it is fine when it aids readability, but the default is the order above.
