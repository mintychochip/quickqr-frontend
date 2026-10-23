<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Moon from '@lucide/svelte/icons/moon';
  import Sun from '@lucide/svelte/icons/sun';
  import { cn } from '@/lib/utils';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from '@/lib/components/ui/dropdown-menu';
  import { getThemeMode, setThemeMode, type ThemeMode } from '@/lib/theme';

  type Props = { class?: string };

  let { class: className = '' }: Props = $props();

  let mode = $state<ThemeMode>(getThemeMode());
  const label = $derived(
    `Theme: ${mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'}`,
  );

  function choose(next: ThemeMode) {
    mode = next;
    setThemeMode(next);
  }
</script>

<DropdownMenu>
  <DropdownMenuTrigger>
    {#snippet child({ props })}
      <button
        {...props}
        type="button"
        aria-label={label}
        title={label}
        class={cn('theme-trigger', className)}
      >
        {#if mode === 'system'}
          <Monitor class="theme-icon" />
        {:else if mode === 'dark'}
          <Moon class="theme-icon" />
        {:else}
          <Sun class="theme-icon" />
        {/if}
      </button>
    {/snippet}
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="theme-menu">
    <DropdownMenuLabel>Theme</DropdownMenuLabel>
    <DropdownMenuItem onclick={() => choose('system')}>
      <Monitor class="theme-icon" />
      System
      {#if mode === 'system'}
        <Check class="theme-check" />
      {/if}
    </DropdownMenuItem>
    <DropdownMenuItem onclick={() => choose('light')}>
      <Sun class="theme-icon" />
      Light
      {#if mode === 'light'}
        <Check class="theme-check" />
      {/if}
    </DropdownMenuItem>
    <DropdownMenuItem onclick={() => choose('dark')}>
      <Moon class="theme-icon" />
      Dark
      {#if mode === 'dark'}
        <Check class="theme-check" />
      {/if}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

<style>
  /* Classes handed to a child (the icons, the menu content) are global here and prefixed with this component's
     name, so two components cannot collide. See §3.1.9 of the design spec. */
  .theme-trigger {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
    border-radius: var(--radius);
    color: var(--muted-foreground);
    outline-style: none;
    transition:
      color 150ms cubic-bezier(0.4, 0, 0.2, 1),
      background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .theme-trigger:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }

  .theme-trigger:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  @media (width < 40rem) {
    .theme-trigger {
      width: 2.25rem;
      height: 2.25rem;
    }
  }

  :global(.theme-icon) {
    width: 1rem;
    height: 1rem;
  }

  :global(.theme-check) {
    width: 1rem;
    height: 1rem;
    margin-left: auto;
  }

  :global(.theme-menu) {
    width: 11rem;
  }
</style>
