<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ScanLine from '@lucide/svelte/icons/scan-line';
  import QRCanvas from './QRCanvas.svelte';
  import Button from '@/lib/components/ui/button.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import Label from '@/lib/components/ui/label.svelte';
  import Alert from '@/lib/components/ui/alert.svelte';
  import AlertDescription from '@/lib/components/ui/alert-description.svelte';
  import { createPage, updatePage, fetchLinks } from '../lib/api';
  import { decodeQrCanvas, menuLocationFromScan } from '../lib/scanQr';
  import { dynamicQrValue, dynamicShortLink } from '../lib/dynamicQr';
  import { DEFAULT_QR_PRESET_ID, presetStyleById, withQrStyleDefaults } from '../lib/qrStylePresets';
  import type { Link, PageLink } from '../types';

  type Props = {
    /** Present on /dashboard/pages/:code to edit an existing link page. */
    code?: string | null;
  };

  let { code = null }: Props = $props();

  /** `/dashboard/pages/new` creates; a real code edits. */
  const editingCode = $derived(code && code !== 'new' ? code : null);

  type LinkDraft = { id: string; name: string; url: string };
  let draftSeq = 0;
  function newLinkDraft(): LinkDraft {
    draftSeq += 1;
    return { id: `page-link-${draftSeq}`, name: '', url: '' };
  }

  let title = $state('');
  let links = $state<LinkDraft[]>([newLinkDraft(), newLinkDraft()]);
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

  function draftLinks(): PageLink[] {
    return links.map((entry) => ({ name: entry.name.trim(), url: entry.url.trim() }));
  }

  $effect(() => {
    if (!editingCode) return;
    loading = true;
    let cancelled = false;
    loadError = '';
    fetchLinks()
      .then((all) => {
        if (cancelled) return;
        const found = all.find((l) => l.kind === 'linkpage' && l.code === editingCode);
        if (!found) {
          loadError = 'That link page no longer exists.';
          return;
        }
        title = found.title;
        links = (found.links ?? []).map((entry, index) => ({
          id: `page-link-${index}-${entry.name}`,
          name: entry.name,
          url: entry.url,
        }));
        saved = found;
      })
      .catch((err: unknown) => {
        if (!cancelled) loadError = err instanceof Error ? err.message : 'Failed to load link page';
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });
    return () => {
      cancelled = true;
    };
  });

  const qrValue = $derived(dynamicQrValue(window.location.origin, saved?.code ?? 'page-preview'));

  function addLink() {
    links = [...links, newLinkDraft()];
  }

  function removeLink(id: string) {
    if (links.length <= 1) return;
    links = links.filter((entry) => entry.id !== id);
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    submitting = true;
    errorMsg = '';
    try {
      saved = saved
        ? await updatePage(saved.code, { title: title.trim(), links: draftLinks() })
        : await createPage({ title: title.trim(), links: draftLinks() });
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : 'Failed to save link page';
    } finally {
      submitting = false;
    }
  }

  /** Same simulator as the menu editor: decode the shown QR and open the page it points to. */
  async function scanShownPage() {
    scanError = '';
    const canvas = document.querySelector(
      '[data-testid="link-page-editor"] canvas[data-testid="qr-canvas"]',
    ) as HTMLCanvasElement | null;
    if (!canvas) {
      scanError = 'The page QR is not on screen yet.';
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
      scanError = 'Could not read a page from that QR.';
      return;
    }
    window.location.assign(path);
  }
</script>

