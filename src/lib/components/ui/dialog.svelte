<script lang="ts">
  import { cn } from '@/lib/utils';
  import type { Snippet } from 'svelte';

  type Props = {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    class?: string;
    children?: Snippet<[{ close: () => void }]>;
  };

  let { open = $bindable(false), onOpenChange, class: className = '', children }: Props = $props();

  function close() {
    open = false;
    onOpenChange?.(false);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) close();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="fixed inset-0 z-50" role="presentation">
    <button
      type="button"
      class="fixed inset-0 bg-ink/50"
      aria-label="Close dialog"
      onclick={close}
    ></button>
    <div
      data-slot="dialog-content"
      class={cn(
        'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl bg-popover p-4 text-sm text-popover-foreground shadow-[0_24px_60px_-28px_rgba(17,17,19,0.55)] ring-1 ring-black/5 dark:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)] dark:ring-white/10 sm:max-w-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
    >
      {#if children}
        {@render children({ close })}
      {/if}
    </div>
  </div>
{/if}
