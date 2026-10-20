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

<section data-testid="link-pages-section" class="space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 class="text-2xl font-semibold tracking-[-0.03em] text-foreground">Link pages</h1>
      <p class="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
        One code opens a whole list of destinations. Reorder or swap links without reprinting.
      </p>
    </div>
    <Button href="/dashboard/pages/new" class="w-full bg-punch text-ink hover:bg-punch/80 sm:w-auto">
      <Plus class="size-4" />
      New link page
    </Button>
  </div>

  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <Card class="border-0 bg-ink p-4 text-primary-foreground shadow-none ring-0">
      <div class="text-[11px] font-medium uppercase tracking-[0.12em] text-white/55">Link pages</div>
      <div class="mt-2 text-2xl font-medium tracking-[-0.04em] text-punch">{pages.length}</div>
    </Card>
    <Card class="p-4">
      <div class="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Page scans
      </div>
      <div class="mt-2 text-2xl font-medium tracking-[-0.04em] text-foreground">
        {totalScans.toLocaleString()}
      </div>
    </Card>
    <Card class="p-4">
      <div class="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Listed links
      </div>
      <div class="mt-2 text-2xl font-medium tracking-[-0.04em] text-foreground">{totalLinks}</div>
    </Card>
  </div>

  <div class="relative">
    <Search class="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    <Input bind:value={search} type="text" placeholder="Search link pages..." class="h-9 pl-9 text-sm" />
  </div>

  <Card class="overflow-hidden py-0 max-md:overflow-visible max-md:bg-transparent max-md:shadow-none max-md:ring-0">
    {#if loading}
      <div class="p-8 text-center text-xs text-muted-foreground">Loading link pages...</div>
    {:else if filtered.length === 0}
      <div class="p-8 text-center text-xs text-muted-foreground">
        {pages.length === 0 ? 'No link pages yet. Create your first page.' : 'No pages match that search.'}
      </div>
    {:else}
      <div class="overflow-x-auto max-md:overflow-visible">
        <table class="w-full text-left text-xs border-collapse max-md:block">
          <thead class="max-md:hidden">
            <tr
              class="border-b border-border text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70 dark:text-muted-foreground"
            >
              <th class="py-2.5 pr-4 pl-3">Page</th>
              <th class="py-2.5 pr-4 pl-2">Links</th>
              <th class="py-2.5 pr-4 pl-2 text-right">Scans</th>
              <th class="py-2.5 pr-3 pl-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border text-muted-foreground max-md:block max-md:space-y-3 max-md:divide-y-0">
            {#each filtered as page (page.code)}
              <tr
                onclick={(event) => onRowClick(event, page)}
                class="cursor-pointer transition-colors hover:bg-muted/50 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:rounded-2xl max-md:border max-md:border-border max-md:bg-card max-md:p-3.5 max-md:shadow-[0_14px_34px_-26px_rgba(17,17,19,0.45)]"
              >
                <td class="py-2.5 pr-4 pl-3 min-w-[220px] max-md:col-span-2 max-md:min-w-0 max-md:p-0">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onclick={() => openPreview(page)}
                    class="block max-w-full cursor-pointer truncate text-left text-[13px] font-semibold tracking-[-0.01em] text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    {page.title || 'Untitled page'}
                  </button>
                  <div
                    class="mt-1 inline-block rounded-md bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground"
                  >
                    /r/{page.code}
                  </div>
                </td>
                <td class="py-2.5 pr-4 pl-2 whitespace-nowrap max-md:col-start-1 max-md:mt-3 max-md:self-center max-md:p-0 max-md:text-[11px]">
                  {page.links?.length ?? 0} links
                </td>
                <td class="py-2.5 pr-4 pl-2 text-right max-md:col-start-2 max-md:mt-3 max-md:self-center max-md:p-0">
                  <span
                    class="hidden text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70 dark:text-muted-foreground max-md:inline"
                  >
                    Scans
                  </span>
                  <span class="font-mono text-[13px] font-semibold text-foreground">
                    {page.total_scans || 0}
                  </span>
                </td>
                <td class="py-2.5 pr-3 pl-2 max-md:col-span-2 max-md:mt-2 max-md:p-0">
                  <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 text-[12px] max-md:h-9 max-md:px-3"
                      data-testid="page-edit"
                      href={`/dashboard/pages/${page.code}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 text-[12px] max-md:h-9 max-md:px-3"
                      onclick={() => copyLink(page.code)}
                    >
                      {#if copiedCode === page.code}
                        <Check class="size-3.5" />
                      {:else}
                        Copy
                      {/if}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 text-[12px] max-md:size-9 max-md:px-0"
                      data-testid="page-preview"
                      aria-label="Preview link page"
                      aria-haspopup="dialog"
                      title="Preview link page"
                      onclick={() => openPreview(page)}
                    >
                      <Eye class="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 text-[12px] text-destructive max-md:h-9 max-md:px-3"
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
