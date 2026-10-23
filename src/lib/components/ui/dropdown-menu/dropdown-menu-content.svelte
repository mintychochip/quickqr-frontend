<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { type WithoutChildrenOrChild } from "@/lib/utils.js";
	import DropdownMenuPortal from "./dropdown-menu-portal.svelte";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		sideOffset = 4,
		align = "start",
		portalProps,
		class: className,
		...restProps
	}: DropdownMenuPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DropdownMenuPortal>>;
	} = $props();
</script>

<DropdownMenuPortal {...portalProps}>
	<DropdownMenuPrimitive.Content
		bind:ref
		data-slot="dropdown-menu-content"
		{sideOffset}
		{align}
		class={["ui-dropdown-menu-content", className].filter(Boolean).join(" ")}
		{...restProps}
	/>
</DropdownMenuPortal>

<style>
  @layer components {
    :global(:where(.ui-dropdown-menu-content)) {
      z-index: 50;
      min-width: 8rem;
      width: var(--bits-dropdown-menu-anchor-width, auto);
      max-height: var(--bits-dropdown-menu-content-available-height, none);
      padding: 0.25rem;
      overflow-x: hidden;
      overflow-y: auto;
      border-radius: var(--radius);
      background-color: var(--popover);
      color: var(--popover-foreground);
      transform-origin: var(--bits-dropdown-menu-content-transform-origin, center);
      box-shadow:
        0 0 0 1px color-mix(in oklab, var(--foreground) 10%, transparent),
        0 4px 6px -1px rgb(0 0 0 / 0.1),
        0 2px 4px -2px rgb(0 0 0 / 0.1);
    }
  }

  /* The Tailwind version composed `animate-in fade-in-0 zoom-in-95 slide-in-from-*` from `tw-animate-css`,
     which read four custom properties into one `enter` keyframe. Same idea, one keyframe each way. */
  :global(:where(.ui-dropdown-menu-content)[data-state='open']),
  :global(:where(.ui-dropdown-menu-content)[data-open]:not([data-open='false'])) {
    animation: ui-dropdown-in 100ms ease;
  }

  :global(:where(.ui-dropdown-menu-content)[data-side='bottom'][data-state='open']) {
    --ui-dropdown-from-y: -0.5rem;
  }

  :global(:where(.ui-dropdown-menu-content)[data-side='top'][data-state='open']) {
    --ui-dropdown-from-y: 0.5rem;
  }

  :global(:where(.ui-dropdown-menu-content)[data-side='left'][data-state='open']) {
    --ui-dropdown-from-x: 0.5rem;
  }

  :global(:where(.ui-dropdown-menu-content)[data-side='right'][data-state='open']) {
    --ui-dropdown-from-x: -0.5rem;
  }

  :global(:where(.ui-dropdown-menu-content)[data-state='closed']),
  :global(:where(.ui-dropdown-menu-content)[data-closed]:not([data-closed='false'])) {
    animation: ui-dropdown-out 100ms ease;
    overflow: hidden;
  }

  @keyframes ui-dropdown-in {
    from {
      opacity: 0;
      transform: translate(var(--ui-dropdown-from-x, 0), var(--ui-dropdown-from-y, 0)) scale(0.95);
    }
  }

  @keyframes ui-dropdown-out {
    to {
      opacity: 0;
      transform: scale(0.95);
    }
  }
</style>
