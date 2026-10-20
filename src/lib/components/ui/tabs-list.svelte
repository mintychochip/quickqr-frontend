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
  data-slot="tabs-list"
  class={cn(
    'inline-flex w-fit items-center justify-center rounded-xl bg-muted p-[3px] text-muted-foreground',
    className,
  )}
  {...restProps}
  role="tablist"
>
  {#if children}
    {@render children()}
  {/if}
</div>
