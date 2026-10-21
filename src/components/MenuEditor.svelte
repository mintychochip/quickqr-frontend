<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import BarChart3 from '@lucide/svelte/icons/chart-no-axes-column';
  import QRCanvas from './QRCanvas.svelte';
  import Button from '@/lib/components/ui/button.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import Label from '@/lib/components/ui/label.svelte';
  import Alert from '@/lib/components/ui/alert.svelte';
  import AlertDescription from '@/lib/components/ui/alert-description.svelte';
  import { createMenu, updateMenu, fetchLinks } from '../lib/api';
  import { decodeQrCanvas, menuLocationFromScan } from '../lib/scanQr';
  import { dynamicQrValue, dynamicShortLink } from '../lib/dynamicQr';
  import { DEFAULT_QR_PRESET_ID, presetStyleById, withQrStyleDefaults } from '../lib/qrStylePresets';
  import type { Link, MenuItem } from '../types';

  type Props = {
    /** Present on /dashboard/menus/:code to edit an existing menu. */
    code?: string | null;
  };

  let { code = null }: Props = $props();

  /** `/dashboard/menus/new` creates; a real code edits. */
  const editingCode = $derived(code && code !== 'new' ? code : null);

  type MenuDraft = { id: string; name: string; price: string };
  let draftSeq = 0;
  function newMenuDraft(): MenuDraft {
    draftSeq += 1;
    return { id: `menu-item-${draftSeq}`, name: '', price: '' };
  }

  let title = $state('');
  let items = $state<MenuDraft[]>([newMenuDraft(), newMenuDraft()]);
  let saved = $state<Link | null>(null);
  let loading = $state(false);
  let submitting = $state(false);
  let loadError = $state('');
  let errorMsg = $state('');
  let scanError = $state('');

  const qrStyle = withQrStyleDefaults(presetStyleById(DEFAULT_QR_PRESET_ID));

  /** Saved styles predate the newer optional fields; defaults fill the gaps. */
  function savedStyle(style: Link['style']): typeof qrStyle | undefined {
    return style ? withQrStyleDefaults(style as ReturnType<typeof presetStyleById>) : undefined;
  }

  function draftItems(): MenuItem[] {
    return items.map((item) => ({ name: item.name.trim(), price: item.price.trim() }));
  }

  $effect(() => {
    if (!editingCode) return;
    loading = true;
    let cancelled = false;
    loadError = '';
    fetchLinks()
      .then((links) => {
        if (cancelled) return;
        const found = links.find((l) => l.kind === 'menu' && l.code === editingCode);
        if (!found) {
          loadError = 'That menu no longer exists.';
          return;
        }
        title = found.title;
        items = (found.items ?? []).map((item) => ({
          id: `menu-item-${item.name}-${item.price}`,
          name: item.name,
          price: item.price,
        }));
        saved = found;
      })
      .catch((err: unknown) => {
        if (!cancelled) loadError = err instanceof Error ? err.message : 'Failed to load menu';
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });
    return () => {
      cancelled = true;
    };
  });

  const liveOrigin = $derived(window.location.origin);
  const qrValue = $derived(dynamicQrValue(liveOrigin, saved?.code ?? 'menu-preview'));

  function addItem() {
    items = [...items, newMenuDraft()];
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    items = items.filter((item) => item.id !== id);
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    submitting = true;
    errorMsg = '';
    try {
      saved = saved
        ? await updateMenu(saved.code, { title: title.trim(), items: draftItems() })
        : await createMenu({ title: title.trim(), items: draftItems() });
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : 'Failed to save menu';
    } finally {
      submitting = false;
    }
  }

  /** Same simulator the studio used: decode the shown QR and open the menu it points to. */
  async function scanShownMenu() {
    scanError = '';
    const canvas = document.querySelector(
      '[data-testid="menu-editor"] canvas[data-testid="qr-canvas"]',
    ) as HTMLCanvasElement | null;
    if (!canvas) {
      scanError = 'The menu QR is not on screen yet.';
      return;
    }
    const started = performance.now();
    let payload: string | null = null;
    while (performance.now() - started < 2000) {
      payload = decodeQrCanvas(canvas);
      if (payload) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const path = payload ? menuLocationFromScan(payload) : null;
    if (!path) {
      scanError = 'Could not read a menu from that QR.';
      return;
    }
    window.location.assign(path);
  }
</script>

<section data-testid="menu-editor">
  {#if !editingCode}
    <div class="mb-6">
      <h1 class="text-2xl font-semibold tracking-[-0.03em] text-foreground">New menu</h1>
      <p class="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
        One code on the table. Change a price any time; the printed QR never changes.
      </p>
    </div>
  {/if}

  {#if loadError}
    <Alert variant="destructive">
      <AlertDescription>{loadError}</AlertDescription>
    </Alert>
  {:else if loading}
    <p class="text-sm text-muted-foreground">Loading menu…</p>
  {:else}
    <form onsubmit={submit} class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-10">
      <div class="min-w-0 space-y-4">
        <div class="space-y-2">
          <Label for="menu-title">Menu title</Label>
          <Input
            id="menu-title"
            data-testid="menu-title"
            required
            bind:value={title}
            placeholder="Harbor Lunch"
            class="h-11 text-base md:text-base"
          />
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-[1fr_7rem_auto] items-center gap-2">
            <Label>Item</Label>
            <Label>Price</Label>
            <span class="sr-only">Remove</span>
          </div>

          <div class="space-y-2">
            {#each items as item, i (item.id)}
              <div class="grid grid-cols-[1fr_7rem_auto] gap-2">
                <Input
                  data-testid="menu-item-name"
                  required
                  bind:value={items[i].name}
                  placeholder="Tomato soup"
                  aria-label="Item name"
                />
                <Input
                  data-testid="menu-item-price"
                  required
                  bind:value={items[i].price}
                  placeholder="6.00"
                  aria-label="Item price"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  data-testid="menu-remove-item"
                  disabled={items.length <= 1}
                  aria-label="Remove item"
                  onclick={() => removeItem(item.id)}
                >
                  <Trash2 class="size-3.5" />
                </Button>
              </div>
            {/each}
          </div>

          <Button type="button" variant="outline" data-testid="menu-add-item" onclick={addItem}>
            <Plus class="size-3.5" />
            Add item
          </Button>

          {#if errorMsg}
            <Alert variant="destructive">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          {/if}

          {#if saved}
            <div
              data-testid="menu-success"
              class="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground"
            >
              <Check class="size-4 text-green-600" />
              <span>
                Menu live:{' '}
                <strong class="font-mono text-foreground">/r/{saved.code}</strong>
              </span>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              class="h-10 w-full bg-punch text-ink hover:bg-punch/80"
              data-testid="save-menu"
            >
              <span>{submitting ? 'Saving...' : 'Save menu'}</span>
              <ArrowRight class="size-4" />
            </Button>
          {:else}
            <Button
              type="submit"
              disabled={submitting}
              class="h-10 w-full bg-punch text-ink hover:bg-punch/80"
              data-testid="create-menu"
            >
              <span>{submitting ? 'Creating...' : 'Create menu QR'}</span>
              <ArrowRight class="size-4" />
            </Button>
          {/if}
        </div>
      </div>

      <div class="w-full space-y-3">
        <QRCanvas
          value={qrValue}
          displayValue={saved ? dynamicShortLink(liveOrigin, saved.code) : 'Not saved yet'}
          showLinkActions={Boolean(saved)}
          style={savedStyle(saved?.style) ?? qrStyle}
          label={title || 'menu'}
        />

        {#if saved}
          <Button
            type="button"
            class="w-full bg-punch text-ink hover:bg-punch/80"
            data-testid="scan-menu"
            onclick={scanShownMenu}
          >
            <BarChart3 class="size-4" />
            Scan menu
          </Button>
          {#if scanError}
            <p data-testid="scan-menu-error" class="text-center text-sm text-destructive">{scanError}</p>
          {/if}
        {/if}
      </div>
    </form>
  {/if}
</section>
