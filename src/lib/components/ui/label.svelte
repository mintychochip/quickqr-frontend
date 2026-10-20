<script lang="ts">
  import { cn } from '@/lib/utils';
  import type { HTMLLabelAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  type Props = HTMLLabelAttributes & {
    class?: string;
    children?: Snippet;
  };

  let { class: className = '', children, ...restProps }: Props = $props();
</script>

<label
  data-slot="label"
  class={cn(
    'flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
    className,
  )}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</label>
