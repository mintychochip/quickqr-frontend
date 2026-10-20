<script lang="ts" module>
  import { cva, type VariantProps } from 'class-variance-authority';

  export const badgeVariants = cva(
    'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap',
    {
      variants: {
        variant: {
          default: 'bg-primary text-primary-foreground',
          secondary: 'bg-secondary text-secondary-foreground',
          destructive: 'bg-destructive/10 text-destructive',
          outline: 'border-border text-foreground',
        },
      },
      defaultVariants: {
        variant: 'default',
      },
    },
  );

  export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
</script>

<script lang="ts">
  import { cn } from '@/lib/utils';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  type Props = HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant;
    class?: string;
    children?: Snippet;
  };

  let { variant = 'default', class: className = '', children, ...restProps }: Props = $props();
</script>

<span data-slot="badge" class={cn(badgeVariants({ variant }), className)} {...restProps}>
  {#if children}
    {@render children()}
  {/if}
</span>
