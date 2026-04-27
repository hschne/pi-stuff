# Reactivity

Patterns and pitfalls for props, state, derived values, and effects in Svelte 5.

## Props Captured Only Once

Do not initialize `$state(...)` from props when you expect later prop updates to flow through. This creates stale UI after Inertia reloads, optimistic updates, or parent-driven prop changes.

Bad:

```svelte
let { user } = $props()
let name = $state(user?.name ?? '')
```

Good:

```svelte
let { user } = $props()
let name = $state('')

$effect(() => {
  name = user?.name ?? ''
})
```

## Derive Values From Props

When a value should always track props, derive it.

Bad:

```svelte
const styleUrl = `https://example.com?key=${apiKey}`
```

Good:

```svelte
const styleUrl = $derived(`https://example.com?key=${apiKey}`)
```

## Normalize Props Without Mutation

Never mutate incoming props just to normalize or extend them.

Bad:

```svelte
if (!propSettings.snapPoints.includes(1)) {
  propSettings.snapPoints.push(1)
}
```

Good:

```svelte
const normalizedSettings = $derived.by(() => {
  const snapPoints = [...(propSettings.snapPoints ?? [1])]
  if (!snapPoints.includes(1)) snapPoints.push(1)
  return { ...propSettings, snapPoints }
})
```

## Latest Callback Value

When storing prop callbacks inside context objects or API objects, wrap them in a closure so they always use the latest prop value.

Bad:

```svelte
const api = {
  onChange: onchange,
}
```

Good:

```svelte
const api = {
  onChange: (event) => onchange?.(event),
}
```

## Props Are Readonly

Props cannot be assigned unless declared with `$bindable`.

```svelte
let { count } = $props()
count = 5  // ❌ Error

let { count = $bindable(0) } = $props()
count = 5  // ✅ Works
```

## Destructuring Props Loses Reactivity

Destructuring a prop object captures a static copy.

Bad:

```svelte
let { user } = $props()
let { name } = user  // static copy, not reactive
```

Good:

```svelte
let { user } = $props()
let name = $derived(user.name)
```

## Derived Cannot Be Assigned

Change the source, not the derived value.

```svelte
let count = $state(0)
let doubled = $derived(count * 2)

doubled = 10  // ❌ Error: readonly
count = 5     // ✅ doubled becomes 10
```

## Effect Dependency Tracking

`$effect` automatically tracks all reactive values read during execution, including inside function calls. This can create unintended dependencies.

```svelte
let items = $state([])

// ❌ Reading `items` inside the effect makes it a dependency.
//    When items updates, the effect re-fires, potentially causing loops or flicker.
$effect(() => {
  if (!ready) return
  fetchAndUpdateItems()  // reads `items` internally
})

// ✅ Use untrack to read without creating a dependency.
import { untrack } from 'svelte'

$effect(() => {
  if (!ready) return
  const current = untrack(() => items.map(i => i.id))
  maybeRefetch(current)
})
```

## Effect Runs After Mount

Guard against undefined element refs.

```svelte
$effect(() => {
  if (!el) return
  console.log(el.offsetHeight)
})

<div bind:this={el}>Content</div>
```

## Avoid Infinite Loops in Effects

Do not read and write the same state in an effect without `untrack`.

Bad:

```svelte
$effect(() => {
  count = count + 1  // ❌ Infinite loop
})
```

Good:

```svelte
import { untrack } from 'svelte'

$effect(() => {
  const current = count
  untrack(() => {
    someOtherState = current
  })
})
```
