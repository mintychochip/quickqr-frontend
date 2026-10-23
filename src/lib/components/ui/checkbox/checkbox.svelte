<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from "bits-ui";
	import CheckIcon from '@lucide/svelte/icons/check';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import { type WithoutChildrenOrChild } from "@/lib/utils.js";

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props();
</script>

<CheckboxPrimitive.Root
	bind:ref
	data-slot="checkbox"
	class={["ui-checkbox", className].filter(Boolean).join(" ")}
	bind:checked
	bind:indeterminate
	{...restProps}
>
	{#snippet children({ checked, indeterminate })}
		<div data-slot="checkbox-indicator" class="ui-checkbox-indicator">
			{#if checked}
				<CheckIcon  />
			{:else if indeterminate}
				<MinusIcon  />
			{/if}
		</div>
	{/snippet}
</CheckboxPrimitive.Root>

<style>
  /* Plain rules in the `components` layer; variant rules (attribute, dark, state) outside it. The two
     `group-has-…/field` variants the Tailwind version carried were dead: nothing in the repo uses `group/field`
     or `group/field-label`. See docs/superpowers/specs/2026-10-23-tailwind-exit-design.md §3.1. */
  @layer components {
    :global(:where(.ui-checkbox)) {
      position: relative;
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      border: 1px solid var(--input);
      border-radius: 4px;
      outline-style: none;
      transition:
        color 150ms cubic-bezier(0.4, 0, 0.2, 1),
        background-color 150ms cubic-bezier(0.4, 0, 0.2, 1),
        border-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* The tap target Tailwind expressed as `after:absolute after:-inset-x-3 after:-inset-y-2`. */
    :global(.ui-checkbox::after) {
      content: "";
      position: absolute;
      inset-inline: -0.75rem;
      inset-block: -0.5rem;
    }

    :global(.ui-checkbox-indicator) {
      display: grid;
      place-content: center;
      color: currentColor;
      transition: none;
    }

    :global(.ui-checkbox-indicator > svg) {
      width: 0.875rem;
      height: 0.875rem;
    }
  }

  :global(:where(.ui-checkbox)[data-state='checked']),
  :global(:where(.ui-checkbox)[data-checked]:not([data-checked='false'])) {
    border-color: var(--primary);
    background-color: var(--primary);
    color: var(--primary-foreground);
  }

  :global(.dark :where(.ui-checkbox)) {
    background-color: color-mix(in oklab, var(--input) 30%, transparent);
  }

  :global(.dark :where(.ui-checkbox)[data-state='checked']),
  :global(.dark :where(.ui-checkbox)[data-checked]:not([data-checked='false'])) {
    background-color: var(--primary);
  }

  :global(:where(.ui-checkbox)[aria-invalid='true']) {
    border-color: var(--destructive);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent);
  }

  :global(.dark :where(.ui-checkbox)[aria-invalid='true']) {
    border-color: color-mix(in oklab, var(--destructive) 50%, transparent);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent);
  }

  :global(:where(.ui-checkbox):focus-visible) {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
  }

  :global(:where(.ui-checkbox):disabled) {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
