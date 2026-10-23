<script lang="ts">
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
  class={['ui-tabs-trigger', ink ? 'ui-tabs-trigger--ink' : '', className].filter(Boolean).join(' ')}
  {onclick}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  @layer components {
    :global(:where(.ui-tabs-trigger)) {
      position: relative;
      display: inline-flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      height: calc(100% - 1px);
      padding: 0.25rem 0.75rem;
      border: 1px solid transparent;
      border-radius: var(--radius);
      font-size: 0.875rem;
      line-height: calc(1.25 / 0.875);
      font-weight: 500;
      white-space: nowrap;
      transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  /* State rules stay outside the layer: Tailwind sorted them after plain utilities, so they used to beat a
     caller's plain class; an unlayered `:where()` rule still loses to a migrated caller's scoped class. */
  :global(:where(.ui-tabs-trigger)[data-state='active']) {
    background-color: var(--background);
    color: var(--foreground);
    box-shadow:
      0 1px 3px 0 rgb(0 0 0 / 0.1),
      0 1px 2px -1px rgb(0 0 0 / 0.1);
  }

  :global(:where(.ui-tabs-trigger.ui-tabs-trigger--ink)[data-state='active']) {
    background-color: var(--ink);
    color: white;
    box-shadow: none;
  }

  :global(:where(.ui-tabs-trigger)[data-state='inactive']) {
    color: color-mix(in oklab, var(--foreground) 60%, transparent);
  }

  :global(:where(.ui-tabs-trigger)[data-state='inactive']:hover) {
    color: var(--foreground);
  }
</style>
