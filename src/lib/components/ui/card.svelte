<script lang="ts">
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
  class={['ui-card', className].filter(Boolean).join(' ')}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  /* See docs/superpowers/specs/2026-10-23-tailwind-exit-design.md §3 and §3.1: primitives live in the
     `components` layer, wrapped in `:global(:where(…))`, so a class handed in through `class` always wins. */
  @layer components {
    :global(:where(.ui-card)) {
      --card-spacing: 1rem;
      display: flex;
      flex-direction: column;
      gap: var(--card-spacing);
      overflow: hidden;
      padding-block: var(--card-spacing);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) * 1.8);
      background-color: var(--card);
      color: var(--card-foreground);
      font-size: 0.875rem;
      line-height: calc(1.25 / 0.875);
      box-shadow:
        0 1px 2px color-mix(in oklab, var(--foreground) 5%, transparent),
        0 14px 34px -26px color-mix(in oklab, var(--foreground) 30%, transparent);
    }

  }

  :global(.dark :where(.ui-card)) {
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.045),
      0 1px 2px rgb(0 0 0 / 0.5),
      0 18px 40px -26px rgb(0 0 0 / 0.8);
  }
</style>
