<script lang="ts">
  import type { HTMLLabelAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  type Props = HTMLLabelAttributes & {
    class?: string;
    children?: Snippet;
  };

  let { class: className = '', children, ...restProps }: Props = $props();
</script>

<label data-slot="label" class={['ui-label', className].filter(Boolean).join(' ')} {...restProps}>
  {#if children}
    {@render children()}
  {/if}
</label>

<style>
  @layer components {
    :global(:where(.ui-label)) {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      line-height: 1;
      font-weight: 500;
      user-select: none;
    }

  }

  :global(.peer:disabled ~ .ui-label) {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