<section data-testid="link-page-editor">
  {#if !editingCode}
    <div class="link-page-editor-intro">
      <h1 class="link-page-editor-title">New link page</h1>
      <p class="link-page-editor-subtitle">
        Order online, call, map, reviews. One code opens them all, and you can change the list any time.
      </p>
    </div>
  {/if}

  {#if loadError}
    <Alert variant="destructive">
      <AlertDescription>{loadError}</AlertDescription>
    </Alert>
  {:else if loading}
    <p class="link-page-editor-loading">Loading link page…</p>
  {:else}
    <form onsubmit={submit} class="link-page-editor-form">
      <div class="link-page-editor-form-main">
        <div class="link-page-editor-field">
          <Label for="page-title">Page title</Label>
          <Input
            id="page-title"
            data-testid="page-title"
            required
            bind:value={title}
            placeholder="Harbor Lunch"
            class="link-page-editor-title-input"
          />
        </div>

        <div class="link-page-editor-items">
          <div class="link-page-editor-item-labels">
            <Label>Name</Label>
            <Label>URL</Label>
            <span class="link-page-editor-sr-only">Remove</span>
          </div>

          <div class="link-page-editor-item-rows">
            {#each links as entry, i (entry.id)}
              <div class="link-page-editor-item-row">
                <Input
                  data-testid="page-link-name"
                  required
                  bind:value={links[i].name}
                  placeholder="Order online"
                  aria-label="Link name"
                />
                <Input
                  data-testid="page-link-url"
                  type="url"
                  required
                  bind:value={links[i].url}
                  placeholder="https://example.com/order"
                  aria-label="Link URL"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  data-testid="page-remove-link"
                  disabled={links.length <= 1}
                  aria-label="Remove link"
                  onclick={() => removeLink(entry.id)}
                >
                  <Trash2 class="link-page-editor-icon-sm" />
                </Button>
              </div>
            {/each}
          </div>

          <Button type="button" variant="outline" class="link-page-editor-add" data-testid="page-add-link" onclick={addLink}>
            <Plus class="link-page-editor-icon-sm" />
            Add link
          </Button>

          {#if errorMsg}
            <Alert variant="destructive">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          {/if}

          {#if saved}
            <div
              data-testid="page-success"
              class="link-page-editor-success"
            >
              <Check class="link-page-editor-success-icon" />
              <span>
                Page live:{' '}
                <strong class="font-mono link-page-editor-code">/r/{saved.code}</strong>
              </span>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              class="link-page-editor-primary-action"
              data-testid="save-page"
            >
              <span>{submitting ? 'Saving...' : 'Save page'}</span>
              <ArrowRight class="link-page-editor-icon" />
            </Button>
          {:else}
            <Button
              type="submit"
              disabled={submitting}
              class="link-page-editor-primary-action"
              data-testid="create-page"
            >
              <span>{submitting ? 'Creating...' : 'Create page QR'}</span>
              <ArrowRight class="link-page-editor-icon" />
            </Button>
          {/if}
        </div>
      </div>

      <div class="link-page-editor-qr-side">
        <QRCanvas
          value={qrValue}
          displayValue={saved ? dynamicShortLink(window.location.origin, saved.code) : 'Not saved yet'}
          showLinkActions={Boolean(saved)}
          style={savedStyle(saved?.style) ?? qrStyle}
          label={title || 'links'}
        />

        {#if saved}
          <Button
            type="button"
            class="link-page-editor-primary-action"
            data-testid="scan-page"
            onclick={scanShownPage}
          >
            <ScanLine class="link-page-editor-icon" />
            Scan page
          </Button>
          {#if scanError}
            <p data-testid="scan-page-error" class="link-page-editor-scan-error">{scanError}</p>
          {/if}
        {/if}
      </div>
    </form>
  {/if}
</section>
<style>
  @layer components {
    .link-page-editor-intro {
      margin-bottom: 1.5rem;
    }

    .link-page-editor-title {
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--foreground);
    }

    .link-page-editor-subtitle {
      margin-top: 0.375rem;
      max-width: 32rem;
      font-size: 0.875rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .link-page-editor-loading {
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }

    .link-page-editor-form {
      display: grid;
      align-items: start;
      row-gap: 1.5rem;
      column-gap: 1.5rem;
    }

    .link-page-editor-form-main {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .link-page-editor-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .link-page-editor-items {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .link-page-editor-item-labels {
      display: grid;
      grid-template-columns: 1fr 1.4fr auto;
      align-items: center;
      gap: 0.5rem;
    }

    .link-page-editor-item-rows {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .link-page-editor-item-row {
      display: grid;
      grid-template-columns: 1fr 1.4fr auto;
      gap: 0.5rem;
    }

    :global(.link-page-editor-title-input) {
      height: 2.75rem;
      font-size: 1rem;
    }

    .link-page-editor-success {
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

    :global(.link-page-editor-success-icon) {
      width: 1rem;
      height: 1rem;
      color: #16a34a;
    }

    .link-page-editor-code {
      color: var(--foreground);
    }

    :global(.link-page-editor-primary-action) {
      height: 2.5rem;
      width: 100%;
      background-color: var(--punch);
      color: var(--ink);
    }

    .link-page-editor-qr-side {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .link-page-editor-scan-error {
      text-align: center;
      font-size: 0.875rem;
      color: var(--destructive);
    }

    .link-page-editor-sr-only {
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

  /* unlayered: states, responsive etc */
  :global(.link-page-editor-primary-action):hover {
    background-color: color-mix(in oklab, var(--punch) 80%, transparent);
  }

  :global(.link-page-editor-icon-sm) {
    width: 0.875rem;
    height: 0.875rem;
  }

  :global(.link-page-editor-icon) {
    width: 1rem;
    height: 1rem;
  }

  @media (min-width: 64rem) {
    .link-page-editor-form {
      grid-template-columns: minmax(0, 1fr) 300px;
      column-gap: 2.5rem;
    }
  }

  @media (min-width: 48rem) {
    :global(.link-page-editor-title-input) {
      font-size: 1rem;
    }
  }

  :global(.link-page-editor-add) {
    align-self: flex-start;
    width: fit-content;
  }

</style>
