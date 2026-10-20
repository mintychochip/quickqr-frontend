<script lang="ts">
  import BarChart2 from '@lucide/svelte/icons/chart-no-axes-column';
  import QrCode from '@lucide/svelte/icons/qr-code';
  import Edit2 from '@lucide/svelte/icons/pencil';
  import Check from '@lucide/svelte/icons/check';
  import Search from '@lucide/svelte/icons/search';
  import { fade } from 'svelte/transition';
  import type { Link, Sponsor } from '../types';
  import type { DetailSelection, SavedLink } from '../types/dashboard';
  import { fetchLinkAnalytics, fetchLinks, updateLink, deleteLink } from '../lib/api';
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
    scanTrendFromSummary,
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

    const queue = [...items];
    const workers = Array.from({ length: 5 }, async () => {
      while (queue.length > 0) {
        const link = queue.shift();
        if (!link) return;
        try {
          const summary = await fetchLinkAnalytics(link.code);
          if (generation !== statsGeneration) return;
          rowStats = {
            ...rowStats,
            [link.code]: scanTrendFromSummary(summary),
          };
        } catch {
          if (generation !== statsGeneration) return;
          rowStats = {
            ...rowStats,
            [link.code]: failedScanTrend(link.total_scans || 0),
          };
        }
      }
    });
    await Promise.all(workers);
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

