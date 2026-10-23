<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DropdownMenuPrimitive.SeparatorProps = $props();
</script>

<DropdownMenuPrimitive.Separator
	bind:ref
	data-slot="dropdown-menu-separator"
	class={["ui-dropdown-menu-separator", className].filter(Boolean).join(" ")}
	{...restProps}
/>

<style>
  @layer components {
    :global(:where(.ui-dropdown-menu-separator)) {
      height: 1px;
      margin-block: 0.25rem;
      margin-inline: -0.25rem;
      background-color: var(--border);
    }
  }
</style>
