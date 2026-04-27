# TypeScript

Typing patterns for Svelte 5 runes.

## Props

```svelte
<script lang="ts">
  // Inline types
  let { name, count = 0 }: { name: string; count?: number } = $props()

  // Interface for complex props
  interface Props {
    name: string
    items: string[]
    onselect?: (item: string) => void
  }
  let { name, items, onselect }: Props = $props()

  // With rest props
  let { variant, ...rest }: Props & Record<string, unknown> = $props()
</script>
```

## State

```svelte
<script lang="ts">
  // Primitives — inferred
  let count = $state(0)

  // Explicit when null is possible
  let user = $state<User | null>(null)
  let items = $state<string[]>([])
</script>
```

## Derived

```svelte
<script lang="ts">
  // Usually inferred
  let doubled = $derived(count * 2)

  // Explicit when needed
  let result = $derived<string | null>(count > 0 ? String(count) : null)

  // Complex derived with return type
  let computed = $derived.by((): ComputedResult => {
    return { value: count, formatted: `Count: ${count}` }
  })
</script>
```

## Snippets

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    children: Snippet
    header?: Snippet
    row?: Snippet<[item: Item, index: number]>
  }
  let { children, header, row }: Props = $props()
</script>
```

## Event Handlers

```svelte
<script lang="ts">
  function handleClick(e: MouseEvent) {}

  function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
    const value = e.currentTarget.value
  }

  // Callback props
  interface Props {
    onclick?: (e: MouseEvent) => void
    onchange?: (value: string) => void
  }
</script>
```

## Context

```svelte
<script lang="ts">
  import { setContext, getContext } from 'svelte'

  interface MyContext {
    count: number
    increment: () => void
  }

  // Setting
  setContext<MyContext>('key', { count: 0, increment: () => {} })

  // Getting
  const ctx = getContext<MyContext>('key')
</script>
```
