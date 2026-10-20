<script lang="ts" module>
  import { cva, type VariantProps } from 'class-variance-authority';

  const alertVariants = cva(
    'relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm',
    {
      variants: {
        variant: {
          default: 'bg-card text-card-foreground',
          destructive: 'bg-card text-destructive',
        },
      },
      defaultVariants: {
        variant: 'default',
      },
    },
  );

  export type AlertVariant = VariantProps<typeof alertVariants>['variant'];
</script>

<script lang="ts">
  import { cn } from '@/lib/utils';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  type Props = HTMLAttributes<HTMLDivElement> & {
    variant?: AlertVariant;
    class?: string;
    children?: Snippet;
  };

  let { variant = 'default', class: className = '', children, ...restProps }: Props = $props();
</script>

<div role="alert" data-slot="alert" class={cn(alertVariants({ variant }), className)} {...restProps}>
  {#if children}
    {@render children()}
  {/if}
</div>
