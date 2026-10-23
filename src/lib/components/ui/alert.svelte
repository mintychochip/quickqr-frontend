<script lang="ts" module>
  export const ALERT_VARIANTS = ['default', 'destructive'] as const;

  export type AlertVariant = (typeof ALERT_VARIANTS)[number];

  /** The classes for a variant. The styles are at the bottom of this file, in `:where()` so a caller's class wins. */
  export function alertVariants({ variant = 'default' }: { variant?: AlertVariant } = {}) {
    return `ui-alert ui-alert--${variant}`;
  }
</script>

<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  type Props = HTMLAttributes<HTMLDivElement> & {
    variant?: AlertVariant;
    class?: string;
    children?: Snippet;
  };

  let { variant = 'default', class: className = '', children, ...restProps }: Props = $props();
</script>

<div role="alert" data-slot="alert" class={[alertVariants({ variant }), className].filter(Boolean).join(' ')} {...restProps}>
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  @layer components {
    :global(:where(.ui-alert)) {
      position: relative;
      display: grid;
      gap: 0.125rem;
      width: 100%;
      padding: 0.5rem 0.625rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 0.875rem;
      line-height: calc(1.25 / 0.875);
      text-align: left;
    }

    :global(:where(.ui-alert.ui-alert--default)) {
      background-color: var(--card);
      color: var(--card-foreground);
    }

    :global(:where(.ui-alert.ui-alert--destructive)) {
      background-color: var(--card);
      color: var(--destructive);
    }
  }
</style>
