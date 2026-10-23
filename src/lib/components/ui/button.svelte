<script lang="ts" module>
  export const BUTTON_VARIANTS = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link', 'punch'] as const;
  export const BUTTON_SIZES = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-sm'] as const;

  export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
  export type ButtonSize = (typeof BUTTON_SIZES)[number];

  /**
   * The classes for a variant and size. The styles behind them are at the bottom of this file. Sizes are spelled
   * `--size-x` because `--default` would otherwise mean both "the default variant" and "the default size".
   */
  export function buttonVariants({
    variant = 'default',
    size = 'default',
  }: { variant?: ButtonVariant; size?: ButtonSize } = {}) {
    return `ui-button ui-button--${variant} ui-button--size-${size}`;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

  type Props = {
    variant?: ButtonVariant;
    size?: ButtonSize;
    class?: string;
    href?: string;
    target?: HTMLAnchorAttributes['target'];
    rel?: string;
    children?: Snippet;
  } & Omit<HTMLButtonAttributes, 'href'>;

  let {
    variant = 'default',
    size = 'default',
    class: className = '',
    href,
    target,
    rel,
    children,
    ...restProps
  }: Props = $props();

  const classes = $derived([buttonVariants({ variant, size }), className].filter(Boolean).join(' '));
</script>

{#if href}
  <a data-slot="button" {href} {target} {rel} class={classes}>
    {#if children}
      {@render children()}
    {/if}
  </a>
{:else}
  <button data-slot="button" class={classes} {...restProps}>
    {#if children}
      {@render children()}
    {/if}
  </button>
{/if}

<style>
  /* Plain rules sit in the `components` layer, so a class handed in through `class` beats them — what
     `tailwind-merge` did by deleting the losing class. Variant rules — media, dark, state — stay OUT of the layer,
     because Tailwind sorted those after plain utilities and they therefore used to beat a caller's plain class; an
     unlayered `:where()` rule still loses to a migrated caller's scoped class, which carries specificity.
     See docs/superpowers/specs/2026-10-23-tailwind-exit-design.md §3.1. */
  @layer components {
    :global(:where(.ui-button)) {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      height: 2rem;
      padding-inline: 0.625rem;
      border: 1px solid transparent;
      border-radius: calc(var(--radius) * 1.4);
      background-clip: padding-box;
      font-size: 0.875rem;
      /* Tailwind's `text-sm` is a *ratio*, not a length: a size that changes the font-size must carry the pair
         with it, or content-sized buttons come out a pixel or two taller. */
      line-height: calc(1.25 / 0.875);
      font-weight: 500;
      white-space: nowrap;
      user-select: none;
      outline-style: none;
      transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* The colours live with their variant: a variant that sets none inherits the page's text colour, which is
       what the outline and ghost buttons did before this file stopped being Tailwind. */
    :global(:where(.ui-button.ui-button--default)) {
      background-color: var(--primary);
      color: var(--primary-foreground);
    }

    :global(:where(.ui-button.ui-button--outline)) {
      border-color: var(--border);
      background-color: var(--background);
    }

    :global(:where(.ui-button.ui-button--secondary)) {
      background-color: var(--secondary);
      color: var(--secondary-foreground);
    }

    :global(:where(.ui-button.ui-button--ghost)) {
      background-color: transparent;
      color: inherit;
    }

    :global(:where(.ui-button.ui-button--destructive)) {
      background-color: color-mix(in oklab, var(--destructive) 10%, transparent);
      color: var(--destructive);
    }

    :global(:where(.ui-button.ui-button--link)) {
      background-color: transparent;
      color: var(--primary);
      text-underline-offset: 4px;
    }

    /* The lime call to action: the studio, the create panel, the menu and link-page sections, the 404. */
    :global(:where(.ui-button.ui-button--punch)) {
      background-color: var(--punch);
      color: var(--ink);
    }

    /* The children come from the caller, so no scoping of this component's own could ever reach them. */
    :global(.ui-button svg) {
      pointer-events: none;
      flex-shrink: 0;
    }

    :global(.ui-button svg:not([class*='size-'])) {
      width: 1rem;
      height: 1rem;
    }

    :global(:where(.ui-button.ui-button--size-xs)) {
      height: 1.5rem;
      gap: 0.25rem;
      padding-inline: 0.5rem;
      border-radius: calc(var(--radius) * 0.8);
      font-size: 0.75rem;
      line-height: calc(1 / 0.75);
    }

    :global(.ui-button.ui-button--size-xs svg:not([class*='size-'])) {
      width: 0.75rem;
      height: 0.75rem;
    }

    :global(:where(.ui-button.ui-button--size-sm)) {
      height: 1.75rem;
      gap: 0.25rem;
      padding-inline: 0.625rem;
      border-radius: calc(var(--radius) * 0.8);
      font-size: 0.8rem;
      line-height: calc(1.25 / 0.875);
    }

    :global(.ui-button.ui-button--size-sm svg:not([class*='size-'])) {
      width: 0.875rem;
      height: 0.875rem;
    }

    :global(:where(.ui-button.ui-button--size-lg)) {
      height: 2.25rem;
      gap: 0.375rem;
      padding-inline: 0.625rem;
    }

    :global(:where(.ui-button.ui-button--size-icon)) {
      width: 2rem;
      height: 2rem;
      padding-inline: 0;
    }

    :global(:where(.ui-button.ui-button--size-icon-sm)) {
      width: 1.75rem;
      height: 1.75rem;
      padding-inline: 0;
    }
  }

  :global(:where(.ui-button.ui-button--default):hover) {
    background-color: color-mix(in oklab, var(--primary) 80%, transparent);
  }

  :global(:where(.ui-button.ui-button--outline):hover) {
    background-color: var(--muted);
    color: var(--foreground);
  }

  :global(:where(.ui-button.ui-button--secondary):hover) {
    background-color: color-mix(in oklab, var(--secondary) 80%, transparent);
  }

  :global(:where(.ui-button.ui-button--ghost):hover) {
    background-color: var(--muted);
    color: var(--foreground);
  }

  :global(:where(.ui-button.ui-button--destructive):hover) {
    background-color: color-mix(in oklab, var(--destructive) 20%, transparent);
  }

  :global(:where(.ui-button.ui-button--link):hover) {
    background-color: transparent;
    text-decoration-line: underline;
  }

  :global(:where(.ui-button.ui-button--punch):hover) {
    background-color: color-mix(in oklab, var(--punch) 80%, transparent);
  }

  :global(:where(.ui-button):focus-visible) {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  :global(:where(.ui-button.ui-button--destructive):focus-visible) {
    border-color: color-mix(in oklab, var(--destructive) 40%, transparent);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent);
  }

  :global(:where(.ui-button):active:not([aria-haspopup])) {
    translate: 0 1px;
  }

  :global(:where(.ui-button):disabled) {
    pointer-events: none;
    opacity: 0.5;
  }

  :global(.dark :where(.ui-button.ui-button--outline)) {
    border-color: var(--input);
    background-color: color-mix(in oklab, var(--input) 30%, transparent);
  }

  :global(.dark :where(.ui-button.ui-button--outline):hover) {
    background-color: color-mix(in oklab, var(--input) 50%, transparent);
  }

  :global(.dark :where(.ui-button.ui-button--ghost):hover) {
    background-color: color-mix(in oklab, var(--muted) 50%, transparent);
  }
</style>
