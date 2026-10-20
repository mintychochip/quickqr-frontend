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
        class={cn(
          'grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 max-sm:size-9',
          className,
        )}
      >
        {#if mode === 'system'}
          <Monitor class="size-4" />
        {:else if mode === 'dark'}
          <Moon class="size-4" />
        {:else}
          <Sun class="size-4" />
        {/if}
      </button>
    {/snippet}
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="w-44">
    <DropdownMenuLabel>Theme</DropdownMenuLabel>
    <DropdownMenuItem onclick={() => choose('system')}>
      <Monitor class="size-4" />
      System
      {#if mode === 'system'}
        <Check class="ml-auto size-4" />
      {/if}
    </DropdownMenuItem>
    <DropdownMenuItem onclick={() => choose('light')}>
      <Sun class="size-4" />
      Light
      {#if mode === 'light'}
        <Check class="ml-auto size-4" />
      {/if}
    </DropdownMenuItem>
    <DropdownMenuItem onclick={() => choose('dark')}>
      <Moon class="size-4" />
      Dark
      {#if mode === 'dark'}
        <Check class="ml-auto size-4" />
      {/if}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
