<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Check from '@lucide/svelte/icons/check';
  import Copy from '@lucide/svelte/icons/copy';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Globe from '@lucide/svelte/icons/globe';
  import QRCanvas from './QRCanvas.svelte';
  import Alert from '@/lib/components/ui/alert.svelte';
  import AlertDescription from '@/lib/components/ui/alert-description.svelte';
  import Button from '@/lib/components/ui/button.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import Label from '@/lib/components/ui/label.svelte';
  import { createLink } from '../lib/api';
  import { dynamicQrValue, dynamicShortLink } from '../lib/dynamicQr';
  import { presetStyleById, withQrStyleDefaults } from '@/lib/qrStylePresets';
  import type { Link } from '../types';

  type Props = {
    onClose: () => void;
    onCreated?: (link: Link) => void;
  };

  let { onClose, onCreated }: Props = $props();

  type AdStyle = 'interstitial_3s' | 'sponsor_banner' | 'direct';

  let destinationUrl = $state('');
  let title = $state('');
  let customSlug = $state('');
  let adStyle = $state<AdStyle>('interstitial_3s');
  let submitting = $state(false);
  let created = $state<Link | null>(null);
  let errorMsg = $state('');
  let copied = $state(false);

  const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const qrStyle = withQrStyleDefaults(presetStyleById('quickqr_brand'));
  const previewValue = $derived(
    dynamicQrValue(window.location.origin, customSlug.trim() || 'preview-code'),
  );
  const createdQrValue = $derived(
    created ? dynamicQrValue(window.location.origin, created.code) : '',
  );
  const createdShortLink = $derived(
    created ? dynamicShortLink(window.location.origin, created.code) : '',
  );

  $effect(() => {
    const frame = requestAnimationFrame(() =>
      document.getElementById('create-code-destination')?.focus(),
    );
    return () => {
      cancelAnimationFrame(frame);
      trigger?.focus();
    };
  });

  function reset() {
    destinationUrl = '';
    title = '';
    customSlug = '';
    adStyle = 'interstitial_3s';
    created = null;
    errorMsg = '';
    copied = false;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!destinationUrl.trim() || submitting) return;
    submitting = true;
    errorMsg = '';
    try {
      const link = await createLink({
        destination_url: destinationUrl.trim(),
        title: title.trim() || 'Dynamic Link',
        code: customSlug.trim() || undefined,
        ad_style: adStyle,
      });
      created = link;
      onCreated?.(link);
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : 'Failed to create dynamic code';
    } finally {
      submitting = false;
    }
  }

  async function copyLink() {
    if (!createdShortLink) return;
    await navigator.clipboard.writeText(createdShortLink);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function createAnother() {
    reset();
    requestAnimationFrame(() => document.getElementById('create-code-destination')?.focus());
  }
</script>

<div data-testid="create-code-panel" class="flex h-full min-h-0 flex-col bg-card">
  <header class="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
    <button
      type="button"
      aria-label="Back to navigation"
      class="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
      onclick={onClose}
    >
      <ArrowLeft class="size-4" />
    </button>
    <div class="min-w-0 flex-1">
      <h2 class="truncate text-sm font-semibold tracking-[-0.01em] text-foreground">
        {created ? 'Code ready' : 'Create dynamic code'}
      </h2>
      <p class="truncate text-[11px] text-muted-foreground">
        {created ? createdShortLink : 'Print once, edit the destination later'}
      </p>
    </div>
  </header>

  {#if created}
    <div data-testid="create-code-success" class="flex min-h-0 flex-1 flex-col">
      <div class="flex-1 space-y-4 overflow-y-auto p-4">
        <QRCanvas
          value={createdQrValue}
          style={qrStyle}
          label={created.title}
          compact
          size={180}
          displayValue={createdShortLink}
          showLinkActions={false}
        />

        <div class="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onclick={copyLink}>
            {#if copied}
              <Check class="size-3.5 text-green-600" />
              Copied
            {:else}
              <Copy class="size-3.5" />
              Copy link
            {/if}
          </Button>
          <Button
            href={`/r/${created.code}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
          >
            <ExternalLink class="size-3.5" />
            Open link
          </Button>
        </div>

        <div class="rounded-xl border border-border bg-muted/50 px-3 py-3">
          <p class="text-[13px] font-medium text-foreground">Ready to print</p>
          <p class="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            This QR never changes. Edit its destination any time from the dashboard.
          </p>
          <p
            data-testid="created-short-link"
            class="mt-2 block truncate rounded-md bg-card px-2 py-1 font-mono text-[10px] text-muted-foreground"
          >
            {createdShortLink}
          </p>
        </div>
      </div>

      <div class="flex shrink-0 flex-col gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" class="h-10 bg-punch text-ink hover:bg-punch/80" onclick={onClose}>
          Done
        </Button>
        <Button type="button" variant="outline" class="h-10" onclick={createAnother}>
          Create another
        </Button>
      </div>
    </div>
  {:else}
    <form onsubmit={submit} class="flex min-h-0 flex-1 flex-col">
      <div class="flex-1 space-y-4 overflow-y-auto p-4">
        <div class="rounded-xl border border-border bg-muted/40 p-3 text-center">
          <div class="mx-auto w-fit rounded-lg bg-white p-2">
            <QRCanvas
              value={previewValue}
              style={qrStyle}
              label={title || 'Dynamic code'}
              size={128}
              inline
            />
          </div>
          <p class="mt-2 truncate font-mono text-[10px] text-muted-foreground">
            /r/{customSlug || 'your-slug'}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="create-code-destination">Destination URL</Label>
          <div class="relative">
            <Globe
              class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="create-code-destination"
              type="url"
              required
              bind:value={destinationUrl}
              placeholder="https://yoursite.com/menu"
              class="h-10 pl-9"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="create-code-title">Title</Label>
          <Input id="create-code-title" bind:value={title} placeholder="e.g. Table menu" />
        </div>

        <div class="space-y-2">
          <Label for="create-code-slug">Custom slug</Label>
          <div class="flex overflow-hidden rounded-lg border border-input">
            <span
              class="border-r border-input bg-muted px-2.5 py-2 text-xs text-muted-foreground select-none"
            >
              /r/
            </span>
            <Input
              id="create-code-slug"
              value={customSlug}
              oninput={(event) => {
                customSlug = event.currentTarget.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_-]/g, '');
              }}
              placeholder="my-link"
              class="border-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label>Ad format</Label>
          <div class="grid grid-cols-3 gap-1.5">
            {#each [
              ['interstitial_3s', '3s Sponsor'],
              ['sponsor_banner', 'Banner'],
              ['direct', 'Direct'],
            ] as [value, label] (value)}
              <Button
                type="button"
                variant={adStyle === value ? 'default' : 'outline'}
                size="sm"
                class="h-auto px-1 py-2 text-[11px]"
                onclick={() => (adStyle = value as AdStyle)}
              >
                {label}
              </Button>
            {/each}
          </div>
        </div>

        {#if errorMsg}
          <Alert variant="destructive">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        {/if}
      </div>

      <div class="flex shrink-0 gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" variant="outline" class="h-10 flex-1" onclick={onClose}>Cancel</Button>
        <Button
          type="submit"
          disabled={submitting}
          data-testid="create-code-submit"
          class="h-10 flex-1 bg-punch text-ink hover:bg-punch/80"
        >
          {#if submitting}
            Creating…
          {:else}
            Create
            <ArrowRight class="size-4" />
          {/if}
        </Button>
      </div>
    </form>
  {/if}
</div>
