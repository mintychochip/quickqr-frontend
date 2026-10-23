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

  let menus = $state<Link[]>([]);
  let loading = $state(true);
  let search = $state('');
  let copiedCode = $state<string | null>(null);
  let previewOpen = $state(false);
  let previewMenu = $state<Link | null>(null);

  $effect(() => {
    fetchLinks()
      .then((links) => {
        menus = links.filter((l) => l.kind === 'menu');
      })
      .catch(() => {
        menus = [];
      })
      .finally(() => {
        loading = false;
      });
  });

  const filtered = $derived(
    menus.filter(
      (m) =>
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.code.toLowerCase().includes(search.toLowerCase()),
    ),
  );
  const totalScans = $derived(menus.reduce((sum, m) => sum + (m.total_scans || 0), 0));
  const totalItems = $derived(menus.reduce((sum, m) => sum + (m.items?.length ?? 0), 0));

  async function copyLink(code: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/r/${code}`);
    copiedCode = code;
    setTimeout(() => (copiedCode = null), 2000);
  }

  async function remove(code: string) {
    if (!window.confirm(`Delete /r/${code}? The printed code stops working.`)) return;
    try {
      await deleteLink(code);
      menus = menus.filter((m) => m.code !== code);
    } catch {
      /* keep the row; error surfaced by the API */
    }
  }

  function openPreview(menu: Link) {
    previewMenu = menu;
    previewOpen = true;
  }

  function onRowClick(event: MouseEvent, menu: Link) {
    const target = event.target;
    if (target instanceof Element && target.closest('a, button, input, [role="menuitem"]')) return;
    openPreview(menu);
  }
</script>

<section data-testid="menus-section" class="menus-section">
  <div class="menus-section-header">
    <div>
      <h1 class="menus-section-title">Menus</h1>
      <p class="menus-section-subtitle">
        Hosted menus behind printed codes. Edit rows, prices, and titles any time.
      </p>
    </div>
    <Button href="/dashboard/menus/new" class="menus-section-new-btn">
      <Plus class="menus-section-icon" />
      New menu
    </Button>
  </div>

  <div class="menus-section-stats">
    <Card class="menus-section-stat-card menus-section-stat-ink">
      <div class="menus-section-stat-label">Menus</div>
      <div class="menus-section-stat-value menus-section-stat-value-punch">{menus.length}</div>
    </Card>
    <Card class="menus-section-stat-card">
      <div class="menus-section-stat-label">Menu scans</div>
      <div class="menus-section-stat-value">{totalScans.toLocaleString()}</div>
    </Card>
    <Card class="menus-section-stat-card">
      <div class="menus-section-stat-label">Listed items</div>
      <div class="menus-section-stat-value">{totalItems}</div>
    </Card>
  </div>

  <div class="menus-section-search">
    <Search class="menus-section-search-icon" />
    <Input bind:value={search} type="text" placeholder="Search menus..." class="menus-section-search-input" />
  </div>

  <Card class="menus-section-table-card">
    {#if loading}
      <div class="menus-section-loading">Loading menus...</div>
    {:else if filtered.length === 0}
      <div class="menus-section-empty">
        {menus.length === 0 ? 'No menus yet. Create your first menu.' : 'No menus match that search.'}
      </div>
    {:else}
      <div class="menus-section-table-wrap">
        <table class="menus-section-table">
          <thead class="menus-section-thead">
            <tr class="menus-section-head">
              <th class="menus-section-th">Menu</th>
              <th class="menus-section-th">Items</th>
              <th class="menus-section-th menus-section-th-right">Scans</th>
              <th class="menus-section-th menus-section-th-right">Actions</th>
            </tr>
          </thead>
          <tbody class="menus-section-tbody">
            {#each filtered as menu (menu.code)}
              <tr
                onclick={(event) => onRowClick(event, menu)}
                class="menus-section-row"
              >
                <td class="menus-section-cell-menu">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onclick={() => openPreview(menu)}
                    class="menus-section-link-btn"
                  >
                    {menu.title || 'Untitled menu'}
                  </button>
                  <div class="menus-section-code">
                    /r/{menu.code}
                  </div>
                </td>
                <td class="menus-section-cell-items">
                  {menu.items?.length ?? 0} items
                </td>
                <td class="menus-section-cell-scans">
                  <span class="menus-section-scans-label">Scans</span>
                  <span class="menus-section-scans-num">{menu.total_scans || 0}</span>
                </td>
                <td class="menus-section-cell-actions">
                  <div class="menus-section-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      class="menus-section-edit-btn"
                      data-testid="menu-edit"
                      href={`/dashboard/menus/${menu.code}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="menus-section-copy-btn"
                      onclick={() => copyLink(menu.code)}
                    >
                      {#if copiedCode === menu.code}
                        <Check class="menus-section-icon-sm" />
                      {:else}
                        Copy
                      {/if}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="menus-section-preview-btn"
                      data-testid="menu-preview"
                      aria-label="Preview menu"
                      aria-haspopup="dialog"
                      title="Preview menu"
                      onclick={() => openPreview(menu)}
                    >
                      <Eye class="menus-section-icon-sm" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="menus-section-delete-btn"
                      data-testid="menu-delete"
                      onclick={() => remove(menu.code)}
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
    kind="menu"
    title={previewMenu?.title ?? ''}
    code={previewMenu?.code ?? ''}
    scans={previewMenu?.total_scans ?? 0}
    editHref={`/dashboard/menus/${previewMenu?.code ?? ''}`}
  />
</section>
<style>
  @layer components {
    .menus-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .menus-section-header {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .menus-section-title {
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--foreground);
    }

    .menus-section-subtitle {
      margin-top: 0.375rem;
      max-width: 32rem;
      font-size: 0.875rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .menus-section-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    :global(.menus-section-stat-card) {
      padding: 1rem;
    }

    :global(.menus-section-stat-ink) {
      border: 0;
      background-color: var(--ink);
      color: var(--primary-foreground);
      box-shadow: none;
    }

    .menus-section-stat-label {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted-foreground);
    }

    :global(.menus-section-stat-ink) .menus-section-stat-label {
      color: rgb(255 255 255 / 0.55);
    }

    .menus-section-stat-value {
      margin-top: 0.5rem;
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 500;
      letter-spacing: -0.04em;
    }

    .menus-section-stat-value-punch {
      color: var(--punch);
    }

    :global(.menus-section-search-input) {
      height: 2.25rem;
      padding-left: 2.25rem;
      font-size: 0.875rem;
    }
    :global(.menus-section-new-btn) {
      width: 100%;
      background-color: var(--punch);
      color: var(--ink);
    }

    :global(.menus-section-table-card) {
      overflow: hidden;
      padding-top: 0;
      padding-bottom: 0;
    }

    :global(.menus-section-edit-btn),
    :global(.menus-section-copy-btn),
    :global(.menus-section-preview-btn),
    :global(.menus-section-delete-btn) {
      height: 1.75rem;
      font-size: 0.75rem;
    }

    :global(.menus-section-delete-btn) {
      color: var(--destructive);
    }

    .menus-section-loading,
    .menus-section-empty {
      padding: 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .menus-section-table-wrap {
      overflow-x: auto;
    }

    .menus-section-table {
      width: 100%;
      text-align: left;
      font-size: 0.75rem;
      border-collapse: collapse;
    }

    .menus-section-thead {
      display: table-header-group;
    }

    .menus-section-head {
      border-bottom: 1px solid var(--border);
      font-size: 0.625rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
    }

    .menus-section-th {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.75rem;
    }

    .menus-section-th-right {
      text-align: right;
    }

    .menus-section-tbody {
      color: var(--muted-foreground);
    }

    .menus-section-row {
      cursor: pointer;
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .menus-section-cell-menu {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.75rem;
      min-width: 220px;
    }

    .menus-section-link-btn {
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

    .menus-section-code {
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

    .menus-section-cell-items {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.5rem;
      white-space: nowrap;
    }

    .menus-section-cell-scans {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.5rem;
      text-align: right;
    }

    .menus-section-scans-label {
      font-size: 0.625rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
    }

    .menus-section-scans-num {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--foreground);
    }

    .menus-section-cell-actions {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 0.75rem;
      padding-left: 0.5rem;
    }

    .menus-section-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.375rem;
      white-space: nowrap;
    }

    :global(.menus-section-edit-btn),
    :global(.menus-section-copy-btn),
    :global(.menus-section-preview-btn),
    :global(.menus-section-delete-btn) {
      height: 1.75rem;
      font-size: 0.75rem;
    }

    :global(.menus-section-delete-btn) {
      color: var(--destructive);
    }
  }

  /* unlayered rules: hover, focus, responsive, dark overrides */
  :global(.menus-section-new-btn):hover {
    background-color: color-mix(in oklab, var(--punch) 80%, transparent);
  }

  .menus-section-row:hover {
    background-color: color-mix(in oklab, var(--muted) 50%, transparent);
  }

  .menus-section-link-btn:hover {
    text-decoration: underline;
  }

  .menus-section-link-btn:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  :global(.menus-section-icon),
  :global(.menus-section-icon-sm) {
    width: 1rem;
    height: 1rem;
  }

  :global(.menus-section-icon-sm) {
    width: 0.875rem;
    height: 0.875rem;
  }

  :global(.menus-section-search-icon) {
    position: absolute;
    left: 0.875rem;
    top: 50%;
    width: 0.875rem;
    height: 0.875rem;
    transform: translateY(-50%);
    color: var(--muted-foreground);
  }

  :global(.menus-section-search-icon) {
    position: absolute;
    left: 0.875rem;
    top: 50%;
    width: 0.875rem;
    height: 0.875rem;
    transform: translateY(-50%);
    color: var(--muted-foreground);
  }

  @media (min-width: 40rem) {
    .menus-section-header {
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
    }

    :global(.menus-section-new-btn) {
      width: auto;
    }

    .menus-section-stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (width < 48rem) {
    .menus-section-table-wrap {
      overflow-x: visible;
    }

    .menus-section-table {
      display: block;
    }

    .menus-section-thead {
      display: none;
    }

    .menus-section-tbody {
      display: block;
    }

    .menus-section-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.75rem 0.75rem;
      border-radius: calc(var(--radius) * 1.8);
      border: 1px solid var(--border);
      background-color: var(--card);
      padding: 0.875rem;
      box-shadow: 0 14px 34px -26px rgba(17, 17, 19, 0.45);
    }

    .menus-section-cell-menu {
      grid-column: span 2;
      min-width: 0;
      padding: 0;
    }

    .menus-section-cell-items {
      grid-column-start: 1;
      margin-top: 0.75rem;
      align-self: center;
      padding: 0;
      font-size: 0.6875rem;
    }

    .menus-section-cell-scans {
      grid-column-start: 2;
      margin-top: 0.75rem;
      align-self: center;
      padding: 0;
    }

    .menus-section-scans-label {
      display: inline;
    }

    .menus-section-cell-actions {
      grid-column: span 2;
      margin-top: 0.5rem;
      padding: 0;
    }

    :global(.menus-section-edit-btn),
    :global(.menus-section-copy-btn),
    :global(.menus-section-delete-btn) {
      height: 2.25rem;
      padding-left: 0.75rem;
      padding-right: 0.75rem;
    }

    :global(.menus-section-preview-btn) {
      height: 2.25rem;
      width: 2.25rem;
      padding: 0;
    }
  }

  :global(.dark) .menus-section-head,
  :global(.dark) .menus-section-scans-label {
    color: var(--muted-foreground);
  }
</style>
