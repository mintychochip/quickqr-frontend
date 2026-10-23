<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		...restProps
	}: ComponentProps<typeof DropdownMenuPrimitive.GroupHeading> & {
		inset?: boolean;
	} = $props();
</script>

<DropdownMenuPrimitive.GroupHeading
	bind:ref
	data-slot="dropdown-menu-group-heading"
	data-inset={inset}
	class={["ui-dropdown-menu-group-heading", className].filter(Boolean).join(" ")}
	{...restProps}
/>

<style>
  @layer components {
    :global(:where(.ui-dropdown-menu-group-heading)) {
      padding: 0.25rem 0.375rem;
      color: var(--muted-foreground);
      font-size: 0.75rem;
      line-height: calc(1 / 0.75);
      font-weight: 500;
    }

    :global(:where(.ui-dropdown-menu-group-heading)[data-inset]:not([data-inset='false'])) {
      padding-left: 1.75rem;
    }
  }
</style>
