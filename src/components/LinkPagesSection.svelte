<script lang="ts">
  import Search from '@lucide/svelte/icons/search';
  import Plus from '@lucide/svelte/icons/plus';
  import Eye from '@lucide/svelte/icons/eye';
  import Check from '@lucide/svelte/icons/check';
  import Card from '@/lib/components/ui/card.svelte';
  import Button from '@/lib/components/ui/button.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import PreviewDrawer from './PreviewDrawer.svelte';
  import { fetchLinks, deleteLink } from '../lib/api';
  import type { Link } from '../types';

  let pages = $state<Link[]>([]);
  let loading = $state(true);
  let search = $state('');
  let copiedCode = $state<string | null>(null);
  let previewOpen = $state(false);
  let previewPage = $state<Link | null>(null);

  $effect(() => {
    fetchLinks()
      .then((links) => {
        pages = links.filter((l) => l.kind === 'linkpage');
      })
      .catch(() => {
        pages = [];
      })
      .finally(() => {
        loading = false;
      });
  });

  const filtered = $derived(
    pages.filter(
      (p) =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()),
    ),
  );
  const totalScans = $derived(pages.reduce((sum, p) => sum + (p.total_scans || 0), 0));
  const totalLinks = $derived(pages.reduce((sum, p) => sum + (p.links?.length ?? 0), 0));

  async function copyLink(code: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/r/${code}`);
    copiedCode = code;
    setTimeout(() => (copiedCode = null), 2000);
  }

  async function remove(code: string) {
    if (!window.confirm(`Delete /r/${code}? The printed code stops working.`)) return;
    try {
      await deleteLink(code);
      pages = pages.filter((p) => p.code !== code);
    } catch {
      /* keep the row; error surfaced by the API */
    }
  }

  function openPreview(page: Link) {
    previewPage = page;
    previewOpen = true;
  }

  function onRowClick(event: MouseEvent, page: Link) {
    const target = event.target;
    if (target instanceof Element && target.closest('a, button, input, [role="menuitem"]')) return;
    openPreview(page);
  }
</script>

<section data-testid="link-pages-section" class="link-pages-section">
  <div class="link-pages-section-header">
    <div>
      <h1 class="link-pages-section-title">Link pages</h1>
      <p class="link-pages-section-subtitle">
        One code opens a whole list of destinations. Reorder or swap links without reprinting.
      </p>
    </div>
    <Button href="/dashboard/pages/new" class="link-pages-section-new-btn">
      <Plus class="link-pages-section-icon" />
      New link page
    </Button>
  </div>

  <div class="link-pages-section-stats">
    <Card class="link-pages-section-stat-card link-pages-section-stat-ink">
      <div class="link-pages-section-stat-label">Link pages</div>
      <div class="link-pages-section-stat-value link-pages-section-stat-value-punch">{pages.length}</div>
    </Card>
    <Card class="link-pages-section-stat-card">
      <div class="link-pages-section-stat-label">Page scans</div>
      <div class="link-pages-section-stat-value">{totalScans.toLocaleString()}</div>
    </Card>
    <Card class="link-pages-section-stat-card">
      <div class="link-pages-section-stat-label">Listed links</div>
      <div class="link-pages-section-stat-value">{totalLinks}</div>
    </Card>
  </div>

  <div class="link-pages-section-search">
    <Search class="link-pages-section-search-icon" />
    <Input bind:value={search} type="text" placeholder="Search link pages..." class="link-pages-section-search-input" />
  </div>

  <Card class="link-pages-section-table-card">
    {#if loading}
      <div class="link-pages-section-loading">Loading link pages...</div>
    {:else if filtered.length === 0}
      <div class="link-pages-section-empty">
        {pages.length === 0 ? 'No link pages yet. Create your first page.' : 'No pages match that search.'}
      </div>
    {:else}
      <div class="link-pages-section-table-wrap">
        <table class="link-pages-section-table">
          <thead class="link-pages-section-thead">
            <tr class="link-pages-section-head">
              <th class="link-pages-section-th">Page</th>
              <th class="link-pages-section-th">Links</th>
              <th class="link-pages-section-th link-pages-section-th-right">Scans</th>
              <th class="link-pages-section-th link-pages-section-th-right">Actions</th>
            </tr>
          </thead>
          <tbody class="link-pages-section-tbody">
            {#each filtered as page (page.code)}
              <tr
                onclick={(event) => onRowClick(event, page)}
                class="link-pages-section-row"
              >
                <td class="link-pages-section-cell-menu">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onclick={() => openPreview(page)}
                    class="link-pages-section-link-btn"
                  >
                    {page.title || 'Untitled page'}
                  </button>
                  <div class="link-pages-section-code">
                    /r/{page.code}
                  </div>
                </td>
                <td class="link-pages-section-cell-items">
                  {page.links?.length ?? 0} links
                </td>
                <td class="link-pages-section-cell-scans">
                  <span class="link-pages-section-scans-label">Scans</span>
                  <span class="link-pages-section-scans-num">{page.total_scans || 0}</span>
                </td>
                <td class="link-pages-section-cell-actions">
                  <div class="link-pages-section-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      class="link-pages-section-edit-btn"
                      data-testid="page-edit"
                      href={`/dashboard/pages/${page.code}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="link-pages-section-copy-btn"
                      onclick={() => copyLink(page.code)}
                    >
                      {#if copiedCode === page.code}
                        <Check class="link-pages-section-icon-sm" />
                      {:else}
                        Copy
                      {/if}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="link-pages-section-preview-btn"
                      data-testid="page-preview"
                      aria-label="Preview link page"
                      aria-haspopup="dialog"
                      title="Preview link page"
                      onclick={() => openPreview(page)}
                    >
                      <Eye class="link-pages-section-icon-sm" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="link-pages-section-delete-btn"
                      data-testid="page-delete"
                      onclick={() => remove(page.code)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  <PreviewDrawer
    bind:open={previewOpen}
    kind="linkpage"
    title={previewPage?.title ?? ''}
    code={previewPage?.code ?? ''}
    scans={previewPage?.total_scans ?? 0}
    editHref={`/dashboard/pages/${previewPage?.code ?? ''}`}
  />
</section>
<style>
  @layer components {
    .link-pages-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .link-pages-section-header {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .link-pages-section-title {
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--foreground);
    }

    .link-pages-section-subtitle {
      margin-top: 0.375rem;
      max-width: 32rem;
      font-size: 0.875rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .link-pages-section-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    :global(.link-pages-section-stat-card) {
      padding: 1rem;
    }

    :global(.link-pages-section-stat-ink) {
      border: 0;
      background-color: var(--ink);
      color: var(--primary-foreground);
      box-shadow: none;
    }

    .link-pages-section-stat-label {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted-foreground);
    }

    :global(.link-pages-section-stat-ink) .link-pages-section-stat-label {
      color: rgb(255 255 255 / 0.55);
    }

    .link-pages-section-stat-value {
      margin-top: 0.5rem;
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 500;
      letter-spacing: -0.04em;
    }

    .link-pages-section-stat-value-punch {
      color: var(--punch);
    }

    :global(.link-pages-section-search-input) {
      height: 2.25rem;
      padding-left: 2.25rem;
      font-size: 0.875rem;
    }
    :global(.link-pages-section-new-btn) {
      width: 100%;
      background-color: var(--punch);
      color: var(--ink);
    }

    :global(.link-pages-section-table-card) {
      overflow: hidden;
      padding-top: 0;
      padding-bottom: 0;
    }

    :global(.link-pages-section-edit-btn),
    :global(.link-pages-section-copy-btn),
    :global(.link-pages-section-preview-btn),
    :global(.link-pages-section-delete-btn) {
      height: 1.75rem;
      font-size: 0.75rem;
    }

    :global(.link-pages-section-delete-btn) {
      color: var(--destructive);
    }

    .link-pages-section-loading,
    .link-pages-section-empty {
      padding: 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .link-pages-section-table-wrap {
      overflow-x: auto;
    }

    .link-pages-section-table {
      width: 100%;
      text-align: left;
      font-size: 0.75rem;
      border-collapse: collapse;
    }

    .link-pages-section-thead {
      display: table-header-group;
    }

    .link-pages-section-head {
      border-bottom: 1px solid var(--border);
      font-size: 0.625rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
    }

    .link-pages-section-th {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.75rem;
    }

    .link-pages-section-th-right {
      text-align: right;
    }

    .link-pages-section-tbody {
      color: var(--muted-foreground);
    }

    .link-pages-section-row {
      cursor: pointer;
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .link-pages-section-cell-menu {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.75rem;
      min-width: 220px;
    }

    .link-pages-section-link-btn {
      display: block;
      max-width: 100%;
      cursor: pointer;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--foreground);
      outline: none;
    }

    .link-pages-section-code {
      margin-top: 0.25rem;
      display: inline-block;
      border-radius: calc(var(--radius) * 0.8);
      background-color: var(--muted);
      padding-left: 0.375rem;
      padding-right: 0.375rem;
      padding-top: 0.0625rem;
      padding-bottom: 0.0625rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.625rem;
      color: var(--muted-foreground);
    }

    .link-pages-section-cell-items {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.5rem;
      white-space: nowrap;
    }

    .link-pages-section-cell-scans {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.5rem;
      text-align: right;
    }

    .link-pages-section-scans-label {
      font-size: 0.625rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
    }

    .link-pages-section-scans-num {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--foreground);
    }

    .link-pages-section-cell-actions {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 0.75rem;
      padding-left: 0.5rem;
    }

    .link-pages-section-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.375rem;
      white-space: nowrap;
    }

    :global(.link-pages-section-edit-btn),
    :global(.link-pages-section-copy-btn),
    :global(.link-pages-section-preview-btn),
    :global(.link-pages-section-delete-btn) {
      height: 1.75rem;
      font-size: 0.75rem;
    }

    :global(.link-pages-section-delete-btn) {
      color: var(--destructive);
    }
  }

  /* unlayered: hover, focus, @media, dark */
  :global(.link-pages-section-new-btn):hover {
    background-color: color-mix(in oklab, var(--punch) 80%, transparent);
  }

  .link-pages-section-row:hover {
    background-color: color-mix(in oklab, var(--muted) 50%, transparent);
  }

  .link-pages-section-link-btn:hover {
    text-decoration: underline;
  }

  .link-pages-section-link-btn:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  :global(.link-pages-section-icon),
  :global(.link-pages-section-icon-sm) {
    width: 1rem;
    height: 1rem;
  }

  :global(.link-pages-section-icon-sm) {
    width: 0.875rem;
    height: 0.875rem;
  }

  :global(.link-pages-section-search-icon) {
    position: absolute;
    left: 0.875rem;
    top: 50%;
    width: 0.875rem;
    height: 0.875rem;
    transform: translateY(-50%);
    color: var(--muted-foreground);
  }

  @media (min-width: 40rem) {
    .link-pages-section-header {
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
    }

    :global(.link-pages-section-new-btn) {
      width: auto;
    }

    .link-pages-section-stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (width < 48rem) {
    .link-pages-section-table-wrap {
      overflow-x: visible;
    }

    .link-pages-section-table {
      display: block;
    }

    .link-pages-section-thead {
      display: none;
    }

    .link-pages-section-tbody {
      display: block;
    }

    .link-pages-section-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.75rem 0.75rem;
      border-radius: calc(var(--radius) * 1.8);
      border: 1px solid var(--border);
      background-color: var(--card);
      padding: 0.875rem;
      box-shadow: 0 14px 34px -26px rgba(17, 17, 19, 0.45);
    }

    .link-pages-section-cell-menu {
      grid-column: span 2;
      min-width: 0;
      padding: 0;
    }

    .link-pages-section-cell-items {
      grid-column-start: 1;
      margin-top: 0.75rem;
      align-self: center;
      padding: 0;
      font-size: 0.6875rem;
    }

    .link-pages-section-cell-scans {
      grid-column-start: 2;
      margin-top: 0.75rem;
      align-self: center;
      padding: 0;
    }

    .link-pages-section-scans-label {
      display: inline;
    }

    .link-pages-section-cell-actions {
      grid-column: span 2;
      margin-top: 0.5rem;
      padding: 0;
    }

    :global(.link-pages-section-edit-btn),
    :global(.link-pages-section-copy-btn),
    :global(.link-pages-section-delete-btn) {
      height: 2.25rem;
      padding-left: 0.75rem;
      padding-right: 0.75rem;
    }

    :global(.link-pages-section-preview-btn) {
      height: 2.25rem;
      width: 2.25rem;
      padding: 0;
    }
  }

  :global(.dark) .link-pages-section-head,
  :global(.dark) .link-pages-section-scans-label {
    color: var(--muted-foreground);
  }
</style>
