<script lang="ts">
  import { cn } from '@/lib/utils';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string;
    children?: Snippet;
  };

  let { class: className = '', children, ...restProps }: Props = $props();
</script>

<div
  data-slot="alert-description"
  class={cn('text-sm text-muted-foreground', className)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</div>
