<script lang="ts">
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import X from '@lucide/svelte/icons/x';
  import { fade } from 'svelte/transition';
  import type { Link } from '../types';
  import type { SavedLink } from '../types/dashboard';
  import { fetchTrends } from '../lib/api';
  import { dynamicQrValue } from '../lib/dynamicQr';
  import {
    failedScanTrend,
    formatScanRate,
    pendingScanTrend,
    scanRateTone,
    scanTrendsFor,
    type ScanTrend,
  } from '../lib/scanStats';
  import LinkRowDropdown from './LinkRowDropdown.svelte';
  import QRCanvas from './QRCanvas.svelte';
  import Sparkline from './Sparkline.svelte';

  type Props = {
    link: Link;
    onClose: () => void;
    onSaved: (next: SavedLink) => void;
  };

  let { link, onClose, onSaved }: Props = $props();

  let trend = $state<ScanTrend>(pendingScanTrend());
  let statsOpen = $state(true);

  const qrValue = $derived(dynamicQrValue(window.location.origin, link.code));

  $effect(() => {
    const selected = link;
    let cancelled = false;
    trend = pendingScanTrend(selected.total_scans || 0);
    // The trend line needs only the last six hours. The analytics panel below makes the one full per-link call.
    fetchTrends()
      .then((trends) => {
        if (cancelled) return;
        trend = scanTrendsFor([selected], trends)[selected.code] ?? failedScanTrend(selected.total_scans || 0);
      })
      .catch(() => {
        if (!cancelled) trend = failedScanTrend(selected.total_scans || 0);
      });
    return () => {
      cancelled = true;
    };
  });
</script>

<section data-testid="link-detail-sidebar" class="min-h-full">
  <div class="p-4">
    <div class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Link details
        </p>
        <h2 class="mt-1 truncate text-base font-semibold tracking-[-0.02em] text-foreground">
          {link.title || 'Untitled'}
        </h2>
        <span
          class="mt-1 inline-block rounded-md bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground"
        >
          /r/{link.code}
        </span>
      </div>
      <button
        type="button"
        aria-label="Close link details"
        class="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        onclick={onClose}
      >
        <X class="size-4" />
      </button>
    </div>

    <div class="mt-4 flex items-end justify-between gap-3">
      <div>
        <p class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Scans
        </p>
        <p class="mt-1 text-2xl font-medium tracking-[-0.04em] text-foreground">
          {#if trend.loading}
            <span class="inline-block h-6 w-12 animate-pulse rounded bg-muted"></span>
          {:else if trend.error}
            {(link.total_scans || 0).toLocaleString()}
          {:else}
            <span in:fade={{ duration: 160 }}>{trend.total.toLocaleString()}</span>
          {/if}
        </p>
      </div>
      <div class={trend.error ? 'text-muted-foreground' : scanRateTone(trend.rate, trend.lastHour)}>
        {#if trend.loading}
          <span class="block h-8 w-24 animate-pulse rounded bg-muted"></span>
        {:else if trend.error}
          <span class="text-[11px]">Trend unavailable</span>
        {:else}
          <div data-testid="scan-sparkline" in:fade={{ duration: 160 }} title="Hourly scans over the last six hours">
            <Sparkline
              points={trend.points}
              class="h-8 w-24"
              label="Scan trend for this link over the last six hours"
            />
          </div>
        {/if}
      </div>
    </div>

    {#if !trend.loading}
      <p
        data-testid="scan-rate"
        in:fade={{ duration: 160 }}
        class="mt-1 text-[11px] font-medium {trend.error
          ? 'text-muted-foreground'
          : scanRateTone(trend.rate, trend.lastHour)}"
      >
        {trend.error ? 'Scans this hour are unavailable.' : formatScanRate(trend.rate, trend.lastHour)}
      </p>
    {/if}

    <a
      href={`/r/${link.code}`}
      target="_blank"
      rel="noopener noreferrer"
      class="mt-3 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      Open live link
      <ExternalLink class="size-3.5" />
    </a>
  </div>

  <div class="border-t border-border p-4">
    <div class="flex items-center gap-4">
      <QRCanvas
        value={qrValue}
        label={link.title}
        fgColor={link.style?.fgColor ?? '#111113'}
        bgColor={link.style?.bgColor ?? '#ffffff'}
        frame={link.style?.frame ?? 'plain'}
        errorCorrectionLevel={link.style?.errorLevel ?? 'M'}
        margin={0}
        size={96}
        inline
      />
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Destination
        </p>
        <a
          href={link.destination_url}
          target="_blank"
          rel="noreferrer"
          class="mt-1 block truncate font-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          {link.destination_url}
        </a>
        <p class="mt-2 text-[11px] text-muted-foreground">
          {(link.total_scans || 0).toLocaleString()} total scans
        </p>
      </div>
    </div>
  </div>

  <LinkRowDropdown
    {link}
    {statsOpen}
    onToggleStats={() => (statsOpen = !statsOpen)}
    {onSaved}
    flush
  />
</section>
