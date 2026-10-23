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
      border-radius: calc(var(--radius) * 1.8);
      background-color: var(--card);
      color: var(--card-foreground);
      font-size: 0.875rem;
      line-height: calc(1.25 / 0.875);
      box-shadow:
        0 0 0 1px color-mix(in oklab, black 5%, transparent),
        0 18px 50px -32px rgb(17 17 19 / 0.55);
    }

  }

  :global(.dark :where(.ui-card)) {
    box-shadow:
      0 0 0 1px color-mix(in oklab, white 10%, transparent),
      0 18px 50px -32px rgb(0 0 0 / 0.9);
  }
</style>
