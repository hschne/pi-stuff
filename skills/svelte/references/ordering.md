# Script Block Ordering

Order code in `<script>` blocks top-down by dependency: what you have → what you compute → what you do → what reacts.

1. Imports
2. Constants
3. Props (`$props`)
4. Context (`getContext` / `setContext`)
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
