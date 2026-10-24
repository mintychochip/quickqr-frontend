<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Search from '@lucide/svelte/icons/search';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Button from '@/lib/components/ui/button.svelte';
  import Card from '@/lib/components/ui/card.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import { deleteLink, fetchLinks } from '../lib/api';
  import { siteUrl } from '../lib/siteUrl';
  import type { Link } from '../types';

  type Props = { canDelete?: boolean };
  let { canDelete = false }: Props = $props();

  let sites = $state<Link[]>([]);
  let allLinks = $state<Link[]>([]);
  let loading = $state(true);
  let search = $state('');
  let copiedCode = $state<string | null>(null);

  $effect(() => {
    let cancelled = false;
    fetchLinks()
      .then((all) => {
        if (cancelled) return;
        allLinks = all;
        sites = all.filter((link) => link.kind === 'site');
      })
      .catch(() => {
        if (!cancelled) sites = [];
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });
    return () => {
      cancelled = true;
    };
  });

  /** A menu's published site is not an independent site: its scans are the menu's, and deleting it only unpublishes. */
  const menusBySite = $derived(
    Object.fromEntries(
      allLinks
        .filter((link) => link.kind === 'menu' && link.published_site_code)
        .map((menu) => [menu.published_site_code as string, menu]),
    ) as Record<string, Link>,
  );

  function scansFor(site: Link): number {
    return menusBySite[site.code]?.total_scans ?? site.total_scans ?? 0;
  }

  const filtered = $derived(
    sites.filter(
      (site) =>
        (site.title || '').toLowerCase().includes(search.toLowerCase()) ||
        site.code.toLowerCase().includes(search.toLowerCase()),
    ),
  );
  const totalScans = $derived(sites.reduce((sum, site) => sum + scansFor(site), 0));

  async function copy(code: string) {
    await navigator.clipboard.writeText(siteUrl(code));
    copiedCode = code;
    setTimeout(() => (copiedCode = null), 2000);
  }

  async function remove(site: Link) {
    const menu = menusBySite[site.code];
    const label = site.title || 'this site';
    const message = menu
      ? `Delete ${label}? This removes the published page; the menu and its QR keep working and return to the dynamic menu.`
      : `Delete ${label}? Its files stop serving and its printed QR code stops working.`;
    if (!window.confirm(message)) return;
    try {
      await deleteLink(site.code);
      sites = sites.filter((row) => row.code !== site.code);
      allLinks = allLinks.map((row) =>
        row.kind === 'menu' && row.published_site_code === site.code ? { ...row, published_site_code: undefined } : row,
      );
    } catch {
      /* keep the row; the API surfaces the reason */
    }
  }
</script>

