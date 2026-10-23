<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    class?: string;
    /** Id of the element that titles the dialog, so a screen reader announces its name. */
    labelledby?: string;
    children?: Snippet<[{ close: () => void }]>;
  };

  let { open = $bindable(false), onOpenChange, class: className = '', labelledby, children }: Props = $props();

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
  <div class="dialog-layer" role="presentation">
    <button
      type="button"
      class="dialog-overlay"
      aria-label="Close dialog"
      onclick={close}
    ></button>
    <div
      data-slot="dialog-content"
      class={['dialog-content', className].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledby}
    >
      {#if children}
        {@render children({ close })}
      {/if}
    </div>
  </div>
{/if}

<style>
  /* A class handed in through `class` lands on `.dialog-content`, which the caller styles with `:global(.its-name)`
     in its own `<style>`. Plain rules here sit in `components`, so the caller's class wins. */
  @layer components {
    .dialog-layer {
      position: fixed;
      inset: 0;
      z-index: 50;
    }

    .dialog-overlay {
      position: fixed;
      inset: 0;
      background-color: color-mix(in oklab, var(--ink) 50%, transparent);
    }

    .dialog-content {
      position: fixed;
      top: 50%;
      left: 50%;
      z-index: 50;
      display: grid;
      gap: 1rem;
      width: 100%;
      max-width: calc(100% - 2rem);
      padding: 1rem;
      translate: -50% -50%;
      border-radius: calc(var(--radius) * 1.8);
      background-color: var(--popover);
      color: var(--popover-foreground);
      font-size: 0.875rem;
      line-height: calc(1.25 / 0.875);
      box-shadow:
        0 0 0 1px color-mix(in oklab, black 5%, transparent),
        0 24px 60px -28px rgb(17 17 19 / 0.55);
    }

    @media (min-width: 40rem) {
      .dialog-content {
        max-width: 24rem;
      }
    }
  }

  :global(.dark .dialog-content) {
    box-shadow:
      0 0 0 1px color-mix(in oklab, white 10%, transparent),
      0 24px 60px -28px rgb(0 0 0 / 0.95);
  }
</style>
