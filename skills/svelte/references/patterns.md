# Component Patterns

Common Svelte 5 component patterns.

## Forwarding Props

```svelte
<script>
  let { children, variant = 'default', ...rest } = $props()
</script>

<button class="btn btn-{variant}" {...rest}>
  {@render children()}
</button>
```

## Reactive Context

Use getters so consumers get reactive access to `$state` values.

```svelte
<!-- Provider.svelte -->
<script>
  import { setContext } from 'svelte'

  let { children } = $props()
  let count = $state(0)

  setContext('counter', {
    get count() { return count },
    increment: () => count++,
  })
</script>

{@render children()}

<!-- Consumer.svelte -->
<script>
  import { getContext } from 'svelte'
  const { count, increment } = getContext('counter')
</script>

<button onclick={increment}>{count}</button>
```

## Controlled Input

```svelte
<script>
  let { value = $bindable(''), oninput, ...rest } = $props()
</script>

<input bind:value oninput={e => oninput?.(e)} {...rest} />
```

## Snippets with Parameters

```svelte
<!-- Parent -->
<List {items}>
  {#snippet item(data, index)}
    <span>{index}: {data.name}</span>
  {/snippet}
</List>

<!-- List.svelte -->
<script>
  let { items, item } = $props()
</script>

{#each items as data, index (data.id)}
  {@render item(data, index)}
{/each}
```

## Conditional Snippets

```svelte
<script>
  let { open, onclose, title, children, footer } = $props()
</script>

{#if open}
  <div class="modal-backdrop" onclick={onclose}>
    <div class="modal" onclick={e => e.stopPropagation()}>
      {#if typeof title === 'string'}
        <h2>{title}</h2>
      {:else}
        {@render title?.()}
      {/if}
      {@render children()}
      {#if footer}
        {@render footer()}
      {/if}
    </div>
  </div>
{/if}
```

## Action-Style Mount

```svelte
<script>
  let { children, onmount } = $props()
  let element

  $effect(() => {
    if (element && onmount) {
      return onmount(element)
    }
  })
</script>

<div bind:this={element}>
  {@render children()}
</div>
```
