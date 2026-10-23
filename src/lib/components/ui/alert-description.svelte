<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string;
    children?: Snippet;
  };

  let { class: className = '', children, ...restProps }: Props = $props();
</script>

<div data-slot="alert-description" class={['ui-alert-description', className].filter(Boolean).join(' ')} {...restProps}>
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  @layer components {
    :global(:where(.ui-alert-description)) {
      font-size: 0.875rem;
      line-height: calc(1.25 / 0.875);
      color: var(--muted-foreground);
    }
  }
</style>
