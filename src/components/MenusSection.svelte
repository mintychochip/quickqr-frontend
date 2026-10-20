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

<section data-testid="menus-section" class="space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 class="text-2xl font-semibold tracking-[-0.03em] text-foreground">Menus</h1>
      <p class="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
        Hosted menus behind printed codes. Edit rows, prices, and titles any time.
      </p>
    </div>
    <Button href="/dashboard/menus/new" class="w-full bg-punch text-ink hover:bg-punch/80 sm:w-auto">
      <Plus class="size-4" />
      New menu
    </Button>
  </div>

  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <Card class="border-0 bg-ink p-4 text-primary-foreground shadow-none ring-0">
      <div class="text-[11px] font-medium uppercase tracking-[0.12em] text-white/55">Menus</div>
      <div class="mt-2 text-2xl font-medium tracking-[-0.04em] text-punch">{menus.length}</div>
    </Card>
    <Card class="p-4">
      <div class="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Menu scans
      </div>
      <div class="mt-2 text-2xl font-medium tracking-[-0.04em] text-foreground">
        {totalScans.toLocaleString()}
      </div>
    </Card>
    <Card class="p-4">
      <div class="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Listed items
      </div>
      <div class="mt-2 text-2xl font-medium tracking-[-0.04em] text-foreground">{totalItems}</div>
    </Card>
  </div>

  <div class="relative">
    <Search class="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    <Input bind:value={search} type="text" placeholder="Search menus..." class="h-9 pl-9 text-sm" />
  </div>

  <Card class="overflow-hidden py-0 max-md:overflow-visible max-md:bg-transparent max-md:shadow-none max-md:ring-0">
    {#if loading}
      <div class="p-8 text-center text-xs text-muted-foreground">Loading menus...</div>
    {:else if filtered.length === 0}
      <div class="p-8 text-center text-xs text-muted-foreground">
        {menus.length === 0 ? 'No menus yet. Create your first menu.' : 'No menus match that search.'}
      </div>
    {:else}
      <div class="overflow-x-auto max-md:overflow-visible">
        <table class="w-full text-left text-xs border-collapse max-md:block">
          <thead class="max-md:hidden">
            <tr
              class="border-b border-border text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70 dark:text-muted-foreground"
            >
              <th class="py-2.5 pr-4 pl-3">Menu</th>
              <th class="py-2.5 pr-4 pl-2">Items</th>
              <th class="py-2.5 pr-4 pl-2 text-right">Scans</th>
              <th class="py-2.5 pr-3 pl-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border text-muted-foreground max-md:block max-md:space-y-3 max-md:divide-y-0">
            {#each filtered as menu (menu.code)}
              <tr
                onclick={(event) => onRowClick(event, menu)}
                class="cursor-pointer transition-colors hover:bg-muted/50 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:rounded-2xl max-md:border max-md:border-border max-md:bg-card max-md:p-3.5 max-md:shadow-[0_14px_34px_-26px_rgba(17,17,19,0.45)]"
              >
                <td class="py-2.5 pr-4 pl-3 min-w-[220px] max-md:col-span-2 max-md:min-w-0 max-md:p-0">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onclick={() => openPreview(menu)}
                    class="block max-w-full cursor-pointer truncate text-left text-[13px] font-semibold tracking-[-0.01em] text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    {menu.title || 'Untitled menu'}
                  </button>
                  <div
                    class="mt-1 inline-block rounded-md bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground"
                  >
                    /r/{menu.code}
                  </div>
                </td>
                <td class="py-2.5 pr-4 pl-2 whitespace-nowrap max-md:col-start-1 max-md:mt-3 max-md:self-center max-md:p-0 max-md:text-[11px]">
                  {menu.items?.length ?? 0} items
                </td>
                <td class="py-2.5 pr-4 pl-2 text-right max-md:col-start-2 max-md:mt-3 max-md:self-center max-md:p-0">
                  <span
                    class="hidden text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70 dark:text-muted-foreground max-md:inline"
                  >
                    Scans
                  </span>
                  <span class="font-mono text-[13px] font-semibold text-foreground">
                    {menu.total_scans || 0}
                  </span>
                </td>
                <td class="py-2.5 pr-3 pl-2 max-md:col-span-2 max-md:mt-2 max-md:p-0">
                  <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 text-[12px] max-md:h-9 max-md:px-3"
                      data-testid="menu-edit"
                      href={`/dashboard/menus/${menu.code}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 text-[12px] max-md:h-9 max-md:px-3"
                      onclick={() => copyLink(menu.code)}
                    >
                      {#if copiedCode === menu.code}
                        <Check class="size-3.5" />
                      {:else}
                        Copy
                      {/if}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 text-[12px] max-md:size-9 max-md:px-0"
                      data-testid="menu-preview"
                      aria-label="Preview menu"
                      aria-haspopup="dialog"
                      title="Preview menu"
                      onclick={() => openPreview(menu)}
                    >
                      <Eye class="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 text-[12px] text-destructive max-md:h-9 max-md:px-3"
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
