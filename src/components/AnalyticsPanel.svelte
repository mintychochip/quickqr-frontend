<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import type { AnalyticsSummary, Link } from '../types';
  import { fetchLinkAnalytics } from '../lib/api';

  type Props = {
    link: Link;
  };

  let { link }: Props = $props();

  let data = $state<AnalyticsSummary | null>(null);
  let loading = $state(true);
  let scansOpen = $state(false);

  function referrerRows(referrers: Record<string, number>) {
    const entries = Object.entries(referrers)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    return entries.slice(0, 5).map(([name, count]) => ({
      name,
      count,
      labelPct: total === 0 ? 0 : Math.round((count / total) * 100),
    }));
  }

  const deviceColor: Record<string, string> = {
    iOS: 'var(--chart-2)',
    Android: 'var(--chart-1)',
    Desktop: 'var(--chart-3)',
    Other: 'var(--chart-4)',
  };
  const deviceOrder = ['iOS', 'Android', 'Desktop', 'Other'];
  const fallbackColors = ['var(--chart-2)', 'var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)'];

  function deviceSlices(breakdown: Record<string, number>) {
    const entries = Object.entries(breakdown)
      .filter(([, count]) => count > 0)
      .sort((a, b) => {
        const ai = deviceOrder.indexOf(a[0]);
        const bi = deviceOrder.indexOf(b[0]);
        return (ai === -1 ? deviceOrder.length : ai) - (bi === -1 ? deviceOrder.length : bi) || a[0].localeCompare(b[0]);
      });
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    let cursor = 0;
    return entries.map(([name, count], index) => {
      const pct = total === 0 ? 0 : (count / total) * 100;
      const labelR = 9.4;
      const mid = ((cursor + pct / 2) / 100) * Math.PI * 2;
      const digits = String(count).length;
      const arc = (pct / 100) * Math.PI * 2 * labelR;
      const lightSlice = name === 'Android' || name === 'Other' || (!(name in deviceColor) && index % 2 === 1);
      const slice = {
        name,
        count,
        pct,
        labelPct: Math.round(pct),
        color: deviceColor[name] ?? fallbackColors[index % fallbackColors.length],
        offset: cursor,
        labelX: 16 + Math.sin(mid) * labelR,
        labelY: 16 - Math.cos(mid) * labelR,
        showCount: pct >= 14 && arc >= digits * 2.15 + 0.8,
        countFill: lightSlice ? '#111113' : '#f4f4f5',
      };
      cursor += pct;
      return slice;
    });
  }

  $effect(() => {
    loading = true;
    data = null;
    const code = link.code;
    fetchLinkAnalytics(code)
      .then((res) => {
        if (code === link.code) data = res;
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (code === link.code) loading = false;
      });
  });
</script>

