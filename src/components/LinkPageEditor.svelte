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
  import { presetStyleById, withQrStyleDefaults } from '../lib/qrStylePresets';
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
  let copied = $state(false);

  const qrStyle = withQrStyleDefaults(presetStyleById('quickqr_brand'));

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

  function shortLink() {
    return saved ? `${window.location.origin}/r/${saved.code}` : '';
  }

  async function copyLink() {
    if (!saved) return;
    await navigator.clipboard.writeText(shortLink());
    copied = true;
    setTimeout(() => (copied = false), 2000);
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
    <div class="mb-6">
      <h1 class="text-2xl font-semibold tracking-[-0.03em] text-foreground">New link page</h1>
      <p class="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
        Order online, call, map, reviews — one code opens them all, and you can change the list any time.
      </p>
    </div>
  {/if}

  {#if loadError}
    <Alert variant="destructive">
      <AlertDescription>{loadError}</AlertDescription>
    </Alert>
  {:else if loading}
    <p class="text-sm text-muted-foreground">Loading link page…</p>
  {:else}
    <form onsubmit={submit} class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-10">
      <div class="min-w-0 space-y-4">
        <div class="space-y-2">
          <Label for="page-title">Page title</Label>
          <Input
            id="page-title"
            data-testid="page-title"
            required
            bind:value={title}
            placeholder="Harbor Lunch"
            class="h-11 text-base md:text-base"
          />
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-[1fr_1.4fr_auto] items-center gap-2">
            <Label>Name</Label>
            <Label>URL</Label>
            <span class="sr-only">Remove</span>
          </div>

          <div class="space-y-2">
            {#each links as entry, i (entry.id)}
              <div class="grid grid-cols-[1fr_1.4fr_auto] gap-2">
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
                  <Trash2 class="size-3.5" />
                </Button>
              </div>
            {/each}
          </div>

          <Button type="button" variant="outline" data-testid="page-add-link" onclick={addLink}>
            <Plus class="size-3.5" />
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
              class="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground"
            >
              <Check class="size-4 text-green-600" />
              <span>
                Page live:{' '}
                <strong class="font-mono text-foreground">/r/{saved.code}</strong>
              </span>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              class="h-10 w-full bg-punch text-ink hover:bg-punch/80"
              data-testid="save-page"
            >
              <span>{submitting ? 'Saving...' : 'Save page'}</span>
              <ArrowRight class="size-4" />
            </Button>
          {:else}
            <Button
              type="submit"
              disabled={submitting}
              class="h-10 w-full bg-punch text-ink hover:bg-punch/80"
              data-testid="create-page"
            >
              <span>{submitting ? 'Creating...' : 'Create page QR'}</span>
              <ArrowRight class="size-4" />
            </Button>
          {/if}
        </div>
      </div>

      <div class="w-full space-y-3">
        <QRCanvas
          value={qrValue}
          displayValue={saved ? dynamicShortLink(window.location.origin, saved.code) : 'Not saved yet'}
          showLinkActions={Boolean(saved)}
          style={savedStyle(saved?.style) ?? qrStyle}
          label={title || 'links'}
          stage
          size={260}
        />

        {#if saved}
          <div class="flex gap-2">
            <Button type="button" variant="outline" class="flex-1" onclick={copyLink}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button
              type="button"
              variant="outline"
              class="flex-1"
              onclick={() => window.open(shortLink(), '_blank', 'noopener')}
            >
              Open page
            </Button>
          </div>
          <Button
            type="button"
            class="w-full bg-punch text-ink hover:bg-punch/80"
            data-testid="scan-page"
            onclick={scanShownPage}
          >
            <ScanLine class="size-4" />
            Scan page
          </Button>
          {#if scanError}
            <p data-testid="scan-page-error" class="text-center text-sm text-destructive">{scanError}</p>
          {/if}
        {/if}
      </div>
    </form>
  {/if}
</section>
