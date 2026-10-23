<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { type WithElementRef } from "@/lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		inset?: boolean;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="dropdown-menu-label"
	data-inset={inset}
	class={["ui-dropdown-menu-label", className].filter(Boolean).join(" ")}
	{...restProps}
>
	{@render children?.()}
</div>

<style>
  @layer components {
    :global(:where(.ui-dropdown-menu-label)) {
      padding: 0.25rem 0.375rem;
      color: var(--muted-foreground);
      font-size: 0.75rem;
      line-height: calc(1 / 0.75);
      font-weight: 500;
    }

    :global(:where(.ui-dropdown-menu-label)[data-inset]:not([data-inset='false'])) {
      padding-left: 1.75rem;
    }
  }
</style>
