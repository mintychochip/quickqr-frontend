<script lang="ts" module>
  export const BADGE_VARIANTS = ['default', 'secondary', 'destructive', 'outline'] as const;

  export type BadgeVariant = (typeof BADGE_VARIANTS)[number];

  /** The classes for a variant. The styles are at the bottom of this file, in `:where()` so a caller's class wins. */
  export function badgeVariants({ variant = 'default' }: { variant?: BadgeVariant } = {}) {
    return `ui-badge ui-badge--${variant}`;
  }
</script>

<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  type Props = HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant;
    class?: string;
    children?: Snippet;
  };

  let { variant = 'default', class: className = '', children, ...restProps }: Props = $props();
</script>

<span data-slot="badge" class={[badgeVariants({ variant }), className].filter(Boolean).join(' ')} {...restProps}>
  {#if children}
    {@render children()}
  {/if}
</span>

<style>
  @layer components {
    :global(:where(.ui-badge)) {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      width: fit-content;
      height: 1.25rem;
      padding: 0.125rem 0.5rem;
      overflow: hidden;
      border: 1px solid transparent;
      border-radius: calc(var(--radius) * 2.6);
      font-size: 0.75rem;
      line-height: calc(1 / 0.75);
      font-weight: 500;
      white-space: nowrap;
    }

    :global(:where(.ui-badge.ui-badge--default)) {
      background-color: var(--primary);
      color: var(--primary-foreground);
    }

    :global(:where(.ui-badge.ui-badge--secondary)) {
      background-color: var(--secondary);
      color: var(--secondary-foreground);
    }

    :global(:where(.ui-badge.ui-badge--destructive)) {
      background-color: color-mix(in oklab, var(--destructive) 10%, transparent);
      color: var(--destructive);
    }

    :global(:where(.ui-badge.ui-badge--outline)) {
      border-color: var(--border);
      color: var(--foreground);
    }
  }
</style>