<div>
  {#if loading}
    <p class="py-8 text-center text-xs text-muted-foreground">Loading statistics…</p>
  {:else if !data}
    <p class="py-8 text-center text-xs text-muted-foreground">No analytics recorded for this link yet.</p>
  {:else}
    {@const topReferrer = Object.entries(data.top_referrers).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Direct'}
    {@const maxCount = Math.max(...data.hourly_timeline.map((point) => point.count), 1)}
    {@const slices = deviceSlices(data.device_breakdown)}
    {@const referrers = referrerRows(data.top_referrers)}
    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-xl bg-muted/40 p-3">
        <div class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Devices</div>
        <div class="mt-1 text-xl font-medium tracking-[-0.04em] text-foreground">
          {data.unique_devices}
        </div>
      </div>
      <div class="min-w-0 rounded-xl bg-muted/40 p-3">
        <div class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Top referrer
        </div>
        <div class="mt-1 truncate text-sm font-medium text-foreground">{topReferrer}</div>
      </div>

      <div class="col-span-2 flex h-full flex-col rounded-xl bg-muted/40 p-3">
        <div class="mb-2 text-[11px] font-medium text-foreground">Device mix</div>
        {#if slices.length === 0}
          <p class="text-[11px] text-muted-foreground">No device scans yet.</p>
        {:else}
          <div class="flex flex-1 items-center gap-4">
            <svg
              data-testid="device-mix-chart"
              viewBox="0 0 32 32"
              class="size-24 shrink-0"
              role="img"
              aria-label={`Device mix: ${slices.map((slice) => `${slice.name} ${slice.count}, ${slice.labelPct}%`).join(', ')}`}
            >
              <g transform="rotate(-90 16 16)">
                {#each slices as slice (slice.name)}
                  <circle
                    cx="16"
                    cy="16"
                    r="7.5"
                    fill="none"
                    stroke={slice.color}
                    stroke-width="15"
                    pathLength="100"
                    stroke-dasharray="{slice.pct} {Math.max(0, 100 - slice.pct)}"
                    stroke-dashoffset={-slice.offset}
                  />
                {/each}
              </g>
              {#each slices as slice (slice.name)}
                {#if slice.showCount}
                  <text
                    x={slice.labelX}
                    y={slice.labelY}
                    text-anchor="middle"
                    dominant-baseline="central"
                    fill={slice.countFill}
                    font-size="3.6"
                    font-weight="650"
                    class="font-mono"
                  >{slice.count}</text>
                {/if}
              {/each}
            </svg>
            <ul class="min-w-0 flex-1 space-y-1.5">
              {#each slices as slice (slice.name)}
                <li class="flex items-center justify-between gap-3 text-[11px] text-foreground">
                  <span class="flex min-w-0 items-center gap-1.5">
                    <span class="size-2 shrink-0 rounded-full" style:background-color={slice.color}></span>
                    <span class="truncate">{slice.name}</span>
                  </span>
                  <span class="shrink-0 font-mono text-muted-foreground">{slice.labelPct}%</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>

      <div class="col-span-2 flex h-full min-w-0 flex-col rounded-xl bg-muted/40 p-3">
        <div class="mb-2 text-[11px] font-medium text-foreground">Referrers</div>
        {#if referrers.length === 0}
          <p class="text-[11px] text-muted-foreground">No referrers yet.</p>
        {:else}
          <ul class="flex flex-1 flex-col justify-center space-y-1.5">
            {#each referrers as row (row.name)}
              <li class="flex items-center justify-between gap-3 text-[11px] text-foreground">
                <span class="truncate">{row.name}</span>
                <span class="shrink-0 font-mono text-muted-foreground">{row.count} · {row.labelPct}%</span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="col-span-2 rounded-xl bg-card ring-1 ring-black/5 dark:ring-white/10">
        <button
          type="button"
          aria-expanded={scansOpen}
          onclick={() => (scansOpen = !scansOpen)}
          class="flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-foreground"
        >
          <span>Scans</span>
          <ChevronDown class="size-4 text-muted-foreground transition-transform {scansOpen ? 'rotate-180' : ''}" />
        </button>
        {#if scansOpen}
          <div class="grid gap-4 border-t border-border p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)]">
            <div class="min-w-0">
              <div class="mb-2 flex items-center justify-between text-[11px] font-medium text-foreground">
                <span>Scan volume</span>
                <span class="font-normal text-muted-foreground">Past 6 hours</span>
              </div>
              <div
                class="flex h-32 items-end gap-2"
                data-testid="scan-volume-chart"
                role="img"
                aria-label="Scan volume for the past 6 hours"
              >
                {#each data.hourly_timeline as point, index (index)}
                  {@const heightPercent = point.count === 0 ? 0 : Math.max(Math.round((point.count / maxCount) * 100), 8)}
                  <div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <div class="font-mono text-[10px] font-medium text-foreground">{point.count}</div>
                    <div class="w-full rounded-t-md bg-ink" style:height="{Math.round((heightPercent / 100) * 80)}px"></div>
                    <div class="font-mono text-[10px] text-muted-foreground">{point.time}</div>
                  </div>
                {/each}
              </div>
            </div>

            <div class="min-w-0">
              <div class="mb-1 text-[11px] font-medium text-foreground">Recent scans</div>
              <div class="max-h-36 divide-y divide-border overflow-y-auto">
                {#each data.recent_scans.slice(0, 6) as event (event.id)}
                  <div class="flex items-center justify-between gap-3 py-2 text-[11px]">
                    <div class="min-w-0">
                      <div class="truncate text-foreground">{event.device_type} · {event.referrer}</div>
                      <div class="truncate font-mono text-[10px] text-muted-foreground">{event.ip}</div>
                    </div>
                    <div class="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
