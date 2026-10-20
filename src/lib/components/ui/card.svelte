<script lang="ts">
  import { cn } from '@/lib/utils';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string;
    size?: 'default' | 'sm';
    children?: Snippet;
  };

  let { class: className = '', size = 'default', children, ...restProps }: Props = $props();
</script>

<div
  data-slot="card"
  data-size={size}
  class={cn(
    'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-2xl bg-card py-(--card-spacing) text-sm text-card-foreground shadow-[0_18px_50px_-32px_rgba(17,17,19,0.55)] ring-1 ring-black/5 dark:shadow-[0_18px_50px_-32px_rgba(0,0,0,0.9)] dark:ring-white/10 [--card-spacing:--spacing(4)]',
    className,
  )}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</div>