<section class="sites-section" data-testid="sites-section">
  <div class="sites-header">
    <div>
      <h1 class="sites-title">Sites</h1>
      <p class="sites-subtitle">Static sites hosted on quickqr, behind their own QR code. A published menu's site appears here too.</p>
    </div>
  </div>

  <div class="sites-stats">
    <Card class="sites-stat sites-stat-ink">
      <div class="sites-stat-label">Sites</div>
      <div class="sites-stat-value sites-stat-value-punch">{sites.length}</div>
    </Card>
    <Card class="sites-stat">
      <div class="sites-stat-label">Scans</div>
      <div class="sites-stat-value">{totalScans.toLocaleString()}</div>
    </Card>
  </div>

  <div class="sites-search">
    <Search class="sites-search-icon" />
    <Input bind:value={search} type="text" placeholder="Search sites..." class="sites-search-input" />
  </div>

  <Card class="sites-card">
    {#if loading}
      <div class="sites-empty">Loading sites...</div>
    {:else if filtered.length === 0}
      <div class="sites-empty" data-testid="sites-empty">
        {sites.length === 0 ? 'No sites yet. Publish a menu, or create a site through the API.' : 'No sites match that search.'}
      </div>
    {:else}
      <ul class="sites-list">
        {#each filtered as site (site.code)}
          <li class="sites-row" data-testid="site-row" data-site-code={site.code}>
            <div class="sites-row-main">
              <a class="sites-row-title" href={siteUrl(site.code)} target="_blank" rel="noreferrer">{site.title || 'Untitled site'}</a>
              <div class="sites-row-meta">
                <span class="sites-row-code">/{site.code}</span>
                {#if menusBySite[site.code]}
                  <span class="sites-row-badge" data-testid="site-published-menu">Published menu</span>
                {/if}
              </div>
            </div>
            <div class="sites-row-scans"><span data-testid="site-scans">{scansFor(site)}</span> scans</div>
            <div class="sites-row-actions">
              <Button
                variant="outline"
                size="sm"
                href={siteUrl(site.code)}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${site.title || 'site'}`}
                data-testid="site-open"
              >
                <ExternalLink class="sites-icon" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onclick={() => copy(site.code)}
                aria-label={`Copy ${site.title || 'site'} address`}
                data-testid="site-copy"
              >
                {#if copiedCode === site.code}
                  <Check class="sites-icon" />
                {:else}
                  Copy
                {/if}
              </Button>
              {#if canDelete}
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => remove(site)}
                  aria-label={`Delete ${site.title || 'site'}`}
                  data-testid="site-delete"
                >
                  <Trash2 class="sites-icon" />
                </Button>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </Card>
</section>

<style>
  .sites-section {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .sites-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .sites-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--foreground);
  }

  .sites-subtitle {
    margin: 6px 0 0;
    max-width: 42rem;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--muted-foreground);
  }

  .sites-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  :global(.sites-stat) {
    padding: 16px 18px;
  }

  :global(.sites-stat-ink) {
    background: var(--ink);
    color: var(--on-ink);
    border-color: transparent;
  }

  .sites-stat-label {
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }

  :global(.sites-stat-ink) .sites-stat-label {
    color: color-mix(in srgb, var(--on-ink) 68%, transparent);
  }

  .sites-stat-value {
    margin-top: 4px;
    font-size: 1.6rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .sites-stat-value-punch {
    color: var(--punch);
  }

  .sites-search {
    position: relative;
  }

  :global(.sites-search-icon) {
    position: absolute;
    left: 12px;
    top: 50%;
    width: 15px;
    height: 15px;
    transform: translateY(-50%);
    color: var(--muted-foreground);
    pointer-events: none;
  }

  :global(.sites-search-input) {
    padding-left: 34px;
  }

  :global(.sites-card) {
    padding: 0;
    overflow: hidden;
  }

  .sites-empty {
    padding: 42px 20px;
    text-align: center;
    font-size: 0.9rem;
    color: var(--muted-foreground);
  }

  .sites-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .sites-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 16px;
    padding: 14px 18px;
  }

  .sites-row + .sites-row {
    border-top: 1px solid var(--border);
  }

  .sites-row-main {
    min-width: 0;
  }

  .sites-row-title {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    color: var(--foreground);
    text-decoration: none;
  }

  .sites-row-title:hover {
    text-decoration: underline;
  }

  .sites-row-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
    min-width: 0;
  }

  .sites-row-code {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }

  .sites-row-badge {
    flex: none;
    padding: 1px 6px;
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 0.65rem;
    line-height: 1.5;
    letter-spacing: 0.02em;
    color: var(--muted-foreground);
    white-space: nowrap;
  }

  .sites-row-scans {
    font-size: 0.8rem;
    color: var(--muted-foreground);
    white-space: nowrap;
  }

  .sites-row-scans span {
    font-weight: 600;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
  }

  .sites-row-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  :global(.sites-icon) {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 640px) {
    .sites-stats {
      grid-template-columns: minmax(0, 1fr);
    }

    .sites-row {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .sites-row-scans {
      display: none;
    }
  }
</style>
