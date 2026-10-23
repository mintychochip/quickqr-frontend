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

<section data-testid="link-detail-sidebar" class="ld-root">
  <div class="ld-wrap">
    <div class="ld-top">
      <div class="ld-title-area">
        <p class="ld-label">
          Link details
        </p>
        <h2 class="ld-title">
          {link.title || 'Untitled'}
        </h2>
        <span
          class="ld-code font-mono"
        >
          /r/{link.code}
        </span>
      </div>
      <button
        type="button"
        aria-label="Close link details"
        class="ld-close-btn"
        onclick={onClose}
      >
        <X class="ld-icon-ext" />
      </button>
    </div>

    <div class="ld-scans-row">
      <div>
        <p class="ld-label">
          Scans
        </p>
        <p class="ld-scans-num">
          {#if trend.loading}
            <span class="ld-pulse6"></span>
          {:else if trend.error}
            {(link.total_scans || 0).toLocaleString()}
          {:else}
            <span in:fade={{ duration: 160 }}>{trend.total.toLocaleString()}</span>
          {/if}
        </p>
      </div>
      <div class={trend.error ? 'ld-tone-muted' : scanRateTone(trend.rate, trend.lastHour)}>
        {#if trend.loading}
          <span class="ld-pulse8"></span>
        {:else if trend.error}
          <span class="ld-text11">Trend unavailable</span>
        {:else}
          <div data-testid="scan-sparkline" in:fade={{ duration: 160 }} title="Hourly scans over the last six hours">
            <Sparkline
              points={trend.points}
              class="ld-spark-h8w24"
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
        class="ld-rate-text {trend.error
          ? 'ld-tone-muted'
          : scanRateTone(trend.rate, trend.lastHour)}"
      >
        {trend.error ? 'Scans this hour are unavailable.' : formatScanRate(trend.rate, trend.lastHour)}
      </p>
    {/if}

    <a
      href={`/r/${link.code}`}
      target="_blank"
      rel="noopener noreferrer"
      class="ld-open-link"
    >
      Open live link
      <ExternalLink class="ld-icon-ext" />
    </a>
  </div>

  <div class="ld-qr-wrap">
    <div class="ld-qr-row">
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
      <div class="ld-qr-info">
        <p class="ld-label">
          Destination
        </p>
        <a
          href={link.destination_url}
          target="_blank"
          rel="noreferrer"
          class="ld-dest-link font-mono"
        >
          {link.destination_url}
        </a>
        <p class="ld-total">
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

<style>
  .ld-root {
    min-height: 100%;
  }

  .ld-wrap {
    padding: 1rem;
  }

  .ld-top {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .ld-title-area {
    min-width: 0;
    flex: 1 1 0%;
  }

  .ld-label {
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--muted-foreground);
  }

  .ld-title {
    margin-top: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 1rem;
    line-height: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--foreground);
  }

  .ld-code {
    margin-top: 0.25rem;
    display: inline-block;
    border-radius: calc(var(--radius) * 0.8);
    background-color: var(--muted);
    padding-left: 0.375rem;
    padding-right: 0.375rem;
    padding-top: 1px;
    padding-bottom: 1px;
    font-size: 10px;
    color: var(--muted-foreground);
  }

  .ld-close-btn {
    display: grid;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    cursor: pointer;
    place-items: center;
    border-radius: var(--radius);
    color: var(--muted-foreground);
    transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline-style: none;
  }
  .ld-close-btn:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }
  .ld-close-btn:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  .ld-scans-row {
    margin-top: 1rem;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .ld-scans-num {
    margin-top: 0.25rem;
    font-size: 1.5rem;
    line-height: 2rem;
    font-weight: 500;
    letter-spacing: -0.04em;
    color: var(--foreground);
  }

  .ld-pulse6,
  .ld-pulse8 {
    animation: ld-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    border-radius: 0.25rem;
    background-color: var(--muted);
  }
  .ld-pulse6 {
    display: inline-block;
    height: 1.5rem;
    width: 3rem;
  }
  .ld-pulse8 {
    display: block;
    height: 2rem;
    width: 6rem;
  }

  @keyframes ld-pulse {
    50% {
      opacity: 0.5;
    }
  }

  .ld-tone-muted {
    color: var(--muted-foreground);
  }

  .ld-rate-text {
    margin-top: 0.25rem;
    font-size: 11px;
    font-weight: 500;
  }

  .ld-open-link {
    margin-top: 0.75rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    border-radius: calc(var(--radius) * 0.6);
    font-size: 0.75rem;
    line-height: 1rem;
    font-weight: 500;
    color: var(--foreground);
    outline-style: none;
  }
  .ld-open-link:hover {
    text-decoration: underline;
  }
  .ld-open-link:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  .ld-qr-wrap {
    border-top: 1px solid var(--border);
    padding: 1rem;
  }

  .ld-qr-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .ld-qr-info {
    min-width: 0;
    flex: 1 1 0%;
  }

  .ld-dest-link {
    margin-top: 0.25rem;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    color: var(--muted-foreground);
  }
  .ld-dest-link:hover {
    color: var(--foreground);
  }

  .ld-total {
    margin-top: 0.5rem;
    font-size: 11px;
    color: var(--muted-foreground);
  }

  :global(.ld-icon-ext) {
    width: 0.875rem;
    height: 0.875rem;
  }

  :global(.ld-spark-h8w24) {
    height: 2rem;
    width: 6rem;
  }

  .ld-text11 {
    font-size: 11px;
  }
</style>
