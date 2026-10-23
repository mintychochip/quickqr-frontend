<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		variant = "default",
		...restProps
	}: DropdownMenuPrimitive.ItemProps & {
		inset?: boolean;
		variant?: "default" | "destructive";
	} = $props();
</script>

<DropdownMenuPrimitive.Item
	bind:ref
	data-slot="dropdown-menu-item"
	data-inset={inset}
	data-variant={variant}
	class={["ui-dropdown-menu-item", className].filter(Boolean).join(" ")}
	{...restProps}
/>

<style>
  @layer components {
    :global(:where(.ui-dropdown-menu-item)) {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.375rem;
      border-radius: calc(var(--radius) * 0.8);
      font-size: 0.875rem;
      line-height: calc(1.25 / 0.875);
      cursor: default;
      user-select: none;
      outline: 2px solid transparent;
      outline-offset: 2px;
    }

    :global(:where(.ui-dropdown-menu-item)[data-inset]:not([data-inset='false'])) {
      padding-left: 1.75rem;
    }

    :global(.ui-dropdown-menu-item svg) {
      pointer-events: none;
      flex-shrink: 0;
    }

    :global(.ui-dropdown-menu-item svg:not([class*='size-'])) {
      width: 1rem;
      height: 1rem;
    }
  }

  :global(:where(.ui-dropdown-menu-item):focus) {
    background-color: var(--accent);
    color: var(--accent-foreground);
  }

  :global(:where(.ui-dropdown-menu-item):not([data-variant='destructive']):focus *) {
    color: var(--accent-foreground);
  }

  /* bits-ui sets `data-disabled`, never the `:disabled` pseudo-class. */
  :global(:where(.ui-dropdown-menu-item)[data-disabled]) {
    pointer-events: none;
    opacity: 0.5;
  }

  :global(:where(.ui-dropdown-menu-item)[data-variant='destructive']) {
    color: var(--destructive);
  }

  :global(.ui-dropdown-menu-item[data-variant='destructive'] svg) {
    color: var(--destructive);
  }

  :global(:where(.ui-dropdown-menu-item)[data-variant='destructive']:focus) {
    background-color: color-mix(in oklab, var(--destructive) 10%, transparent);
    color: var(--destructive);
  }

  :global(.dark :where(.ui-dropdown-menu-item)[data-variant='destructive']:focus) {
    background-color: color-mix(in oklab, var(--destructive) 20%, transparent);
  }
</style>
