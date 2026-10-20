<script lang="ts">
  import { onDestroy } from 'svelte';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Check from '@lucide/svelte/icons/check';
  import Code2 from '@lucide/svelte/icons/code-2';
  import Copy from '@lucide/svelte/icons/copy';
  import Download from '@lucide/svelte/icons/download';
  import ImageIcon from '@lucide/svelte/icons/image';
  import Logo from './Logo.svelte';
  import Button from '@/lib/components/ui/button.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import Label from '@/lib/components/ui/label.svelte';
  import { presetStyleById, withQrStyleDefaults } from '@/lib/qrStylePresets';
  import { renderQrToDataURL, renderQrToSvg } from '@/lib/qrCode';

  const MAX_URL_LENGTH = 2048;
  const params = new URLSearchParams(window.location.search);
  const initialRaw = params.get('url')?.trim() ?? '';
  const initialResult = initialRaw ? normalizeTargetInput(initialRaw) : null;
  const isEmbed = params.get('embed') === '1' || window.self !== window.top;
  const style = withQrStyleDefaults(presetStyleById('quickqr_brand'));

  let target = $state(initialResult && 'value' in initialResult ? initialResult.value : '');
  let inputUrl = $state(initialRaw);
  let errorMessage = $state(initialResult && 'error' in initialResult ? initialResult.error : '');
  let renderError = $state('');
  let rendering = $state(false);
  let svg = $state('');
  let copiedKey = $state<'share' | 'iframe' | 'image' | null>(null);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  let qrCardEl = $state<HTMLElement | null>(null);

  const shareUrl = $derived(target ? pageURL(target) : '');
  const embedUrl = $derived(target ? pageURL(target, true) : '');
  const imageUrl = $derived(
    target ? `${window.location.origin}/qr.png?url=${encodeURIComponent(target)}` : '',
  );
  const iframeSnippet = $derived(
    embedUrl
      ? `<iframe src="${escapeHtml(embedUrl)}" width="360" height="360" style="border:0" loading="lazy" title="QR code for ${escapeHtml(target)}"></iframe>`
      : '',
  );
  const imageSnippet = $derived(
    imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="QR code for ${escapeHtml(target)}" width="320" height="320" />`
      : '',
  );

  $effect(() => {
    const value = target;
    if (!value) {
      svg = '';
      renderError = '';
      rendering = false;
      return;
    }
    let cancelled = false;
    rendering = true;
    renderQrToSvg(value, style)
      .then((markup) => {
        if (cancelled) return;
        svg = markup;
        renderError = '';
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        svg = '';
        renderError = err instanceof Error ? err.message : 'Could not render this QR code.';
      })
      .finally(() => {
        if (!cancelled) rendering = false;
      });
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    document.title = target
      ? `QR code for ${displayHost(target)} | quickqr.app`
      : 'Create a QR code | quickqr.app';
  });

  onDestroy(() => {
    if (copyTimer) clearTimeout(copyTimer);
  });

  function normalizeTargetInput(raw: string): { value: string } | { error: string } {
    const trimmed = raw.trim();
    if (!trimmed) return { error: 'Paste a link to create a QR code.' };
    if (trimmed.length > MAX_URL_LENGTH) {
      return { error: 'That link is too long to fit in a QR code.' };
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      try {
        parsed = new URL(`https://${trimmed}`);
      } catch {
        return { error: 'That doesn’t look like a valid link.' };
      }
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { error: 'Only http:// and https:// links work.' };
    }
    if (!parsed.hostname) {
      return { error: 'That link needs a hostname.' };
    }
    const value = parsed.toString();
    if (value.length > MAX_URL_LENGTH) {
      return { error: 'That link is too long to fit in a QR code.' };
    }
    return { value };
  }

  function displayHost(value: string): string {
    try {
      return new URL(value).hostname.replace(/^www\./, '') || 'your link';
    } catch {
      return 'your link';
    }
  }

  function pageURL(value: string, embed = false): string {
    const url = new URL('/qr', window.location.origin);
    url.searchParams.set('url', value);
    if (embed) url.searchParams.set('embed', '1');
    return url.toString();
  }

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const result = normalizeTargetInput(inputUrl);
    if ('error' in result) {
      errorMessage = result.error;
      target = '';
      return;
    }
    target = result.value;
    inputUrl = result.value;
    errorMessage = '';
    const next = new URL(window.location.href);
    next.searchParams.set('url', result.value);
    window.history.replaceState({}, '', next);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => {
        qrCardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }

  async function copyText(value: string, key: 'share' | 'iframe' | 'image') {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      copiedKey = key;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copiedKey = null;
      }, 1800);
    } catch {
      copiedKey = null;
    }
  }

  function downloadSVG() {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'quickqr.svg';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPNG() {
    if (!target) return;
    try {
      const data = await renderQrToDataURL(target, style);
      const link = document.createElement('a');
      link.download = 'quickqr.png';
      link.href = data;
      link.click();
    } catch (err: unknown) {
      renderError = err instanceof Error ? err.message : 'Could not export this QR code.';
    }
  }
</script>

{#if isEmbed}
  <main class="min-h-dvh w-full bg-[#f9f9f8]">
    {#if svg}
      <div
        data-testid="embed-qr"
        role="img"
        aria-label={`QR code for ${target}`}
        class="qr-svg w-full bg-[#f9f9f8]"
      >
        {@html svg}
      </div>
    {:else}
      <div class="grid min-h-dvh place-items-center px-6 text-center">
        <Logo markClass="size-10" wordmark={false} />
        <p class="mt-4 text-sm leading-relaxed text-muted-foreground">
          {renderError || errorMessage || 'Add a link to show its QR code.'}
        </p>
      </div>
    {/if}
  </main>
{:else}
  <div class="min-h-dvh bg-background">
    <div class="mx-auto flex min-h-dvh w-full max-w-[1080px] flex-col px-5 py-5 sm:px-8 sm:py-8">
      <header class="flex items-center justify-between gap-4">
        <a href="/" class="inline-flex rounded-lg" aria-label="quickqr.app home">
          <Logo />
        </a>
        <span class="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          Link QR
        </span>
      </header>

      <main class="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14 lg:py-12">
        <section class="min-w-0 max-w-[540px]">
          <h1 class="text-[clamp(2.5rem,6vw,4.35rem)] leading-[0.96] font-semibold tracking-[-0.04em]">
            {target ? `QR code for ${displayHost(target)}` : 'A QR code for any link.'}
          </h1>
          <p class="mt-5 max-w-[46ch] text-[17px] leading-[1.65] text-muted-foreground">
            Paste a link and get a scannable code. Download it, drop it into an iframe, or share
            the page so it unfurls in chat.
          </p>

          <form data-testid="embed-form" class="mt-7 flex flex-col gap-2 sm:flex-row" onsubmit={handleSubmit}>
            <Label for="embed-url" class="sr-only">Link</Label>
            <Input
              id="embed-url"
              type="text"
              inputmode="url"
              autocomplete="url"
              bind:value={inputUrl}
              placeholder="https://your-link.com"
              class="h-11 min-w-0 flex-1 text-base"
            />
            <Button type="submit" class="h-11 shrink-0 px-4">
              Show QR
              <ArrowRight class="size-4" />
            </Button>
          </form>

          {#if errorMessage}
            <p data-testid="embed-error" role="alert" class="mt-2 text-sm text-destructive">
              {errorMessage}
            </p>
          {/if}

          {#if target}
            <div class="mt-7 space-y-2">
              <Button
                type="button"
                class="h-10 w-full bg-punch text-ink hover:bg-punch/80"
                onclick={() => copyText(shareUrl, 'share')}
                data-testid="embed-copy-share"
              >
                {#if copiedKey === 'share'}
                  <Check class="size-4" />
                  Copied share link
                {:else}
                  <Copy class="size-4" />
                  Copy share link
                {/if}
              </Button>
              <div class="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  class="h-10"
                  onclick={() => copyText(iframeSnippet, 'iframe')}
                  data-testid="embed-copy-iframe"
                >
                  {#if copiedKey === 'iframe'}
                    <Check class="size-4" />
                    Copied
                  {:else}
                    <Code2 class="size-4" />
                    Iframe
                  {/if}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  class="h-10"
                  onclick={() => copyText(imageSnippet, 'image')}
                  data-testid="embed-copy-image"
                >
                  {#if copiedKey === 'image'}
                    <Check class="size-4" />
                    Copied
                  {:else}
                    <ImageIcon class="size-4" />
                    Image
                  {/if}
                </Button>
              </div>
            </div>

            <div class="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                onclick={downloadSVG}
              >
                <Download class="size-3.5" />
                Download SVG
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                onclick={downloadPNG}
              >
                <Download class="size-3.5" />
                Download PNG
              </button>
            </div>
            <p class="mt-3 max-w-[42ch] text-[11px] leading-relaxed text-muted-foreground">
              Iframes work on any host. The image embed uses the Go API's <code class="font-mono">/qr.png</code>
              endpoint.
            </p>
          {/if}
        </section>

        <section class="min-w-0">
          <div
            bind:this={qrCardEl}
            class="mx-auto w-full max-w-[400px] rounded-2xl bg-card p-2 shadow-[0_24px_60px_-36px_rgba(17,17,19,0.55)] ring-1 ring-black/5 dark:ring-white/10"
          >
            {#if svg}
              <div
                data-testid="embed-qr"
                role="img"
                aria-label={`QR code for ${target}`}
                class="qr-svg overflow-hidden rounded-xl bg-[#f9f9f8] p-1"
              >
                {@html svg}
              </div>
              <p
                data-testid="embed-target"
                class="mt-3 truncate rounded-lg bg-muted px-3 py-2 font-mono text-[11px] text-muted-foreground"
                title={target}
              >
                {target}
              </p>
            {:else if rendering}
              <div class="grid aspect-square place-items-center rounded-xl bg-muted/40">
                <span class="animate-pulse text-xs text-muted-foreground">Rendering QR…</span>
              </div>
            {:else}
              <div
                class="grid aspect-square place-items-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center"
              >
                <p class="max-w-[20ch] text-sm leading-relaxed text-muted-foreground">
                  {renderError || 'Paste a link to see its QR code.'}
                </p>
              </div>
            {/if}
          </div>
        </section>
      </main>

      <footer class="flex flex-col gap-1 border-t border-border pt-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>quickqr.app · Free QR codes forever.</p>
        <a href="/" class="transition-colors hover:text-foreground">Create a dynamic code</a>
      </footer>
    </div>
  </div>
{/if}

<style>
  .qr-svg :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
