<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'value'> & {
    class?: string;
    value?: HTMLInputAttributes['value'];
  };

  let { class: className = '', value = $bindable(), ...restProps }: Props = $props();
</script>

<input data-slot="input" bind:value class={['ui-input', className].filter(Boolean).join(' ')} {...restProps} />

<style>
  /* Plain rules live in the `components` layer, so a class handed in through `class` beats them (what
     `tailwind-merge` did by deleting the losing class). Variant rules — media, dark, state — stay OUT of the
     layer: Tailwind sorted those after plain utilities, so they used to beat a caller's plain class, and an
     unlayered `:where()` rule still loses to a migrated caller's scoped class, which carries specificity.
     See docs/superpowers/specs/2026-10-23-tailwind-exit-design.md §3.1. */
  @layer components {
    :global(:where(.ui-input)) {
      height: 2rem;
      width: 100%;
      min-width: 0;
      padding: 0.25rem 0.625rem;
      border: 1px solid var(--input);
      border-radius: var(--radius);
      background-color: transparent;
      font-size: 1rem;
      line-height: calc(1.5 / 1);
      outline-style: none;
      transition:
        color 150ms cubic-bezier(0.4, 0, 0.2, 1),
        background-color 150ms cubic-bezier(0.4, 0, 0.2, 1),
        border-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    :global(.ui-input::placeholder) {
      color: var(--muted-foreground);
    }
  }

  :global(:where(.ui-input):focus-visible) {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
  }

  :global(:where(.ui-input):disabled) {
    pointer-events: none;
    cursor: not-allowed;
    opacity: 0.5;
  }

  @media (min-width: 48rem) {
    :global(:where(.ui-input)) {
      font-size: 0.875rem;
      line-height: calc(1.25 / 0.875);
    }
  }
</style>
