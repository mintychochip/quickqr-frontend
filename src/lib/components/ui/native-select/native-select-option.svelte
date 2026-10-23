<script lang="ts">
	import { type WithElementRef } from "@/lib/utils.js";
	import type { HTMLOptionAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLOptionAttributes> = $props();
</script>

<option
	bind:this={ref}
	data-slot="native-select-option"
	class={["ui-native-select-option", className].filter(Boolean).join(" ")}
	{...restProps}
>
	{@render children?.()}
</option>

<style>
  @layer components {
    :global(:where(.ui-native-select-option)) {
      background-color: Canvas;
      color: CanvasText;
    }
  }
</style>
