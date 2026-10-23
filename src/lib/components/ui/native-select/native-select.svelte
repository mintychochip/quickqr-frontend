<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { type WithElementRef } from "@/lib/utils.js";
	import type { HTMLSelectAttributes } from "svelte/elements";

	type NativeSelectProps = Omit<WithElementRef<HTMLSelectAttributes>, "size"> & {
		size?: "sm" | "default";
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		size = "default",
		children,
		...restProps
	}: NativeSelectProps = $props();
</script>

<div
	class={["ui-native-select", className].filter(Boolean).join(" ")}
	data-slot="native-select-wrapper"
	data-size={size}
>
	<select
		bind:value
		bind:this={ref}
		data-slot="native-select"
		data-size={size}
		class="ui-native-select-field"
		{...restProps}
	>
		{@render children?.()}
	</select>
	<ChevronDownIcon class="ui-native-select-icon" aria-hidden data-slot="native-select-icon" />
</div>

<style>
  @layer components {
    :global(:where(.ui-native-select)) {
      position: relative;
      width: fit-content;
    }

    :global(:where(.ui-native-select-field)) {
      height: 2rem;
      width: 100%;
      min-width: 0;
      appearance: none;
      padding: 0.25rem 2rem 0.25rem 0.625rem;
      border: 1px solid var(--input);
      border-radius: var(--radius);
      background-color: transparent;
      font-size: 1rem;
      line-height: calc(1.5 / 1);
      user-select: none;
      outline-style: none;
      transition:
        color 150ms cubic-bezier(0.4, 0, 0.2, 1),
        background-color 150ms cubic-bezier(0.4, 0, 0.2, 1),
        border-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    :global(.ui-native-select-field::placeholder) {
      color: var(--muted-foreground);
    }

    :global(.ui-native-select-field::selection) {
      background-color: var(--primary);
      color: var(--primary-foreground);
    }

    /* The icon is a child component's element, so this rule has to be global; `ui-` keeps the name out of the way. */
    :global(.ui-native-select-icon) {
      position: absolute;
      top: 50%;
      right: 0.625rem;
      width: 1rem;
      height: 1rem;
      translate: 0 -50%;
      pointer-events: none;
      user-select: none;
      color: var(--muted-foreground);
    }

    @media (min-width: 48rem) {
      :global(:where(.ui-native-select-field)) {
        font-size: 0.875rem;
        line-height: calc(1.25 / 0.875);
      }
    }
  }

  :global(:where(.ui-native-select):has(select:disabled)) {
    opacity: 0.5;
  }

  :global(.dark :where(.ui-native-select-field)) {
    background-color: color-mix(in oklab, var(--input) 30%, transparent);
  }

  :global(.dark :where(.ui-native-select-field):hover) {
    background-color: color-mix(in oklab, var(--input) 50%, transparent);
  }

  :global(:where(.ui-native-select-field)[data-size='sm']) {
    height: 1.75rem;
    padding-block: 0.125rem;
    border-radius: min(calc(var(--radius) * 0.8), 10px);
  }

  :global(:where(.ui-native-select-field):focus-visible) {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
  }

  :global(:where(.ui-native-select-field)[aria-invalid='true']) {
    border-color: var(--destructive);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent);
  }

  :global(.dark :where(.ui-native-select-field)[aria-invalid='true']) {
    border-color: color-mix(in oklab, var(--destructive) 50%, transparent);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent);
  }

  :global(:where(.ui-native-select-field):disabled) {
    pointer-events: none;
    cursor: not-allowed;
  }
</style>
