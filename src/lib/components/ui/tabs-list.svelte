<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string;
    children?: Snippet;
  };

  let { class: className = '', children, ...restProps }: Props = $props();
</script>

<div
  data-slot="tabs-list"
  class={['ui-tabs-list', className].filter(Boolean).join(' ')}
  {...restProps}
  role="tablist"
>
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  @layer components {
    :global(:where(.ui-tabs-list)) {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      justify-content: center;
      padding: 3px;
      border-radius: calc(var(--radius) * 1.4);
      background-color: var(--muted);
      color: var(--muted-foreground);
    }
  }
</style>
