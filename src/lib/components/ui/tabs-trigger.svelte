<script lang="ts">
  import { cn } from '@/lib/utils';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  type Props = HTMLButtonAttributes & {
    value: string;
    activeValue: string;
    class?: string;
    onclick?: () => void;
    /** Solid ink active tab, used in the auth dialog. */
    ink?: boolean;
    children?: Snippet;
  };

  let {
    value,
    activeValue,
    class: className = '',
    onclick,
    ink = false,
    children,
    ...restProps
  }: Props = $props();

  const active = $derived(activeValue === value);
</script>

<button
  type="button"
  role="tab"
  aria-selected={active}
  data-state={active ? 'active' : 'inactive'}
  data-slot="tabs-trigger"
  class={cn(
    'relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-all',
    active
      ? ink
        ? 'bg-ink text-white shadow-none'
        : 'bg-background text-foreground shadow-sm'
      : 'text-foreground/60 hover:text-foreground',
    className,
  )}
  {onclick}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</button>
