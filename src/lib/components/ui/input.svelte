<script lang="ts">
  import { cn } from '@/lib/utils';
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'value'> & {
    class?: string;
    value?: HTMLInputAttributes['value'];
  };

  let { class: className = '', value = $bindable(), ...restProps }: Props = $props();
</script>

<input
  data-slot="input"
  bind:value
  class={cn(
    'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    className,
  )}
  {...restProps}
/>
