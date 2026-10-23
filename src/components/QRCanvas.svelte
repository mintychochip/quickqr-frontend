<script lang="ts">
  import Download from '@lucide/svelte/icons/download';
  import Copy from '@lucide/svelte/icons/copy';
  import Check from '@lucide/svelte/icons/check';
  import Code2 from '@lucide/svelte/icons/code-2';
  import Button from '@/lib/components/ui/button.svelte';
  import { cn } from '@/lib/utils';
  import type { QrStyleResult } from '@/lib/qrStylePresets';
  import { withQrStyleDefaults } from '@/lib/qrStylePresets';
  import {
    qrFrameWrapperClass,
    renderQrToCanvas,
    renderQrToDataURL,
    renderQrToSvg,
  } from '@/lib/qrCode';

  export type { QrFrameStyle } from '@/lib/qrStylePresets';

  type Props = {
    value: string;
    /** Full visual style (colors, margin, module paint mode, dot shape, frame). */
    style?: QrStyleResult;
    /** Legacy props when `style` is omitted (e.g. dashboard preview). */
    fgColor?: string;
    bgColor?: string;
    errorCorrectionLevel?: QrStyleResult['errorLevel'];
    margin?: number;
    label?: string;
    frame?: QrStyleResult['frame'];
    /** Bitmap size in pixels, and the largest the code is drawn. Larger codes are easier to scan. */
    size?: number;
    /** Symbol only, for a table cell. */
    inline?: boolean;
    /** Text under the symbol. Defaults to the encoded value. */
    displayValue?: string;
    /** Copy, share, and open only after the address is real. */
    showLinkActions?: boolean;
    class?: string;
  };

  let {
    value,
    style,
    fgColor = '#111113',
    bgColor = '#ffffff',
    errorCorrectionLevel = 'M',
    margin = 2,
    label = 'Dynamic QR',
    frame = 'plain',
    size = 256,
    inline = false,
    displayValue,
    showLinkActions = true,
    class: className = '',
  }: Props = $props();


  const resolvedStyle = $derived(
    style ??
      withQrStyleDefaults({
        fgColor,
        bgColor,
        errorLevel: errorCorrectionLevel,
        frame,
        margin,
        summary: label,
      }),
  );

  const frameClass = $derived(qrFrameWrapperClass(resolvedStyle.frame));
  const shownValue = $derived(displayValue ?? value);

  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let copiedLink = $state(false);
  let copiedShare = $state(false);
  const copyStatus = $derived(copiedLink ? 'Link copied' : copiedShare ? 'Share link copied' : '');

  $effect(() => {
    if (!canvasEl || !value) return;
    void renderQrToCanvas(canvasEl, value, resolvedStyle, size, inline).catch((err) => {
      console.error('QR error:', err);
    });
  });

  async function downloadPNG() {
    if (!value) return;
    try {
      const dataUrl = await renderQrToDataURL(value, resolvedStyle);
      const link = document.createElement('a');
      link.download = `quickqr-${label.toLowerCase().replace(/\s+/g, '-')}-1024px.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('PNG export failed:', e);
    }
  }

  async function downloadSVG() {
    if (!value) return;
    try {
      const svgString = await renderQrToSvg(value, resolvedStyle);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `quickqr-${label.toLowerCase().replace(/\s+/g, '-')}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('SVG export failed:', e);
    }
  }

  const linkText = $derived(shownValue.startsWith('http') ? shownValue : value);
  /** Only web addresses can be opened or shared as a page; a phone number or plain text is just copied. */
  const webLink = $derived(/^https?:\/\//i.test(linkText));
  const sharePageUrl = $derived.by(() => {
    if (!linkText) return '';
    const url = new URL('/qr', window.location.origin);
    url.searchParams.set('url', linkText);
    return url.toString();
  });

  function copyLink() {
    navigator.clipboard.writeText(linkText);
    copiedLink = true;
    setTimeout(() => {
      copiedLink = false;
    }, 2000);
  }

  function copySharePage() {
    if (!sharePageUrl) return;
    navigator.clipboard.writeText(sharePageUrl);
    copiedShare = true;
    setTimeout(() => {
      copiedShare = false;
    }, 2000);
  }
</script>

{#if inline}
  <canvas
    bind:this={canvasEl}
    data-testid="qr-canvas"
    class={cn('qr-canvas-inline', className)}
    style:width="{size}px"
    style:height="{size}px"
  ></canvas>
{:else}
  <!-- The card is as wide as the code plus the plain frame's padding and border, so the rows line up with the tile. -->
  <div
    data-testid="qr-card"
    class={cn('qr-canvas', className)}
    style:max-width="{size + 34}px"
  >
    <div
      class={cn('qr-canvas-frame', frameClass)}
      style:background-color={resolvedStyle.bgColor}
    >
      <canvas
        bind:this={canvasEl}
        data-testid="qr-canvas"
        class="qr-canvas-symbol"
      ></canvas>
    </div>

    <div class={cn('qr-canvas-actions', showLinkActions ? 'qr-canvas-actions--with' : 'qr-canvas-actions--plain')}>
      {#if showLinkActions && webLink}
        <a
          data-testid="qr-encoded-value"
          href={linkText}
          target="_blank"
          rel="noopener noreferrer"
          title="Open {shownValue}"
          class="qr-canvas-value-link"
        >
          {shownValue}
        </a>
      {:else}
        <span
          data-testid="qr-encoded-value"
          title={shownValue}
          class="qr-canvas-value"
        >
          {shownValue}
        </span>
      {/if}
      {#if showLinkActions}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="qr-canvas-action-btn"
          aria-label={webLink ? 'Copy link' : 'Copy'}
          title={webLink ? 'Copy link' : 'Copy'}
          onclick={copyLink}
        >
          {#if copiedLink}
            <Check class="qr-canvas-check-icon" />
          {:else}
            <Copy class="qr-canvas-action-icon" />
          {/if}
        </Button>
        {#if webLink}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            class="qr-canvas-action-btn"
            aria-label="Copy share link"
            title="Copy share link (unfurls in Discord, embeds in iframes)"
            data-testid="copy-qr-share"
            onclick={copySharePage}
          >
            {#if copiedShare}
              <Check class="qr-canvas-check-icon" />
            {:else}
              <Code2 class="qr-canvas-action-icon" />
            {/if}
          </Button>
        {/if}
      {/if}
    </div>

    <div class="qr-canvas-buttons">
      <Button type="button" size="lg" aria-label="Download PNG" onclick={downloadPNG}>
        <Download class="qr-canvas-download-icon" />
        PNG
      </Button>
      <Button type="button" size="lg" variant="outline" aria-label="Download SVG" onclick={downloadSVG}>
        <Download class="qr-canvas-download-icon" />
        SVG
      </Button>
    </div>

    <span class="qr-canvas-sr-only" role="status">{copyStatus}</span>
  </div>
{/if}

<style>
  @layer components {
    .qr-canvas-inline {
      display: block;
      flex-shrink: 0;
      border-radius: calc(var(--radius) * 0.6);
      image-rendering: pixelated;
    }

    .qr-canvas {
      margin-left: auto;
      margin-right: auto;
      display: flex;
      width: 100%;
      flex-direction: column;
      gap: 0.5rem;
    }

    .qr-canvas-frame {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: center;
    }

    .qr-canvas-symbol {
      display: block;
      margin-left: auto;
      margin-right: auto;
      aspect-ratio: 1 / 1;
      height: auto;
      width: 100%;
      border-radius: var(--radius);
    }

    .qr-canvas-actions {
      display: flex;
      height: 2.25rem;
      min-width: 0;
      align-items: center;
      gap: 0.125rem;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background-color: color-mix(in oklab, var(--muted) 50%, transparent);
      padding-left: 0.75rem;
    }

    .qr-canvas-actions--with {
      padding-right: 0.25rem;
    }

    .qr-canvas-actions--plain {
      padding-right: 0.75rem;
    }

    .qr-canvas-value-link,
    .qr-canvas-value {
      min-width: 0;
      flex: 1 1 0%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 11px;
      color: var(--muted-foreground);
    }

    .qr-canvas-value-link {
      border-radius: calc(var(--radius) * 0.6);
      text-underline-offset: 2px;
      outline-style: none;
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }


    .qr-canvas-buttons {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
    }
  }

  :global(.qr-canvas-action-btn) {
    color: var(--muted-foreground);
  }


  .qr-canvas-value-link:hover {
    color: var(--foreground);
    text-decoration-line: underline;
  }

  .qr-canvas-value-link:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  :global(.qr-canvas-check-icon) {
    width: 0.875rem;
    height: 0.875rem;
    color: #16a34a;
  }

  :global(.qr-canvas-action-icon),
  :global(.qr-canvas-download-icon) {
    width: 0.875rem;
    height: 0.875rem;
  }

  .qr-canvas-sr-only {
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

  .qr-frame-plain {
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 1.4);
    padding: 1rem;
  }

  .qr-frame-soft {
    border: 1px solid color-mix(in oklab, var(--border) 80%, transparent);
    border-radius: calc(var(--radius) * 1.8);
    padding: 1.25rem;
    box-shadow:
      0 1px 3px 0 rgb(0 0 0 / 0.1),
      0 1px 2px -1px rgb(0 0 0 / 0.1);
  }

  .qr-frame-ring {
    border: 2px solid color-mix(in oklab, var(--primary) 25%, transparent);
    border-radius: calc(var(--radius) * 1.8);
    padding: 1.25rem;
    box-shadow: 0 8px 30px -12px rgb(37 99 235 / 0.35);
  }

</style>

