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
    <div class="menu-editor-intro">
      <h1 class="menu-editor-title">New menu</h1>
      <p class="menu-editor-subtitle">
        One code on the table. Change a price any time; the printed QR never changes.
      </p>
    </div>
  {/if}

  {#if loadError}
    <Alert variant="destructive">
      <AlertDescription>{loadError}</AlertDescription>
    </Alert>
  {:else if loading}
    <p class="menu-editor-loading">Loading menu…</p>
  {:else}
    <form onsubmit={submit} class="menu-editor-form">
      <div class="menu-editor-form-main">
        <div class="menu-editor-field">
          <Label for="menu-title">Menu title</Label>
          <Input
            id="menu-title"
            data-testid="menu-title"
            required
            bind:value={title}
            placeholder="Harbor Lunch"
            class="menu-editor-title-input"
          />
        </div>

        <div class="menu-editor-items">
          <div class="menu-editor-item-labels">
            <Label>Item</Label>
            <Label>Price</Label>
            <span class="menu-editor-sr-only">Remove</span>
          </div>

          <div class="menu-editor-item-rows">
            {#each items as item, i (item.id)}
              <div class="menu-editor-item-row">
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
                  <Trash2 class="menu-editor-icon-sm" />
                </Button>
              </div>
            {/each}
          </div>

          <Button type="button" variant="outline" class="menu-editor-add" data-testid="menu-add-item" onclick={addItem}>
            <Plus class="menu-editor-icon-sm" />
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
              class="menu-editor-success"
            >
              <Check class="menu-editor-success-icon" />
              <span>
                Menu live:{' '}
                <strong class="font-mono menu-editor-code">/r/{saved.code}</strong>
              </span>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              class="menu-editor-primary-action"
              data-testid="save-menu"
            >
              <span>{submitting ? 'Saving...' : 'Save menu'}</span>
              <ArrowRight class="menu-editor-icon" />
            </Button>
          {:else}
            <Button
              type="submit"
              disabled={submitting}
              class="menu-editor-primary-action"
              data-testid="create-menu"
            >
              <span>{submitting ? 'Creating...' : 'Create menu QR'}</span>
              <ArrowRight class="menu-editor-icon" />
            </Button>
          {/if}
        </div>
      </div>

      <div class="menu-editor-qr-side">
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
            class="menu-editor-primary-action"
            data-testid="scan-menu"
            onclick={scanShownMenu}
          >
            <BarChart3 class="menu-editor-icon" />
            Scan menu
          </Button>
          {#if scanError}
            <p data-testid="scan-menu-error" class="menu-editor-scan-error">{scanError}</p>
          {/if}
        {/if}
      </div>
    </form>
  {/if}
</section>
<style>
  @layer components {
    .menu-editor-intro {
      margin-bottom: 1.5rem;
    }

    .menu-editor-title {
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--foreground);
    }

    .menu-editor-subtitle {
      margin-top: 0.375rem;
      max-width: 32rem;
      font-size: 0.875rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .menu-editor-loading {
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }

    .menu-editor-form {
      display: grid;
      align-items: start;
      row-gap: 1.5rem;
      column-gap: 1.5rem;
    }

    .menu-editor-form-main {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .menu-editor-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .menu-editor-items {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .menu-editor-item-labels {
      display: grid;
      grid-template-columns: 1fr 7rem auto;
      align-items: center;
      gap: 0.5rem;
    }

    .menu-editor-item-rows {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .menu-editor-item-row {
      display: grid;
      grid-template-columns: 1fr 7rem auto;
      gap: 0.5rem;
    }

    :global(.menu-editor-title-input) {
      height: 2.75rem;
      font-size: 1rem;
    }

    .menu-editor-success {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background-color: color-mix(in oklab, var(--muted) 50%, transparent);
      padding: 0.75rem;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    :global(.menu-editor-success-icon) {
      width: 1rem;
      height: 1rem;
      color: #16a34a;
    }

    .menu-editor-code {
      color: var(--foreground);
    }

    :global(.menu-editor-primary-action) {
      height: 2.5rem;
      width: 100%;
      background-color: var(--punch);
      color: var(--ink);
    }

    .menu-editor-qr-side {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .menu-editor-scan-error {
      text-align: center;
      font-size: 0.875rem;
      color: var(--destructive);
    }

    .menu-editor-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  }

  /* unlayered: states, responsive, dark, hover that must win */
  :global(.menu-editor-primary-action):hover {
    background-color: color-mix(in oklab, var(--punch) 80%, transparent);
  }

  :global(.menu-editor-icon-sm) {
    width: 0.875rem;
    height: 0.875rem;
  }

  :global(.menu-editor-icon) {
    width: 1rem;
    height: 1rem;
  }

  @media (min-width: 64rem) {
    .menu-editor-form {
      grid-template-columns: minmax(0, 1fr) 300px;
      column-gap: 2.5rem;
    }
  }

  @media (min-width: 48rem) {
    :global(.menu-editor-title-input) {
      font-size: 1rem;
    }
  }

  :global(.menu-editor-add) {
    align-self: flex-start;
    width: fit-content;
  }

</style>