<section id="dashboard" class="space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 class="text-2xl font-semibold tracking-[-0.03em] text-foreground">Dynamic links</h1>
      <p class="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
        Change the destination anytime. The printed code stays the same.
      </p>
    </div>

    <Button
      onclick={onCreate}
      class="w-full bg-punch text-ink hover:bg-punch/80 sm:w-auto"
    >
      + Create code
    </Button>
  </div>

  <div class="grid grid-cols-2 gap-3 {compactTable ? 'min-[1900px]:grid-cols-4' : 'sm:grid-cols-4'}">
    <Card class="border-0 bg-ink p-4 text-primary-foreground shadow-none ring-0">
      <div class="text-[11px] font-medium uppercase tracking-[0.12em] text-white/55">Dynamic scans</div>
      <div class="mt-2 flex items-end justify-between gap-3">
        <div class="text-2xl font-medium tracking-[-0.04em] text-punch">
          {totalScans.toLocaleString()}
        </div>
        {#if aggregateTrend}
          <span in:fade={{ duration: 160 }}>
            <Sparkline
              points={aggregateTrend.points}
              class="h-6 w-20 text-punch"
              label="Scan trend for all dynamic links over the last six hours"
            />
          </span>
        {:else}
          <span class="h-6 w-20 animate-pulse rounded bg-white/10"></span>
        {/if}
      </div>
      {#if aggregateTrend}
        <p
          in:fade={{ duration: 160 }}
          class="mt-1 text-[10px] font-medium {aggregateTrend.rate === null
            ? 'text-punch'
            : aggregateTrend.rate > 0
              ? 'text-punch'
              : aggregateTrend.rate < 0
                ? 'text-red-300'
                : 'text-white/65'}"
        >
          {formatScanRate(aggregateTrend.rate, aggregateTrend.lastHour)}
        </p>
      {:else}
        <span class="mt-1 block h-2.5 w-20 animate-pulse rounded bg-white/10"></span>
      {/if}
    </Card>
    <Card class="p-4">
      <div class="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Dynamic links
      </div>
      <div class="mt-2 text-2xl font-medium tracking-[-0.04em] text-foreground">{totalLinks}</div>
    </Card>
    <Card class="p-4">
      <div class="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Menus
      </div>
      <div class="mt-2 text-2xl font-medium tracking-[-0.04em] text-foreground">{totalMenus}</div>
    </Card>
    <Card class="p-4">
      <div class="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Link pages
      </div>
      <div class="mt-2 text-2xl font-medium tracking-[-0.04em] text-foreground">{totalPages}</div>
    </Card>
  </div>

  {#if sponsor}
    <div class="min-[1360px]:hidden">
      <AdSpace variant="leaderboard" sponsor={sponsor} slotId="dashboard-banner" />
    </div>
  {/if}

  <div class="relative">
    <Search class="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    <Input
      type="text"
      bind:value={searchQuery}
      placeholder="Search links..."
      class="h-9 pl-9 text-sm"
    />
  </div>

  <Card class="overflow-hidden py-0 max-md:overflow-visible max-md:bg-transparent max-md:shadow-none max-md:ring-0">
    {#if loading}
      <div class="p-8 text-center text-xs text-muted-foreground">Loading links...</div>
    {:else if filteredLinks.length === 0}
      <div class="p-8 text-center text-xs text-muted-foreground">No dynamic links found.</div>
    {:else}
      <div class="@container overflow-x-auto max-md:overflow-visible">
        <table class="w-full text-left text-xs border-collapse max-md:block">
          <thead class="max-md:hidden">
            <tr class="border-b border-border text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70 dark:text-muted-foreground">
              <th class="py-2.5 pr-4 pl-3">Title &amp; Code</th>
              <th class="py-2.5 pr-4 pl-2 {compactTable ? 'hidden min-[1900px]:table-cell' : ''}">Destination URL</th>
              <th class="py-2.5 pr-4 pl-2 text-right">Scans</th>
              <th class="py-2.5 pr-3 pl-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border text-muted-foreground max-md:block max-md:space-y-3 max-md:divide-y-0">
            {#each filteredLinks as link (link.code)}
              {@const qrValue = dynamicQrValue(window.location.origin, link.code)}
              {@const trend = rowStats[link.code]}
              <tr
                onclick={(event) => onRowClick(event, link)}
                class="{rowIsActive(link)
                  ? 'bg-muted/40'
                  : 'hover:bg-muted/50'} cursor-pointer transition-colors max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:rounded-2xl max-md:border max-md:border-border max-md:bg-card max-md:p-3.5 max-md:shadow-[0_14px_34px_-26px_rgba(17,17,19,0.45)]"
              >
                <td class="py-2.5 pr-4 pl-3 min-w-[220px] max-md:col-span-2 max-md:flex max-md:min-w-0 max-md:items-center max-md:gap-3 max-md:p-0">
                  <div class="flex items-center gap-3">
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
                    <div class="min-w-0">
                      <div class="truncate text-[13px] font-semibold tracking-[-0.01em] text-foreground">
                        {link.title || 'Untitled'}
                      </div>
                      <div
                        class="mt-1 inline-block rounded-md bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground"
                      >
                        /r/{link.code}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="py-2.5 pr-4 pl-2 min-w-[240px] max-md:col-span-2 max-md:mt-3 max-md:block max-md:min-w-0 max-md:p-0 {compactTable ? 'hidden min-[1900px]:table-cell' : ''}">
                  {#if editingCode === link.code}
                    <div class="flex items-center gap-1.5">
                      <input
                        type="url"
                        bind:value={editUrl}
                        class="w-full rounded-lg border border-foreground px-2.5 py-1 text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onclick={() => handleSaveEdit(link.code)}
                        disabled={isUpdating}
                        class="cursor-pointer rounded-lg bg-foreground p-1.5 text-white hover:bg-foreground/90"
                        title="Save"
                      >
                        <Check class="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onclick={() => (editingCode = null)}
                        class="cursor-pointer px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  {:else}
                    <div class="group flex items-center gap-2">
                      <a
                        href={link.destination_url}
                        target="_blank"
                        rel="noreferrer"
                        class="max-w-[200px] truncate font-mono text-[11px] text-muted-foreground hover:text-foreground max-md:max-w-full sm:max-w-[280px]"
                      >
                        {link.destination_url}
                      </a>
                      <button
                        type="button"
                        onclick={() => startEditing(link)}
                        class="cursor-pointer p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground max-md:p-2 max-md:opacity-100"
                        title="Edit destination URL"
                      >
                        <Edit2 class="w-3 h-3" />
                      </button>
                    </div>
                  {/if}
                </td>
                <td class="py-2.5 pr-4 pl-2 max-md:col-start-1 max-md:mt-3 max-md:self-center max-md:p-0">
                  <div class="flex flex-col gap-0.5 max-md:items-start md:items-end">
                    <div class="flex items-center gap-2">
                      <span
                        class="hidden text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70 dark:text-muted-foreground max-md:inline"
                      >
                        Scans
                      </span>
                      <span class="font-mono text-[13px] font-semibold text-foreground">
                        {(trend?.total ?? link.total_scans ?? 0).toLocaleString()}
                      </span>
                      {#if trend && !trend.loading && !trend.error}
                        <span
                          data-testid="scan-sparkline"
                          in:fade={{ duration: 160 }}
                          class={scanRateTone(trend.rate, trend.lastHour)}
                          title="Hourly scans over the last six hours"
                        >
                          <Sparkline points={trend.points} class="h-4 w-14" />
                        </span>
                      {:else if trend?.error}
                        <span class="text-[10px] text-muted-foreground">—</span>
                      {:else}
                        <span class="h-4 w-14 animate-pulse rounded bg-muted"></span>
                      {/if}
                    </div>
                    {#if trend && !trend.loading && !trend.error}
                      <span
                        data-testid="scan-rate"
                        in:fade={{ duration: 160 }}
                        class="text-[10px] font-medium {scanRateTone(trend.rate, trend.lastHour)}"
                        title="Scan rate this hour compared with the previous hour"
                      >
                        {formatScanRate(trend.rate, trend.lastHour)}
                      </span>
                    {:else if trend?.error}
                      <span class="text-[10px] text-muted-foreground">Trend unavailable</span>
                    {:else}
                      <span class="h-2.5 w-16 animate-pulse rounded bg-muted"></span>
                    {/if}
                  </div>
                </td>
                <td class="py-2.5 pr-3 pl-2 text-right whitespace-nowrap max-md:col-start-2 max-md:mt-3 max-md:justify-self-end max-md:p-0">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      data-testid="show-qr"
                      aria-label="Show QR Code"
                      aria-expanded={rowIsActive(link)}
                      title="Show QR Code"
                      onclick={() => (useDetailSidebar ? selectInSidebar(link) : toggleQr(link.code))}
                      class="grid size-7 cursor-pointer place-items-center rounded-lg transition-colors max-md:size-9 {rowIsActive(link)
                        ? 'bg-ink text-punch'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
                    >
                      <QrCode class="size-4" />
                    </button>
                    <button
                      type="button"
                      data-testid="show-analytics"
                      aria-label="Show analytics"
                      aria-expanded={analyticsIsActive(link)}
                      title="Analytics"
                      onclick={() => (useDetailSidebar ? selectInSidebar(link) : toggleStats(link.code))}
                      class="grid size-7 cursor-pointer place-items-center rounded-lg transition-colors max-md:size-9 {analyticsIsActive(link)
                        ? 'bg-ink text-punch'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
                    >
                      <BarChart2 class="size-4" />
                    </button>
                    <LinkRowMenu
                      code={link.code}
                      copied={copiedCode === link.code}
                      class="max-md:size-9"
                      onCopy={() => handleCopyLink(link.code)}
                      onEdit={() => startEditing(link)}
                      onOpenLink={() => window.open(`/r/${link.code}`, '_blank', 'noopener')}
                      onDelete={() => handleDelete(link.code)}
                    />
                  </div>
                </td>
              </tr>
              {#if !useDetailSidebar && expandedCode === link.code}
                <tr class="max-md:block">
                  <td colspan="4" class="bg-muted/40 p-0 max-md:block max-md:overflow-hidden max-md:rounded-2xl max-md:border max-md:border-border max-md:bg-card">
                    <div
                      data-testid="row-dropdown"
                      role="region"
                      aria-label="Link details"
                      class="sticky left-0 w-[100cqw] px-3 py-3 max-md:w-full"
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
