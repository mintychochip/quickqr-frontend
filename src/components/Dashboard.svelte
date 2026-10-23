<script lang="ts">
  import BarChart2 from '@lucide/svelte/icons/chart-no-axes-column';
  import QrCode from '@lucide/svelte/icons/qr-code';
  import Edit2 from '@lucide/svelte/icons/pencil';
  import Check from '@lucide/svelte/icons/check';
  import Search from '@lucide/svelte/icons/search';
  import { fade } from 'svelte/transition';
  import type { Link, Sponsor } from '../types';
  import type { DetailSelection, SavedLink } from '../types/dashboard';
  import { fetchLinks, fetchTrends, updateLink, deleteLink } from '../lib/api';
  import AdSpace from './AdSpace.svelte';
  import LinkRowDropdown from './LinkRowDropdown.svelte';
  import LinkRowMenu from './LinkRowMenu.svelte';
  import QRCanvas from './QRCanvas.svelte';
  import Sparkline from './Sparkline.svelte';
  import { dynamicQrValue } from '../lib/dynamicQr';
  import {
    failedScanTrend,
    formatScanRate,
    pendingScanTrend,
    scanRate,
    scanRateTone,
    scanTrendsFor,
    type ScanTrend,
  } from '../lib/scanStats';
  import Button from '@/lib/components/ui/button.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import Card from '@/lib/components/ui/card.svelte';

  type Props = {
    newLinkTrigger?: Link | null;
    sponsor?: Sponsor | null;
    refreshKey?: number;
    onCreate: () => void;
    useDetailSidebar?: boolean;
    selectedCode?: string | null;
    compactTable?: boolean;
    onSelectLink?: (selection: DetailSelection | null) => void;
  };

  let {
    newLinkTrigger = null,
    sponsor = null,
    refreshKey = 0,
    onCreate,
    useDetailSidebar = false,
    selectedCode = null,
    compactTable = false,
    onSelectLink,
  }: Props = $props();

  let links = $state<Link[]>([]);
  let allLinks = $state<Link[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let editingCode = $state<string | null>(null);
  let editUrl = $state('');
  let isUpdating = $state(false);
  let expandedCode = $state<string | null>(null);
  let statsOpen = $state(false);
  let copiedCode = $state<string | null>(null);
  let rowStats = $state<Record<string, ScanTrend>>({});
  let statsGeneration = 0;

  async function loadScanStats(items: Link[]) {
    const generation = ++statsGeneration;
    const initial: Record<string, ScanTrend> = {};
    for (const link of items) initial[link.code] = pendingScanTrend(link.total_scans || 0);
    rowStats = initial;
    // Nothing to draw, so nothing to ask for. The generation is already bumped, so an answer still on its way is dropped.
    if (items.length === 0) return;

    // One request for every row. A call per link would read every scan each link has ever had.
    try {
      const trends = await fetchTrends();
      if (generation !== statsGeneration) return;
      rowStats = scanTrendsFor(items, trends);
    } catch {
      if (generation !== statsGeneration) return;
      rowStats = Object.fromEntries(items.map((link) => [link.code, failedScanTrend(link.total_scans || 0)]));
    }
  }

  async function loadData() {
    try {
      loading = true;
      const all = await fetchLinks();
      allLinks = all;
      links = all.filter((l) => !l.kind);
      void loadScanStats(links);
    } catch (err) {
      console.error('Failed to load links:', err);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void newLinkTrigger;
    void refreshKey;
    loadData();
  });

  function toggleQr(code: string) {
    if (expandedCode === code) {
      expandedCode = null;
      statsOpen = false;
      return;
    }
    expandedCode = code;
    statsOpen = true;
  }

  /** Clicking anywhere on the row expands it, except on links/inputs/buttons. */
  function onRowClick(event: MouseEvent, link: Link) {
    const target = event.target;
    if (target instanceof Element && target.closest('a, button, input, [role="menuitem"]')) return;
    if (useDetailSidebar) selectInSidebar(link);
    else toggleQr(link.code);
  }

  function selectInSidebar(link: Link) {
    onSelectLink?.({ link, onSaved: applySavedSettings });
  }

  function rowIsActive(link: Link) {
    return useDetailSidebar ? selectedCode === link.code : expandedCode === link.code;
  }

  function analyticsIsActive(link: Link) {
    return useDetailSidebar
      ? selectedCode === link.code
      : expandedCode === link.code && statsOpen;
  }

  function toggleStats(code: string) {
    if (expandedCode !== code) {
      statsOpen = true;
      expandedCode = code;
      return;
    }
    statsOpen = !statsOpen;
  }

  function applySavedSettings(next: SavedLink) {
    links = links.map((link) => (link.code === next.code ? { ...link, ...next } : link));
  }

  $effect(() => {
    if (!expandedCode) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        expandedCode = null;
        statsOpen = false;
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  function startEditing(link: Link) {
    editingCode = link.code;
    editUrl = link.destination_url;
  }

  async function handleSaveEdit(code: string) {
    if (!editUrl.trim()) return;
    isUpdating = true;
    try {
      const updated = await updateLink(code, { destination_url: editUrl.trim() });
      links = links.map((l) => (l.code === code ? updated : l));
      editingCode = null;
    } catch (e) {
      console.error('Update failed:', e);
    } finally {
      isUpdating = false;
    }
  }

  async function handleDelete(code: string) {
    if (!window.confirm(`Deactivate and delete /r/${code}?`)) return;
    try {
      await deleteLink(code);
      links = links.filter((l) => l.code !== code);
      if (selectedCode === code) onSelectLink?.(null);
    } catch (e) {
      console.error('Delete failed:', e);
    }
  }

  function handleCopyLink(code: string) {
    const full = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(full);
    copiedCode = code;
    setTimeout(() => {
      copiedCode = null;
    }, 2000);
  }

  const totalScans = $derived(links.reduce((sum, l) => sum + (l.total_scans || 0), 0));
  const aggregateTrend = $derived.by(() => {
    if (links.length === 0) return null;
    const rows = links.map((link) => rowStats[link.code]);
    if (rows.some((row) => !row || row.loading)) return null;
    const points = Array.from({ length: 6 }, (_, index) =>
      rows.reduce((sum, row) => sum + (row?.points[index] ?? 0), 0),
    );
    const lastHour = points[points.length - 1] ?? 0;
    const previousHour = points[points.length - 2] ?? 0;
    return {
      total: rows.reduce((sum, row) => sum + (row?.total ?? 0), 0),
      lastHour,
      previousHour,
      rate: scanRate(lastHour, previousHour),
      points,
    };
  });
  const totalLinks = $derived(links.length);
  const totalMenus = $derived(allLinks.filter((l) => l.kind === 'menu').length);
  const totalPages = $derived(allLinks.filter((l) => l.kind === 'linkpage').length);
  const filteredLinks = $derived(
    links.filter(
      (l) =>
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.destination_url.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );
</script>

<section id="dashboard" class="dash-space-y6">
  <div class="dash-header-row">
    <div>
      <h1 class="dash-h1">Dynamic links</h1>
      <p class="dash-desc">
        Change the destination anytime. The printed code stays the same.
      </p>
    </div>

    <Button
      onclick={onCreate}
      class="dash-create-btn"
    >
      + Create code
    </Button>
  </div>

  <div class="dash-stats-grid {compactTable ? 'dash-grid-wide' : 'dash-grid-compact'}">
    <Card class="dash-card-ink">
      <div class="dash-card-label dash-white55">Dynamic scans</div>
      <div class="dash-card-value-row">
        <div class="dash-big-num-punch">
          {totalScans.toLocaleString()}
        </div>
        {#if aggregateTrend}
          <span in:fade={{ duration: 160 }}>
            <Sparkline
              points={aggregateTrend.points}
              class="dash-spark-h6w20"
              label="Scan trend for all dynamic links over the last six hours"
            />
          </span>
        {:else}
          <span class="dash-pulse-h6w20"></span>
        {/if}
      </div>
      {#if aggregateTrend}
        <p
          in:fade={{ duration: 160 }}
          class="dash-rate-text {aggregateTrend.rate === null
            ? 'dash-tone-punch'
            : aggregateTrend.rate > 0
              ? 'dash-tone-punch'
              : aggregateTrend.rate < 0
                ? 'dash-tone-red'
                : 'dash-tone-white65'}"
        >
          {formatScanRate(aggregateTrend.rate, aggregateTrend.lastHour)}
        </p>
      {:else}
        <span class="dash-pulse-h2w20"></span>
      {/if}
    </Card>
    <Card class="dash-card">
      <div class="dash-card-label">Dynamic links</div>
      <div class="dash-big-num">{totalLinks}</div>
    </Card>
    <Card class="dash-card">
      <div class="dash-card-label">Menus</div>
      <div class="dash-big-num">{totalMenus}</div>
    </Card>
    <Card class="dash-card">
      <div class="dash-card-label">Link pages</div>
      <div class="dash-big-num">{totalPages}</div>
    </Card>
  </div>

  {#if sponsor}
    <div class="dash-sponsor-hide">
      <AdSpace variant="leaderboard" sponsor={sponsor} slotId="dashboard-banner" />
    </div>
  {/if}

  <div class="dash-search-wrap">
    <Search class="dash-search-icon" />
    <Input
      type="text"
      bind:value={searchQuery}
      placeholder="Search links..."
      class="dash-search-input"
    />
  </div>

  <Card class="dash-table-card">
    {#if loading}
      <div class="dash-loading">Loading links...</div>
    {:else if filteredLinks.length === 0}
      <div class="dash-loading">No dynamic links found.</div>
    {:else}
      <div class="dash-table-container">
        <table class="dash-table">
          <thead class="dash-thead">
            <tr class="dash-thead-row">
              <th class="dash-th">Title &amp; Code</th>
              <th class="dash-th-dest {compactTable ? 'dash-th-wide' : ''}">Destination URL</th>
              <th class="dash-th-right">Scans</th>
              <th class="dash-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody class="dash-tbody">
            {#each filteredLinks as link (link.code)}
              {@const qrValue = dynamicQrValue(window.location.origin, link.code)}
              {@const trend = rowStats[link.code]}
              <tr
                onclick={(event) => onRowClick(event, link)}
                class="{rowIsActive(link)
                  ? 'dash-row-active'
                  : 'dash-row-hover'} dash-row"
              >
                <td class="dash-td-title">
                  <div class="dash-qr-label">
                    <QRCanvas
                      value={qrValue}
                      label={link.title}
                      fgColor={link.style?.fgColor ?? '#111113'}
                      bgColor={link.style?.bgColor ?? '#ffffff'}
                      frame={link.style?.frame ?? 'plain'}
                      errorCorrectionLevel={link.style?.errorLevel ?? 'M'}
                      margin={0}
                      size={56}
                      inline
                    />
                    <div class="dash-title-area">
                      <div class="dash-link-title">
                        {link.title || 'Untitled'}
                      </div>
                      <div
                        class="dash-row-code font-mono"
                      >
                        /r/{link.code}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="dash-td-dest {compactTable ? 'dash-th-wide' : ''}">
                  {#if editingCode === link.code}
                    <div class="dash-edit-row">
                      <input
                        type="url"
                        bind:value={editUrl}
                        class="dash-edit-input"
                      />
                      <button
                        type="button"
                        onclick={() => handleSaveEdit(link.code)}
                        disabled={isUpdating}
                        class="dash-save-btn"
                        title="Save"
                      >
                        <Check class="dash-icon-check" />
                      </button>
                      <button
                        type="button"
                        onclick={() => (editingCode = null)}
                        class="dash-cancel-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  {:else}
                    <div class="dash-dest-group">
                      <a
                        href={link.destination_url}
                        target="_blank"
                        rel="noreferrer"
                        class="dash-dest-a font-mono"
                      >
                        {link.destination_url}
                      </a>
                      <button
                        type="button"
                        onclick={() => startEditing(link)}
                        class="dash-edit-btn"
                        title="Edit destination URL"
                      >
                        <Edit2 class="dash-icon-edit" />
                      </button>
                    </div>
                  {/if}
                </td>
                <td class="dash-td-scans">
                  <div class="dash-scans-col">
                    <div class="dash-scans-flex">
                      <span
                        class="dash-scans-label-sm"
                      >
                        Scans
                      </span>
                      <span class="dash-scans-num font-mono">
                        {(trend?.total ?? link.total_scans ?? 0).toLocaleString()}
                      </span>
                      {#if trend && !trend.loading && !trend.error}
                        <span
                          data-testid="scan-sparkline"
                          in:fade={{ duration: 160 }}
                          class={scanRateTone(trend.rate, trend.lastHour)}
                          title="Hourly scans over the last six hours"
                        >
                          <Sparkline points={trend.points} class="dash-spark-h4w14" />
                        </span>
                      {:else if trend?.error}
                        <span class="dash-text10">—</span>
                      {:else}
                        <span class="dash-pulse-h4w14"></span>
                      {/if}
                    </div>
                    {#if trend && !trend.loading && !trend.error}
                      <span
                        data-testid="scan-rate"
                        in:fade={{ duration: 160 }}
                        class="dash-rate-sm {scanRateTone(trend.rate, trend.lastHour)}"
                        title="Scan rate this hour compared with the previous hour"
                      >
                        {formatScanRate(trend.rate, trend.lastHour)}
                      </span>
                    {:else if trend?.error}
                      <span class="dash-text10">Trend unavailable</span>
                    {:else}
                      <span class="dash-pulse-h2w16"></span>
                    {/if}
                  </div>
                </td>
                <td class="dash-td-actions">
                  <div class="dash-actions">
                    <button
                      type="button"
                      data-testid="show-qr"
                      aria-label="Show QR Code"
                      aria-expanded={rowIsActive(link)}
                      title="Show QR Code"
                      onclick={() => (useDetailSidebar ? selectInSidebar(link) : toggleQr(link.code))}
                      class="dash-qr-btn {rowIsActive(link)
                        ? 'dash-qr-active'
                        : 'dash-qr-idle'}"
                    >
                      <QrCode class="dash-icon-qr" />
                    </button>
                    <button
                      type="button"
                      data-testid="show-analytics"
                      aria-label="Show analytics"
                      aria-expanded={analyticsIsActive(link)}
                      title="Analytics"
                      onclick={() => (useDetailSidebar ? selectInSidebar(link) : toggleStats(link.code))}
                      class="dash-anal-btn {analyticsIsActive(link)
                        ? 'dash-qr-active'
                        : 'dash-qr-idle'}"
                    >
                      <BarChart2 class="dash-icon-qr" />
                    </button>
                    <LinkRowMenu
                      code={link.code}
                      copied={copiedCode === link.code}
                      class="dash-menu-btn"
                      onCopy={() => handleCopyLink(link.code)}
                      onEdit={() => startEditing(link)}
                      onOpenLink={() => window.open(`/r/${link.code}`, '_blank', 'noopener')}
                      onDelete={() => handleDelete(link.code)}
                    />
                  </div>
                </td>
              </tr>
              {#if !useDetailSidebar && expandedCode === link.code}
                <tr class="dash-expanded-tr">
                  <td colspan="4" class="dash-expanded-td">
                    <div
                      data-testid="row-dropdown"
                      role="region"
                      aria-label="Link details"
                      class="dash-dropdown"
                    >
                      <LinkRowDropdown
                        {link}
                        {statsOpen}
                        onToggleStats={() => toggleStats(link.code)}
                        onSaved={applySavedSettings}
                      />
                    </div>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</section>

<style>
  .dash-space-y6 > * + * {
    margin-top: 1.5rem;
  }

  .dash-header-row {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  @media (min-width: 40rem) {
    .dash-header-row {
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
    }
  }

  .dash-h1 {
    font-size: 1.5rem;
    line-height: 2rem;
    font-weight: 600;
    letter-spacing: -0.03em;
    color: var(--foreground);
  }

  .dash-desc {
    margin-top: 0.375rem;
    max-width: 32rem;
    font-size: 0.875rem;
    line-height: 1.625;
    color: var(--muted-foreground);
  }

  :global(.dash-create-btn) {
    width: 100%;
    background-color: var(--punch);
    color: var(--ink);
  }
  :global(.dash-create-btn:hover) {
    background-color: color-mix(in oklab, var(--punch) 80%, transparent);
  }
  @media (min-width: 40rem) {
    :global(.dash-create-btn) {
      width: auto;
    }
  }

  .dash-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }
  @media (min-width: 40rem) {
    .dash-grid-compact {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
  @media (min-width: 1900px) {
    .dash-grid-wide {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  :global(.dash-card-ink) {
    border: 0;
    background-color: var(--ink);
    padding: 1rem;
    color: var(--primary-foreground);
    box-shadow: none;
  }
  :global(.dash-card) {
    padding: 1rem;
  }

  .dash-card-label {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted-foreground);
  }
  .dash-white55 {
    color: rgb(255 255 255 / 0.55);
  }

  .dash-card-value-row {
    margin-top: 0.5rem;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .dash-big-num-punch {
    font-size: 1.5rem;
    line-height: 2rem;
    font-weight: 500;
    letter-spacing: -0.04em;
    color: var(--punch);
  }

  .dash-big-num {
    margin-top: 0.5rem;
    font-size: 1.5rem;
    line-height: 2rem;
    font-weight: 500;
    letter-spacing: -0.04em;
    color: var(--foreground);
  }

  :global(.dash-spark-h6w20) {
    height: 1.5rem;
    width: 5rem;
    color: var(--punch);
  }

  .dash-pulse-h6w20,
  .dash-pulse-h2w20,
  .dash-pulse-h4w14,
  .dash-pulse-h2w16 {
    animation: dash-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    border-radius: 0.25rem;
  }
  .dash-pulse-h6w20 {
    height: 1.5rem;
    width: 5rem;
    background-color: rgb(255 255 255 / 0.1);
  }
  .dash-pulse-h2w20 {
    margin-top: 0.25rem;
    display: block;
    height: 0.625rem;
    width: 5rem;
    background-color: rgb(255 255 255 / 0.1);
  }
  .dash-pulse-h4w14 {
    height: 1rem;
    width: 3.5rem;
    background-color: var(--muted);
  }
  .dash-pulse-h2w16 {
    height: 0.625rem;
    width: 4rem;
    background-color: var(--muted);
  }

  @keyframes dash-pulse {
    50% {
      opacity: 0.5;
    }
  }

  .dash-rate-text {
    margin-top: 0.25rem;
    font-size: 10px;
    font-weight: 500;
  }
  .dash-tone-punch {
    color: var(--punch);
  }
  .dash-tone-red {
    color: #ef4444;
  }
  .dash-tone-white65 {
    color: rgb(255 255 255 / 0.65);
  }

  .dash-sponsor-hide {
    display: block;
  }
  @media (min-width: 1360px) {
    .dash-sponsor-hide {
      display: none;
    }
  }

  .dash-search-wrap {
    position: relative;
  }

  :global(.dash-search-icon) {
    position: absolute;
    left: 0.875rem;
    top: 50%;
    width: 0.875rem;
    height: 0.875rem;
    transform: translateY(-50%);
    color: var(--muted-foreground);
  }

  :global(.dash-search-input) {
    height: 2.25rem;
    padding-left: 2.25rem;
    font-size: 0.875rem;
  }

  :global(.dash-table-card) {
    overflow: hidden;
    padding-top: 0;
    padding-bottom: 0;
  }
  @media (width < 48rem) {
    :global(.dash-table-card) {
      overflow: visible;
      border: 0;
      background-color: transparent;
      box-shadow: none;
    }
  }

  .dash-loading {
    padding: 2rem;
    text-align: center;
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }

  .dash-table-container {
    container-type: inline-size;
    overflow-x: auto;
  }
  @media (width < 48rem) {
    .dash-table-container {
      overflow: visible;
    }
  }

  .dash-table {
    width: 100%;
    text-align: left;
    font-size: 0.75rem;
    line-height: 1rem;
    border-collapse: collapse;
  }
  @media (width < 48rem) {
    .dash-table {
      display: block;
    }
  }

  .dash-thead {
    display: table-header-group;
  }
  @media (width < 48rem) {
    .dash-thead {
      display: none;
    }
  }

  .dash-thead-row {
    border-bottom: 1px solid var(--border);
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--muted-foreground);
  }
  :global(.dark) .dash-thead-row {
    color: var(--muted-foreground);
  }

  .dash-th,
  .dash-th-dest,
  .dash-th-right,
  .dash-th-actions {
    padding-top: 0.625rem;
    padding-bottom: 0.625rem;
  }
  .dash-th {
    padding-right: 1rem;
    padding-left: 0.75rem;
  }
  .dash-th-dest {
    padding-right: 1rem;
    padding-left: 0.5rem;
  }
  .dash-th-right,
  .dash-th-actions {
    text-align: right;
    padding-right: 0.75rem;
    padding-left: 0.5rem;
  }

  .dash-tbody {
    border-top-width: 1px;
    border-bottom-width: 1px;
    border-color: var(--border);
    color: var(--muted-foreground);
  }
  @media (width < 48rem) {
    .dash-tbody {
      display: block;
    }
    .dash-tbody > * + * {
      margin-top: 0.75rem;
    }
    .dash-tbody {
      border-top-width: 0;
    }
  }

  .dash-row {
    cursor: pointer;
    transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .dash-row-active {
    background-color: color-mix(in oklab, var(--muted) 40%, transparent);
  }
  .dash-row-hover:hover {
    background-color: color-mix(in oklab, var(--muted) 50%, transparent);
  }
  @media (width < 48rem) {
    .dash-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.75rem;
      border-radius: 1rem;
      border: 1px solid var(--border);
      background-color: var(--card);
      padding: 0.875rem;
      box-shadow: 0 14px 34px -26px rgba(17, 17, 19, 0.45);
    }
  }

  .dash-td-title {
    padding-top: 0.625rem;
    padding-bottom: 0.625rem;
    padding-right: 1rem;
    padding-left: 0.75rem;
    min-width: 220px;
  }
  @media (width < 48rem) {
    .dash-td-title {
      grid-column: span 2;
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 0.75rem;
      padding: 0;
    }
  }

  .dash-qr-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .dash-title-area {
    min-width: 0;
  }

  .dash-link-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--foreground);
  }

  .dash-row-code {
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

  .dash-td-dest {
    padding-top: 0.625rem;
    padding-bottom: 0.625rem;
    padding-right: 1rem;
    padding-left: 0.5rem;
    min-width: 240px;
  }
  @media (width < 48rem) {
    .dash-td-dest {
      grid-column: span 2;
      margin-top: 0.75rem;
      display: block;
      min-width: 0;
      padding: 0;
    }
  }
  .dash-th-wide {
    display: none;
  }
  @media (min-width: 1900px) {
    .dash-th-wide {
      display: table-cell;
    }
  }

  .dash-edit-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .dash-edit-input {
    width: 100%;
    border-radius: var(--radius);
    border: 1px solid var(--foreground);
    padding-left: 0.625rem;
    padding-right: 0.625rem;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
    font-size: 0.75rem;
    outline-style: none;
  }

  .dash-save-btn {
    cursor: pointer;
    border-radius: var(--radius);
    background-color: var(--foreground);
    padding: 0.375rem;
    color: white;
  }
  .dash-save-btn:hover {
    background-color: color-mix(in oklab, var(--foreground) 90%, transparent);
  }

  :global(.dash-icon-check) {
    width: 0.875rem;
    height: 0.875rem;
  }

  .dash-cancel-btn {
    cursor: pointer;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
    font-size: 11px;
    color: var(--muted-foreground);
  }
  .dash-cancel-btn:hover {
    color: var(--foreground);
  }

  .dash-dest-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .dash-dest-a {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    color: var(--muted-foreground);
  }
  .dash-dest-a:hover {
    color: var(--foreground);
  }
  @media (width < 48rem) {
    .dash-dest-a {
      max-width: 100%;
    }
  }
  @media (min-width: 40rem) {
    .dash-dest-a {
      max-width: 280px;
    }
  }

  .dash-edit-btn {
    cursor: pointer;
    padding: 0.25rem;
    color: var(--muted-foreground);
    opacity: 0;
    transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .dash-edit-btn:hover {
    color: var(--foreground);
  }
  .dash-dest-group:hover .dash-edit-btn {
    opacity: 1;
  }
  @media (width < 48rem) {
    .dash-edit-btn {
      padding: 0.5rem;
      opacity: 1;
    }
  }

  :global(.dash-icon-edit) {
    width: 0.75rem;
    height: 0.75rem;
  }

  .dash-td-scans {
    padding-top: 0.625rem;
    padding-bottom: 0.625rem;
    padding-right: 1rem;
    padding-left: 0.5rem;
  }
  @media (width < 48rem) {
    .dash-td-scans {
      grid-column-start: 1;
      margin-top: 0.75rem;
      align-self: center;
      padding: 0;
    }
  }

  .dash-scans-col {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  @media (width < 48rem) {
    .dash-scans-col {
      align-items: flex-start;
    }
  }
  @media (min-width: 48rem) {
    .dash-scans-col {
      align-items: flex-end;
    }
  }

  .dash-scans-flex {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .dash-scans-label-sm {
    display: none;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted-foreground);
  }
  :global(.dark) .dash-scans-label-sm {
    color: var(--muted-foreground);
  }
  @media (width < 48rem) {
    .dash-scans-label-sm {
      display: inline;
    }
  }

  .dash-scans-num {
    font-size: 13px;
    font-weight: 600;
    color: var(--foreground);
  }

  :global(.dash-spark-h4w14) {
    height: 1rem;
    width: 3.5rem;
  }

  .dash-rate-sm {
    font-size: 10px;
    font-weight: 500;
  }

  .dash-text10 {
    font-size: 10px;
    color: var(--muted-foreground);
  }

  .dash-td-actions {
    padding-top: 0.625rem;
    padding-bottom: 0.625rem;
    padding-right: 0.75rem;
    padding-left: 0.5rem;
    text-align: right;
    white-space: nowrap;
  }
  @media (width < 48rem) {
    .dash-td-actions {
      grid-column-start: 2;
      margin-top: 0.75rem;
      justify-self: end;
      padding: 0;
    }
  }

  .dash-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.375rem;
  }

  .dash-qr-btn,
  .dash-anal-btn {
    display: grid;
    width: 1.75rem;
    height: 1.75rem;
    cursor: pointer;
    place-items: center;
    border-radius: var(--radius);
    transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  @media (width < 48rem) {
    .dash-qr-btn,
    .dash-anal-btn {
      width: 2.25rem;
      height: 2.25rem;
    }
  }

  .dash-qr-active {
    background-color: var(--ink);
    color: var(--punch);
  }
  .dash-qr-idle {
    color: var(--muted-foreground);
  }
  .dash-qr-idle:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }

  :global(.dash-icon-qr) {
    width: 1rem;
    height: 1rem;
  }

  @media (width < 48rem) {
    :global(.dash-menu-btn) {
      width: 2.25rem;
      height: 2.25rem;
    }
  }

  .dash-expanded-tr {
    display: table-row;
  }
  @media (width < 48rem) {
    .dash-expanded-tr {
      display: block;
    }
  }

  .dash-expanded-tr {
    display: table-row;
  }
  @media (width < 48rem) {
    .dash-expanded-tr {
      display: block;
    }
  }

  .dash-expanded-td {
    background-color: color-mix(in oklab, var(--muted) 40%, transparent);
    padding: 0;
  }
  @media (width < 48rem) {
    .dash-expanded-td {
      display: block;
      overflow: hidden;
      border-radius: 1rem;
      border: 1px solid var(--border);
      background-color: var(--card);
    }
  }

  .dash-dropdown {
    position: sticky;
    left: 0;
    width: 100cqw;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }
  @media (width < 48rem) {
    .dash-dropdown {
      width: 100%;
    }
  }
</style>
