<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { slide } from 'svelte/transition';
  import type { Link } from '../types';
  import AnalyticsPanel from './AnalyticsPanel.svelte';
  import QrSettingsPanel from './QrSettingsPanel.svelte';

  type Props = {
    link: Link;
    statsOpen: boolean;
    onToggleStats: () => void;
    onSaved: (link: Pick<Link, 'code' | 'title' | 'destination_url' | 'ad_style' | 'style'>) => void;
    /** Render as divided sections inside a parent surface instead of separate cards. */
    flush?: boolean;
  };

  let { link, statsOpen, onToggleStats, onSaved, flush = false }: Props = $props();

  const outer = $derived(flush ? 'divide-y divide-border border-t border-border' : 'grid gap-3 @[900px]:grid-cols-2');
  const panel = $derived(flush ? '' : 'rounded-xl bg-card ring-1 ring-black/5 dark:ring-white/10');
  const label = $derived(
    flush
      ? 'px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70 dark:text-muted-foreground'
      : 'px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70 dark:text-muted-foreground',
  );
  const body = $derived(flush ? 'border-t border-border px-4 py-4' : 'border-t border-border px-3 py-3');
</script>

<div class={outer}>
  <div data-testid="qr-dropdown" class={panel}>
    <div class={label}>Style</div>
    <div class={body}>
      <QrSettingsPanel code={link.code} {onSaved} />
    </div>
  </div>

  <div data-testid="analytics-dropdown" class={panel}>
    <button
      type="button"
      aria-expanded={statsOpen}
      onclick={onToggleStats}
      class="flex w-full cursor-pointer items-center justify-between text-left {label}"
    >
      <span>Statistics</span>
      <ChevronDown class="size-3.5 transition-transform {statsOpen ? 'rotate-180' : ''}" />
    </button>
    {#if statsOpen}
      <div
        class={body}
        in:slide={{ duration: flush ? 180 : 0 }}
        out:slide={{ duration: flush ? 120 : 0 }}
      >
        <AnalyticsPanel {link} />
      </div>
    {/if}
  </div>
</div>
