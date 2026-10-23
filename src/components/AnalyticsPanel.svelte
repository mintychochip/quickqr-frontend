<script lang="ts">
  import type { AnalyticsSummary, Link } from '../types';
  import { fetchLinkAnalytics } from '../lib/api';

  type Props = {
    link: Link;
  };

  let { link }: Props = $props();

  let data = $state<AnalyticsSummary | null>(null);
  let loading = $state(true);

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

<div class="analytics-root">
  {#if loading}
    <p class="analytics-empty">Loading statistics…</p>
  {:else if !data}
    <p class="analytics-empty">No analytics recorded for this link yet.</p>
  {:else}
    {@const topReferrer = Object.entries(data.top_referrers).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Direct'}
    {@const maxCount = Math.max(...data.hourly_timeline.map((point) => point.count), 1)}
    {@const slices = deviceSlices(data.device_breakdown)}
    {@const referrers = referrerRows(data.top_referrers)}
    <dl class="analytics-kpi-grid">
      <div>
        <dt class="analytics-kpi-label">Devices</dt>
        <dd class="analytics-kpi-value-xl">{data.unique_devices}</dd>
      </div>
      <div class="analytics-min-w-0">
        <dt class="analytics-kpi-label">Top referrer</dt>
        <dd class="analytics-kpi-value-sm analytics-truncate">{topReferrer}</dd>
      </div>
    </dl>

    <section>
      <h3 class="analytics-section-title">Device mix</h3>
      {#if slices.length === 0}
        <p class="analytics-empty-small">No device scans yet.</p>
      {:else}
        <div class="analytics-flex-center-gap4">
          <svg
            data-testid="device-mix-chart"
            viewBox="0 0 32 32"
            class="analytics-chart-svg"
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
          <ul class="analytics-legend">
            {#each slices as slice (slice.name)}
              <li class="analytics-legend-item">
                <span class="analytics-legend-row">
                  <span class="analytics-color-dot" style:background-color={slice.color}></span>
                  <span class="analytics-truncate">{slice.name}</span>
                </span>
                <span class="analytics-legend-pct font-mono">{slice.labelPct}%</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </section>

    <section>
      <h3 class="analytics-section-title">Referrers</h3>
      {#if referrers.length === 0}
        <p class="analytics-empty-small">No referrers yet.</p>
      {:else}
        <ul class="analytics-legend">
          {#each referrers as row (row.name)}
            <li class="analytics-legend-item">
              <span class="analytics-truncate">{row.name}</span>
              <span class="analytics-legend-pct font-mono">{row.count} · {row.labelPct}%</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <div class="analytics-volume-grid">
      <section class="analytics-min-w-0">
        <h3 class="analytics-volume-header">
          <span>Scan volume</span>
          <span class="analytics-volume-sub">Past 6 hours</span>
        </h3>
        <div
          class="analytics-bars"
          data-testid="scan-volume-chart"
          role="img"
          aria-label="Scan volume for the past 6 hours"
        >
          {#each data.hourly_timeline as point, index (index)}
            {@const heightPercent = point.count === 0 ? 0 : Math.max(Math.round((point.count / maxCount) * 100), 8)}
            <div class="analytics-bar-col">
              <div class="font-mono analytics-bar-count">{point.count}</div>
              <div class="analytics-bar" style:height="{Math.round((heightPercent / 100) * 80)}px"></div>
              <div data-testid="scan-volume-hour" class="font-mono analytics-bar-time">{point.time}</div>
            </div>
          {/each}
        </div>
      </section>

      <section class="analytics-min-w-0">
        <h3 class="analytics-recent-title">Recent scans</h3>
        {#if data.recent_scans.length === 0}
          <p class="analytics-recent-empty">No scans yet.</p>
        {:else}
          <ul class="analytics-recent-list">
            {#each data.recent_scans.slice(0, 6) as event (event.id)}
              <li class="analytics-recent-item">
                <div class="analytics-recent-meta analytics-min-w-0">
                  <div class="analytics-truncate analytics-recent-device">{event.device_type} · {event.referrer}</div>
                  <div class="analytics-truncate analytics-recent-ip font-mono">{event.ip}</div>
                </div>
                <div class="analytics-recent-time font-mono">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
@layer components {
	.analytics-root {
		container-type: inline-size;
	}

	.analytics-root > * + * {
		margin-top: 1.25rem;
	}

	.analytics-empty {
		padding-block: 2rem;
		text-align: center;
		font-size: 0.75rem;
		line-height: 1rem;
		color: var(--muted-foreground);
	}

	.analytics-kpi-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.analytics-kpi-label {
		font-size: 10px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--muted-foreground);
	}

	.analytics-kpi-value-xl {
		margin-top: 0.25rem;
		font-size: 1.25rem;
		line-height: 1.75rem;
		font-weight: 500;
		letter-spacing: -0.04em;
		color: var(--foreground);
	}

	.analytics-kpi-value-sm {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		color: var(--foreground);
	}

	.analytics-truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.analytics-min-w-0 {
		min-width: 0;
	}

	.analytics-section-title {
		margin-bottom: 0.5rem;
		font-size: 11px;
		font-weight: 500;
		color: var(--foreground);
	}

	.analytics-empty-small {
		font-size: 11px;
		color: var(--muted-foreground);
	}

	.analytics-flex-center-gap4 {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.analytics-chart-svg {
		width: 6rem;
		height: 6rem;
		flex-shrink: 0;
	}

	.analytics-legend {
		min-width: 0;
		flex: 1;
	}

	.analytics-legend > * + * {
		margin-top: 0.375rem;
	}

	.analytics-legend-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 11px;
		color: var(--foreground);
	}

	.analytics-legend-row {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.375rem;
	}

	.analytics-color-dot {
		width: 0.5rem;
		height: 0.5rem;
		flex-shrink: 0;
		border-radius: 9999px;
	}

	.analytics-legend-pct {
		flex-shrink: 0;
		color: var(--muted-foreground);
	}

	.analytics-volume-grid {
		display: grid;
		gap: 1.25rem;
	}

	.analytics-bars {
		display: flex;
		height: 8rem;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.analytics-bar-col {
		display: flex;
		height: 100%;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 0.25rem;
	}

	.analytics-bar-count {
		font-size: 10px;
		font-weight: 500;
		color: var(--foreground);
	}

	.analytics-bar {
		width: 100%;
		max-width: 2rem;
		border-top-left-radius: calc(var(--radius) * 0.8);
		border-top-right-radius: calc(var(--radius) * 0.8);
		background-color: var(--ink);
	}

	.analytics-bar-time {
		font-size: 10px;
		color: var(--muted-foreground);
	}

	.analytics-volume-header {
		margin-bottom: 0.5rem;
		font-size: 11px;
		font-weight: 500;
		color: var(--foreground);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.analytics-volume-sub {
		font-weight: 400;
		color: var(--muted-foreground);
	}

	.analytics-recent-title {
		margin-bottom: 0.25rem;
		font-size: 11px;
		font-weight: 500;
		color: var(--foreground);
	}

	.analytics-recent-empty {
		padding-top: 0.25rem;
		font-size: 11px;
		color: var(--muted-foreground);
	}

	.analytics-recent-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding-block: 0.5rem;
		font-size: 11px;
	}

	.analytics-recent-meta {
		min-width: 0;
	}

	.analytics-recent-device {
		color: var(--foreground);
	}

	.analytics-recent-ip {
		font-size: 10px;
		color: var(--muted-foreground);
	}

	.analytics-recent-time {
		flex-shrink: 0;
		font-size: 10px;
		color: var(--muted-foreground);
	}

	.analytics-recent-list > * + * {
		border-top: 1px solid var(--border);
	}
}

@container (min-width: 80rem) {
	.analytics-volume-grid {
		grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.8fr);
		gap: 1.5rem;
	}
}
</style>
