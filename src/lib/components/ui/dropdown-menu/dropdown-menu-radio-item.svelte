<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import CheckIcon from '@lucide/svelte/icons/check';
	import { type WithoutChild } from "@/lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children: childrenProp,
		closeOnSelect = false,
		...restProps
	}: WithoutChild<DropdownMenuPrimitive.RadioItemProps> = $props();
</script>

<DropdownMenuPrimitive.RadioItem
	bind:ref
	{closeOnSelect}
	data-slot="dropdown-menu-radio-item"
	class={["ui-dropdown-menu-radio-item", className].filter(Boolean).join(" ")}
	{...restProps}
>
	{#snippet children({ checked })}
		<span
			class="ui-dropdown-menu-radio-indicator"
			data-slot="dropdown-menu-radio-item-indicator"
		>
			{#if checked}
				<CheckIcon  />
			{/if}
		</span>
		{@render childrenProp?.({ checked })}
	{/snippet}
</DropdownMenuPrimitive.RadioItem>

<style>
  @layer components {
    :global(:where(.ui-dropdown-menu-radio-item)) {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 2rem 0.25rem 0.375rem;
      border-radius: calc(var(--radius) * 0.8);
      font-size: 0.875rem;
      line-height: calc(1.25 / 0.875);
      cursor: default;
      user-select: none;
      outline: 2px solid transparent;
      outline-offset: 2px;
    }

    :global(:where(.ui-dropdown-menu-radio-item)[data-inset]:not([data-inset='false'])) {
      padding-left: 1.75rem;
    }

    :global(.ui-dropdown-menu-radio-item svg) {
      pointer-events: none;
      flex-shrink: 0;
    }

    :global(.ui-dropdown-menu-radio-item svg:not([class*='size-'])) {
      width: 1rem;
      height: 1rem;
    }

    :global(.ui-dropdown-menu-radio-indicator) {
      position: absolute;
      right: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
  }

  :global(:where(.ui-dropdown-menu-radio-item):focus) {
    background-color: var(--accent);
    color: var(--accent-foreground);
  }

  :global(:where(.ui-dropdown-menu-radio-item):focus *) {
    color: var(--accent-foreground);
  }

  /* bits-ui sets `data-disabled`, never the `:disabled` pseudo-class. */
  :global(:where(.ui-dropdown-menu-radio-item)[data-disabled]) {
    pointer-events: none;
    opacity: 0.5;
  }
</style>
