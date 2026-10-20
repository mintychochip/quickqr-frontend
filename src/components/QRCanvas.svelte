<script lang="ts">
  import Download from '@lucide/svelte/icons/download';
  import Copy from '@lucide/svelte/icons/copy';
  import Check from '@lucide/svelte/icons/check';
  import ExternalLink from '@lucide/svelte/icons/external-link';
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
    /** Black plate with the lime mark, used on the studio preview. */
    stage?: boolean;
    /** Bitmap size in pixels. Larger codes are easier to scan. */
    size?: number;
    /** Tighter preview for the dashboard dropdown. */
    compact?: boolean;
    /** Symbol only, for a table cell. */
    inline?: boolean;
    /** Text under the symbol. Defaults to the encoded value. */
    displayValue?: string;
    /** Copy and test-link only after the address is real. */
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
    stage = false,
    size = 240,
    compact = false,
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

  function copyLink() {
    navigator.clipboard.writeText(linkText);
    copiedLink = true;
    setTimeout(() => {
      copiedLink = false;
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
<div
  class={cn(
    'mx-auto flex w-full flex-col items-center',
    compact ? 'max-w-[240px]' : 'max-w-[320px]',
    stage && 'rounded-[1.6rem] bg-ink px-5 py-5 text-primary-foreground',
  )}
>
  {#if stage}
    <div class="mb-4 flex w-full items-center justify-between">
      <span class="text-[11px] font-medium tracking-[-0.02em] text-white/70">Preview</span>
      <span class="size-2.5 rounded-full bg-punch" aria-hidden="true"></span>
    </div>
  {/if}
  <div
    class={cn('mx-auto flex w-full items-center justify-center', frameClass)}
    style:background-color={resolvedStyle.bgColor}
  >
    <canvas
      bind:this={canvasEl}
      data-testid="qr-canvas"
      class={cn(
        'mx-auto block aspect-square h-auto w-full rounded-lg',
        compact ? 'max-w-[168px]' : 'max-w-[240px]',
      )}
    ></canvas>
  </div>

  <div
    data-testid="qr-encoded-value"
    class={cn(
      'w-full truncate rounded-lg border px-3 py-1 text-center font-mono text-[11px]',
      compact ? 'mt-2' : 'mt-3',
      stage
        ? 'border-white/10 bg-white/10 text-white/80'
        : 'border-border bg-muted text-muted-foreground',
    )}
  >
    {shownValue}
  </div>

  <div class={cn('flex w-full items-center justify-center gap-2', compact ? 'mt-2' : 'mt-4')}>
    <Button
      type="button"
      size="sm"
      class={cn('flex-1', stage && 'bg-punch text-ink hover:bg-punch/80')}
      onclick={downloadPNG}
    >
      <Download class="size-3.5" />
      PNG
    </Button>
    <Button type="button" size="sm" variant="outline" class="flex-1 bg-white text-ink hover:bg-white/90" onclick={downloadSVG}>SVG</Button>
    {#if showLinkActions}
      <Button type="button" size="icon-sm" variant="outline" class="bg-white text-ink hover:bg-white/90" onclick={copyLink} title="Copy link URL">
        {#if copiedLink}
          <Check class="size-3.5 text-green-600" />
        {:else}
          <Copy class="size-3.5" />
        {/if}
      </Button>
    {/if}
  </div>

  {#if showLinkActions}
    <a
      href={linkText}
      target="_blank"
      rel="noopener noreferrer"
      class={cn(
        'inline-flex items-center gap-1 text-[11px] transition-colors',
        compact ? 'mt-1.5' : 'mt-3',
        stage ? 'text-white/60 hover:text-white' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span>Test link</span>
      <ExternalLink class="size-3" />
    </a>
  {/if}
</div>
{/if}
