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
  import { cn } from '@/lib/utils';
  import { DEFAULT_QR_PRESET_ID, presetStyleById, withQrStyleDefaults } from '@/lib/qrStylePresets';
  import { renderQrToDataURL, renderQrToSvg } from '@/lib/qrCode';

  const MAX_URL_LENGTH = 2048;
  const params = new URLSearchParams(window.location.search);
  const initialRaw = params.get('url')?.trim() ?? '';
  const initialResult = initialRaw ? normalizeTargetInput(initialRaw) : null;
  const isEmbed = params.get('embed') === '1' || window.self !== window.top;
  const style = withQrStyleDefaults(presetStyleById(DEFAULT_QR_PRESET_ID));

  let target = $state(initialResult && 'value' in initialResult ? initialResult.value : '');
  let inputUrl = $state(initialRaw);
  let errorMessage = $state(initialResult && 'error' in initialResult ? initialResult.error : '');
  let renderError = $state('');
  let rendering = $state(false);
  let svg = $state('');
  let copiedKey = $state<'share' | 'iframe' | 'image' | 'svg' | null>(null);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  let qrCardEl = $state<HTMLElement | null>(null);

  let { class: className = '' } = $props<{ class?: string }>();


  const shareUrl = $derived(target ? pageURL(target) : '');
  const embedUrl = $derived(target ? pageURL(target, true) : '');
  const imageUrl = $derived(
    target ? `${window.location.origin}/qr.png?url=${encodeURIComponent(target)}` : '',
  );
  const svgUrl = $derived(
    target ? `${window.location.origin}/qr.svg?url=${encodeURIComponent(target)}` : '',
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

  async function copyText(value: string, key: 'share' | 'iframe' | 'image' | 'svg') {
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
  <main class={cn('qr-embed-main', className)}>
    {#if svg}
      <div
        data-testid="embed-qr"
        role="img"
        aria-label={`QR code for ${target}`}
        class="qr-svg qr-embed-qr-full"
      >
        {@html svg}
      </div>
    {:else}
      <div class="qr-embed-empty">
        <Logo markClass="qr-embed-logo-mark" wordmark={false} />
        <p class="qr-embed-empty-text">
          {renderError || errorMessage || 'Add a link to show its QR code.'}
        </p>
      </div>
    {/if}
  </main>
{:else}

  <div class={cn('qr-embed-shell', className)}>
    <div class="qr-embed-container">
      <header class="qr-embed-header">
        <a href="/" class="qr-embed-home" aria-label="quickqr.app home">
          <Logo />
        </a>
        <span class="qr-embed-badge">
          Link QR
        </span>
      </header>

      <main class="qr-embed-layout">
        <section class="qr-embed-intro">
          <h1 class="qr-embed-title">
            {target ? `QR code for ${displayHost(target)}` : 'A QR code for any link.'}
          </h1>
          <p class="qr-embed-lede">
            Paste a link and get a scannable code. Download it, drop it into an iframe, or share
            the page so it unfurls in chat.
          </p>

          <form data-testid="embed-form" class="qr-embed-form" onsubmit={handleSubmit}>
            <Label for="embed-url" class="qr-embed-sr">Link</Label>
            <Input
              id="embed-url"
              type="text"
              inputmode="url"
              autocomplete="url"
              bind:value={inputUrl}
              placeholder="https://your-link.com"
              class="qr-embed-input"
            />
            <Button type="submit" class="qr-embed-submit">
              Show QR
              <ArrowRight class="qr-embed-arrow" />
            </Button>
          </form>

          {#if errorMessage}
            <p data-testid="embed-error" role="alert" class="qr-embed-error">
              {errorMessage}
            </p>
          {/if}

          {#if target}
            <div class="qr-embed-actions">
              <Button
                type="button"
                class="qr-embed-share-btn"
                onclick={() => copyText(shareUrl, 'share')}
                data-testid="embed-copy-share"
              >
                {#if copiedKey === 'share'}
                  <Check class="qr-embed-check" />
                  Copied share link
                {:else}
                  <Copy class="qr-embed-copy" />
                  Copy share link
                {/if}
              </Button>
              <div class="qr-embed-secondary">
                <Button
                  type="button"
                  variant="outline"
                  class="qr-embed-secondary-btn"
                  onclick={() => copyText(iframeSnippet, 'iframe')}
                  data-testid="embed-copy-iframe"
                >
                  {#if copiedKey === 'iframe'}
                    <Check class="qr-embed-check" />
                    Copied
                  {:else}
                    <Code2 class="qr-embed-code" />
                    Iframe
                  {/if}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  class="qr-embed-secondary-btn"
                  onclick={() => copyText(imageSnippet, 'image')}
                  data-testid="embed-copy-image"
                >
                  {#if copiedKey === 'image'}
                    <Check class="qr-embed-check" />
                    Copied
                  {:else}
                    <ImageIcon class="qr-embed-image" />
                    Image
                  {/if}
                </Button>
              </div>
            </div>

            <div class="qr-embed-downloads">
              <button
                type="button"
                class="qr-embed-dl-btn"
                onclick={downloadSVG}
              >
                <Download class="qr-embed-dl-icon" />
                Download SVG
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                class="qr-embed-dl-btn"
                onclick={downloadPNG}
              >
                <Download class="qr-embed-dl-icon" />
                Download PNG
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                class="qr-embed-dl-btn"
                onclick={() => copyText(svgUrl, 'svg')}
              >
                {#if copiedKey === 'svg'}
                  <Check class="qr-embed-dl-icon" />
                  Copied SVG URL
                {:else}
                  <Code2 class="qr-embed-dl-icon" />
                  Copy SVG URL
                {/if}
              </button>
            </div>
            <p class="qr-embed-note">
              Iframes work on any host. The image embed uses the Go API's <code class="font-mono">/qr.png</code>
              endpoint.
            </p>
          {/if}
        </section>

        <section class="qr-embed-preview">
          <div
            bind:this={qrCardEl}
            class="qr-embed-card"
          >
            {#if svg}
              <div
                data-testid="embed-qr"
                role="img"
                aria-label={`QR code for ${target}`}
                class="qr-svg qr-embed-qr-card"
              >
                {@html svg}
              </div>
              <p
                data-testid="embed-target"
                class="qr-embed-target"
                title={target}
              >
                {target}
              </p>
            {:else if rendering}
              <div class="qr-embed-rendering">
                <span class="qr-embed-rendering-text">Rendering QR…</span>
              </div>
            {:else}
              <div class="qr-embed-placeholder">
                <p class="qr-embed-placeholder-text">
                  {renderError || 'Paste a link to see its QR code.'}
                </p>
              </div>
            {/if}
          </div>
        </section>
      </main>

      <footer class="qr-embed-footer">
        <p>quickqr.app · Free QR codes forever.</p>
        <a href="/" class="qr-embed-footer-link">Create a dynamic code</a>
      </footer>
    </div>
  </div>
{/if}

<style>
  @layer components {
    .qr-embed-main {
      min-height: 100dvh;
      width: 100%;
      background-color: #f9f9f8;
    }

    .qr-embed-empty {
      display: grid;
      min-height: 100dvh;
      place-items: center;
      padding-inline: 1.5rem;
      text-align: center;
    }

    .qr-embed-empty-text {
      margin-top: 1rem;
      font-size: 0.875rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .qr-embed-shell {
      min-height: 100dvh;
      background-color: var(--background);
    }

    .qr-embed-container {
      margin-left: auto;
      margin-right: auto;
      display: flex;
      min-height: 100dvh;
      width: 100%;
      max-width: 1080px;
      flex-direction: column;
      padding-inline: 1.25rem;
      padding-block: 1.25rem;
    }

    .qr-embed-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .qr-embed-home {
      display: inline-flex;
      border-radius: calc(var(--radius) * 1.4);
    }

    .qr-embed-badge {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.08em;
      color: var(--muted-foreground);
      text-transform: uppercase;
    }

    .qr-embed-layout {
      display: grid;
      flex: 1;
      align-items: center;
      gap: 2.5rem;
      padding-block: 2.5rem;
    }

    .qr-embed-intro {
      min-width: 0;
      max-width: 540px;
    }

    .qr-embed-title {
      font-size: clamp(2.5rem, 6vw, 4.35rem);
      line-height: 0.96;
      font-weight: 600;
      letter-spacing: -0.04em;
    }

    .qr-embed-lede {
      margin-top: 1.25rem;
      max-width: 46ch;
      font-size: 17px;
      line-height: 1.65;
      color: var(--muted-foreground);
    }

    .qr-embed-form {
      margin-top: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    :global(.qr-embed-sr) {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    :global(.qr-embed-input) {
      height: 2.75rem;
      min-width: 0;
      flex: 1;
    }

    :global(.qr-embed-submit) {
      height: 2.75rem;
      flex-shrink: 0;
      padding-inline: 1rem;
    }

    .qr-embed-error {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: var(--destructive);
    }

    .qr-embed-actions {
      margin-top: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    :global(.qr-embed-share-btn) {
      height: 2.5rem;
      width: 100%;
    }

    .qr-embed-secondary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
    }

    :global(.qr-embed-secondary-btn) {
      height: 2.5rem;
    }

    .qr-embed-downloads {
      margin-top: 1rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .qr-embed-dl-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .qr-embed-note {
      margin-top: 0.75rem;
      max-width: 42ch;
      font-size: 11px;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .qr-embed-preview {
      min-width: 0;
    }

    .qr-embed-card {
      margin-left: auto;
      margin-right: auto;
      width: 100%;
      max-width: 400px;
      border-radius: calc(var(--radius) * 1.8);
      background-color: var(--card);
      padding: 0.5rem;
      box-shadow: 0 24px 60px -36px rgb(17 17 19 / 0.55), 0 0 0 1px rgb(0 0 0 / 0.05);
    }

    .qr-embed-target {
      margin-top: 0.75rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border-radius: var(--radius);
      background-color: var(--muted);
      padding-inline: 0.75rem;
      padding-block: 0.5rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 11px;
      color: var(--muted-foreground);
    }

    .qr-embed-rendering {
      display: grid;
      aspect-ratio: 1 / 1;
      place-items: center;
      border-radius: calc(var(--radius) * 1.4);
      background-color: color-mix(in oklab, var(--muted) 40%, transparent);
    }

    .qr-embed-rendering-text {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      animation: qr-embed-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .qr-embed-placeholder {
      display: grid;
      aspect-ratio: 1 / 1;
      place-items: center;
      border-radius: calc(var(--radius) * 1.4);
      border: 1px dashed var(--border);
      background-color: color-mix(in oklab, var(--muted) 30%, transparent);
      padding: 2rem;
      text-align: center;
    }

    .qr-embed-placeholder-text {
      max-width: 20ch;
      font-size: 0.875rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .qr-embed-footer {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      border-top: 1px solid var(--border);
      padding-top: 1rem;
      font-size: 11px;
      color: var(--muted-foreground);
    }

    .qr-embed-footer-link {
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  @media (min-width: 40rem) {
    .qr-embed-form {
      flex-direction: row;
    }

    .qr-embed-footer {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .qr-embed-container {
      padding-inline: 2rem;
      padding-block: 2rem;
    }
  }

  @media (min-width: 64rem) {
    .qr-embed-layout {
      grid-template-columns: minmax(0, 1fr) 420px;
      gap: 3.5rem;
      padding-block: 3rem;
    }
  }

  .qr-embed-dl-btn:hover {
    color: var(--foreground);
  }

  .qr-embed-footer-link:hover {
    color: var(--foreground);
  }

  :global(.dark) .qr-embed-card {
    box-shadow: 0 24px 60px -36px rgb(17 17 19 / 0.55), 0 0 0 1px rgb(255 255 255 / 0.1);
  }

  :global(.qr-embed-logo-mark) {
    width: 2.5rem;
    height: 2.5rem;
  }

  :global(.qr-embed-arrow),
  :global(.qr-embed-check),
  :global(.qr-embed-copy),
  :global(.qr-embed-code),
  :global(.qr-embed-image),
  :global(.qr-embed-dl-icon) {
    width: 1rem;
    height: 1rem;
  }

  :global(.qr-embed-check) {
    color: #16a34a;
  }

  /* keep existing svg rule */
  .qr-svg :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }

  .qr-embed-qr-full {
    width: 100%;
    background-color: #f9f9f8;
  }

  .qr-embed-qr-card {
    overflow: hidden;
    border-radius: calc(var(--radius) * 1.4);
    background-color: #f9f9f8;
    padding: 0.25rem;
  }

  :global(.qr-embed-share-btn) {
    background-color: var(--punch);
    color: var(--ink);
  }

  :global(.qr-embed-share-btn:hover) {
    background-color: color-mix(in oklab, var(--punch) 80%, transparent);
  }
</style>

