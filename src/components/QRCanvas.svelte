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
    class="block shrink-0 rounded-sm [image-rendering:pixelated]"
    style:width="{size}px"
    style:height="{size}px"
  ></canvas>
{:else}
  <!-- The card is as wide as the code plus the plain frame's padding and border, so the rows line up with the tile. -->
  <div
    data-testid="qr-card"
    class="mx-auto flex w-full flex-col gap-2"
    style:max-width="{size + 34}px"
  >
    <div
      class={cn('flex w-full items-center justify-center', frameClass)}
      style:background-color={resolvedStyle.bgColor}
    >
      <canvas
        bind:this={canvasEl}
        data-testid="qr-canvas"
        class="mx-auto block aspect-square h-auto w-full rounded-lg"
      ></canvas>
    </div>

    <div
      class={cn(
        'flex h-9 min-w-0 items-center gap-0.5 rounded-lg border border-border bg-muted/50 pl-3',
        showLinkActions ? 'pr-1' : 'pr-3',
      )}
    >
      {#if showLinkActions && webLink}
        <a
          data-testid="qr-encoded-value"
          href={linkText}
          target="_blank"
          rel="noopener noreferrer"
          title="Open {shownValue}"
          class="min-w-0 flex-1 truncate rounded-sm font-mono text-[11px] text-muted-foreground underline-offset-2 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {shownValue}
        </a>
      {:else}
        <span
          data-testid="qr-encoded-value"
          title={shownValue}
          class="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground"
        >
          {shownValue}
        </span>
      {/if}
      {#if showLinkActions}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="text-muted-foreground"
          aria-label={webLink ? 'Copy link' : 'Copy'}
          title={webLink ? 'Copy link' : 'Copy'}
          onclick={copyLink}
        >
          {#if copiedLink}
            <Check class="size-3.5 text-green-600" />
          {:else}
            <Copy class="size-3.5" />
          {/if}
        </Button>
        {#if webLink}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            class="text-muted-foreground"
            aria-label="Copy share link"
            title="Copy share link (unfurls in Discord, embeds in iframes)"
            data-testid="copy-qr-share"
            onclick={copySharePage}
          >
            {#if copiedShare}
              <Check class="size-3.5 text-green-600" />
            {:else}
              <Code2 class="size-3.5" />
            {/if}
          </Button>
        {/if}
      {/if}
    </div>

    <div class="grid grid-cols-2 gap-2">
      <Button type="button" size="lg" aria-label="Download PNG" onclick={downloadPNG}>
        <Download class="size-3.5" />
        PNG
      </Button>
      <Button type="button" size="lg" variant="outline" aria-label="Download SVG" onclick={downloadSVG}>
        <Download class="size-3.5" />
        SVG
      </Button>
    </div>

    <span class="sr-only" role="status">{copyStatus}</span>
  </div>
{/if}
