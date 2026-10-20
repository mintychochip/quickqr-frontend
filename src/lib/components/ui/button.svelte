<script lang="ts" module>
  import { cva, type VariantProps } from 'class-variance-authority';

  export const buttonVariants = cva(
    'group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
    {
      variants: {
        variant: {
          default: 'bg-primary text-primary-foreground hover:bg-primary/80',
          outline:
            'border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
          secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          ghost: 'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50',
          destructive:
            'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20',
          link: 'text-primary underline-offset-4 hover:underline',
        },
        size: {
          default: 'h-8 gap-1.5 px-2.5',
          xs: 'h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*="size-"])]:size-3',
          sm: 'h-7 gap-1 rounded-md px-2.5 text-[0.8rem] [&_svg:not([class*="size-"])]:size-3.5',
          lg: 'h-9 gap-1.5 px-2.5',
          icon: 'size-8',
          'icon-sm': 'size-7',
        },
      },
      defaultVariants: {
        variant: 'default',
        size: 'default',
      },
    },
  );

  export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
  export type ButtonSize = VariantProps<typeof buttonVariants>['size'];
</script>

<script lang="ts">
  import { cn } from '@/lib/utils';
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

  type Props = {
    variant?: ButtonVariant;
    size?: ButtonSize;
    class?: string;
    href?: string;
    target?: HTMLAnchorAttributes['target'];
    rel?: string;
    children?: Snippet;
  } & Omit<HTMLButtonAttributes, 'href'>;

  let {
    variant = 'default',
    size = 'default',
    class: className = '',
    href,
    target,
    rel,
    children,
    ...restProps
  }: Props = $props();

  const classes = $derived(cn(buttonVariants({ variant, size }), className));
</script>

{#if href}
  <a data-slot="button" {href} {target} {rel} class={classes}>
    {#if children}
      {@render children()}
    {/if}
  </a>
{:else}
  <button data-slot="button" class={classes} {...restProps}>
    {#if children}
      {@render children()}
    {/if}
  </button>
{/if}
