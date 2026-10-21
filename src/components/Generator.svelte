<script lang="ts">
  import QRCanvas from './QRCanvas.svelte';
  import QRStyleAssistant from './QRStyleAssistant.svelte';
  import QRStylePresets from './QRStylePresets.svelte';
  import QRStyleEditor from './QRStyleEditor.svelte';
  import { compress } from '../lib/compression';
  import { dynamicQrValue, dynamicShortLink } from '../lib/dynamicQr';
  import { outputAlphabetQR } from '../lib/alphabets';
  import { resolve, type FieldValues, type TypeId } from '../lib/payload';
  import { createLink } from '../lib/api';
  import type { Link } from '../types';
  import type { QrStyleResult } from '@/lib/qrStyleAssistant';
  import { finalizeQrStyle } from '@/lib/qrStyleAssistant';
  import type { QrStylePresetId } from '@/lib/qrStylePresets';
  import { DEFAULT_QR_PRESET_ID, presetStyleById, withQrStyleDefaults } from '@/lib/qrStylePresets';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';
  import Check from '@lucide/svelte/icons/check';
  import Button from '@/lib/components/ui/button.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import Label from '@/lib/components/ui/label.svelte';
  import Card from '@/lib/components/ui/card.svelte';
  import TabsList from '@/lib/components/ui/tabs-list.svelte';
  import TabsTrigger from '@/lib/components/ui/tabs-trigger.svelte';
  import Alert from '@/lib/components/ui/alert.svelte';
  import AlertDescription from '@/lib/components/ui/alert-description.svelte';
  import { stashPendingDynamicLink, takePendingDynamicLink } from '@/lib/auth';
  import AuthModal from './AuthModal.svelte';
  import SourceField from './SourceField.svelte';

  type Props = {
    onLinkCreated?: (link: Link) => void;
    isAuthenticated: boolean;
  };

  let {
    onLinkCreated,
    isAuthenticated,
  }: Props = $props();

  let mode = $state<'dynamic' | 'static'>('dynamic');
  let showOptions = $state(false);
  /** The sign-in modal Create opens while nobody is signed in. */
  let signInOpen = $state(false);

  let source = $state('https://example.com/events/spring-menu?table=4');
  /** The type chosen from the menu. While it is null, the bar works the type out as you type. */
  let forcedType = $state<TypeId | null>(null);
  let fieldValues = $state<FieldValues>({});
  let title = $state('');
  let customSlug = $state('');
  let adStyle = $state<'interstitial_3s' | 'sponsor_banner' | 'direct'>('interstitial_3s');
  let isSubmitting = $state(false);
  let createdDynamicLink = $state<Link | null>(null);
  let errorMsg = $state('');

  const defaultStyle = withQrStyleDefaults(presetStyleById(DEFAULT_QR_PRESET_ID));
  let qrStyle = $state<QrStyleResult>(defaultStyle);
  let styleSummary = $state(defaultStyle.summary);
  let activePresetId = $state<QrStylePresetId | null>(DEFAULT_QR_PRESET_ID);
  let styleBarOpacity = $state(1);
  let styleBarShift = $state(0);
  let styleBarEl = $state<HTMLDivElement | null>(null);
  let tuneOpen = $state(false);

  $effect(() => {
    const fadeStart = 8;
    const fadeEnd = 170;
    function onScroll() {
      const y = window.scrollY;
      const t = Math.min(1, Math.max(0, (y - fadeStart) / (fadeEnd - fadeStart)));
      styleBarOpacity = 1 - t;
      const height = styleBarEl?.offsetHeight ?? 160;
      styleBarShift = t * height;
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

  function applyStyle(result: QrStyleResult, presetId?: QrStylePresetId | null) {
    const finalized = finalizeQrStyle(result);
    qrStyle = withQrStyleDefaults({
      ...result,
      ...finalized,
      accentColor: result.accentColor ?? finalized.fgColor,
    });
    styleSummary = finalized.summary;
    activePresetId = presetId ?? null;
  }

  function patchQrStyle(patch: Partial<QrStyleResult>) {
    qrStyle = withQrStyleDefaults({ ...qrStyle, ...patch });
    activePresetId = null;
    styleSummary = 'Custom style';
  }

  const resolved = $derived(
    resolve(source, forcedType ? { type: forcedType, values: fieldValues[forcedType] } : undefined),
  );
  const linkPayload = $derived(resolved.status === 'ready' && resolved.type.id === 'link' ? resolved.payload : null);
  /** Everything that is not a web link goes into the code as it is: no redirect, nothing to save. */
  const directPayload = $derived(resolved.status === 'ready' && resolved.type.id !== 'link' ? resolved.payload : null);

  const staticResult = $derived.by(() => {
    if (!linkPayload) return null;
    try {
      const compressed = compress(linkPayload, outputAlphabetQR);
      const scheme = window.location.protocol === 'https:' ? 'HTTPS' : 'HTTP';
      const url = `${scheme}://${window.location.host.toUpperCase()}/${compressed}`;
      return { url, savings: Math.round((1 - url.length / linkPayload.length) * 100) };
    } catch (e) {
      console.warn('Static compression error:', e);
      return { url: linkPayload, savings: 0 };
    }
  });

  $effect(() => {
    if (!isAuthenticated) return;
    const pending = takePendingDynamicLink();
    if (!pending) return;
    source = pending.destinationUrl;
    forcedType = null;
    title = pending.title;
    customSlug = pending.customSlug;
    adStyle = pending.adStyle as typeof adStyle;
    void submitDynamicLink();
  });

  function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return 'Failed to create dynamic code';
  }

  async function submitDynamicLink() {
    if (!linkPayload) return;

    isSubmitting = true;
    errorMsg = '';

    try {
      const link = await createLink({
        destination_url: linkPayload,
        title: title.trim() || 'Dynamic Link',
        code: customSlug.trim() || undefined,
        ad_style: adStyle,
      });
      createdDynamicLink = link;
      onLinkCreated?.(link);
    } catch (err: unknown) {
      errorMsg = getErrorMessage(err);
    } finally {
      isSubmitting = false;
    }
  }

  /** Runs as the browser leaves for a provider: the link waits in the session and is saved once sign-in returns. */
  function keepLinkThroughSignIn() {
    if (!linkPayload) return;
    stashPendingDynamicLink({
      // The address as it will be saved, not as typed, so that it is the same link again whatever type was chosen.
      destinationUrl: linkPayload,
      title: title.trim(),
      customSlug: customSlug.trim(),
      adStyle,
    });
  }

  async function handleCreateDynamic(e: SubmitEvent) {
    e.preventDefault();
    if (!linkPayload) return;

    if (!isAuthenticated) {
      signInOpen = true;
      return;
    }

    await submitDynamicLink();
  }

  /** Copy and download are offered only once a real address is behind the code, never for the placeholder. */
  const linkReady = $derived(
    mode === 'static' ? resolved.status === 'ready' : directPayload !== null || createdDynamicLink != null,
  );

  const liveCode = $derived(createdDynamicLink?.code || customSlug || 'preview-code');
  const currentShortLink = $derived(dynamicShortLink(window.location.origin, liveCode));
  const currentQRValue = $derived(
    directPayload ??
      (mode === 'static'
        ? (staticResult?.url ?? 'https://quickqr2.app')
        : dynamicQrValue(window.location.origin, liveCode)),
  );
</script>

<section id="generator" class="px-6 pb-16 md:px-10">
  <div class="mx-auto max-w-[1120px]">
    <div class="py-6 md:py-8">
      <p
        class="mb-5 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-[12px] font-medium tracking-[-0.01em] text-foreground shadow-[0_10px_30px_-18px_rgba(17,17,19,0.55)] ring-1 ring-black/5 dark:ring-white/10"
      >
        <span class="size-1.5 rounded-full bg-punch" aria-hidden="true"></span>
        Free QR codes forever
      </p>
      <h1 class="qq-hero-title max-w-[680px]">
        Dynamic QR codes
        <br class="hidden sm:block" />
        without the paywall.
      </h1>
      <p class="qq-lede mt-4 max-w-[420px] text-muted-foreground">
        Paste a link. Download the code. Change where it goes later.
      </p>
    </div>

    <Card class="overflow-hidden p-0">
      <div class="border-b border-border px-5 py-3 sm:px-6">
        <TabsList class="w-full sm:w-auto">
          <TabsTrigger
            value="dynamic"
            activeValue={mode}
            class="flex-1 sm:flex-none"
            onclick={() => (mode = 'dynamic')}
          >
            Dynamic
          </TabsTrigger>
          <TabsTrigger
            value="static"
            activeValue={mode}
            class="flex-1 sm:flex-none"
            onclick={() => (mode = 'static')}
          >
            Static
          </TabsTrigger>
        </TabsList>
      </div>

      <div class="p-5 sm:p-6 lg:p-8">
        {#snippet preview()}
          <div class="order-2 w-full lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:order-none lg:self-start">
            <QRCanvas
              value={currentQRValue}
              displayValue={!linkReady
                ? mode === 'static'
                  ? 'Nothing to encode yet'
                  : 'Not saved yet'
                : mode === 'static' || directPayload !== null
                  ? undefined
                  : currentShortLink}
              showLinkActions={linkReady}
              style={qrStyle}
              label={title || 'quickqr'}
            />
          </div>
        {/snippet}

        {#snippet directNote()}
          <p
            data-testid="direct-note"
            class="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground"
          >
            This goes straight into the code. There's nothing to save or sign in for, and it can't be edited after printing.
          </p>
        {/snippet}

        {#if mode === 'dynamic'}
          <form
            onsubmit={handleCreateDynamic}
            class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-10"
          >
            <div class="contents lg:col-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
            <div class="order-1 min-w-0">
              <SourceField id="destination-url" bind:value={source} bind:forcedType bind:fieldValues {resolved} />
            </div>

            <div class="order-3 min-w-0 space-y-4">
              {#if directPayload !== null}
                {@render directNote()}
              {:else if resolved.status === 'ready' || resolved.status === 'empty'}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-auto px-0 text-muted-foreground hover:text-foreground"
                onclick={() => (showOptions = !showOptions)}
              >
                <span>{showOptions ? 'Hide options' : 'Slug and ads'}</span>
                {#if showOptions}
                  <ChevronUp class="size-3.5" />
                {:else}
                  <ChevronDown class="size-3.5" />
                {/if}
              </Button>

              {#if showOptions}
                <div class="space-y-4 border-t border-border pt-4">
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div class="space-y-1.5">
                      <Label for="title">Title / label</Label>
                      <Input id="title" bind:value={title} placeholder="e.g. Table Menu" />
                    </div>
                    <div class="space-y-1.5">
                      <Label for="slug">Custom slug</Label>
                      <div class="flex overflow-hidden rounded-lg border border-input">
                        <span
                          class="border-r border-input bg-muted px-2.5 py-2 text-xs text-muted-foreground select-none"
                        >
                          /r/
                        </span>
                        <Input
                          id="slug"
                          value={customSlug}
                          oninput={(e) => {
                            customSlug = e.currentTarget.value
                              .toLowerCase()
                              .replace(/[^a-z0-9_-]/g, '');
                          }}
                          placeholder="my-link"
                          class="border-0 shadow-none focus-visible:ring-0"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <Label>Ad format</Label>
                    <div class="grid grid-cols-3 gap-2">
                      {#each [
                        ['interstitial_3s', '3s Sponsor'],
                        ['sponsor_banner', 'Banner'],
                        ['direct', 'Direct'],
                      ] as [value, label] (value)}
                        <Button
                          type="button"
                          variant={adStyle === value ? 'default' : 'outline'}
                          size="sm"
                          class="h-auto py-2 text-xs"
                          onclick={() => (adStyle = value as typeof adStyle)}
                        >
                          {label}
                        </Button>
                      {/each}
                    </div>
                  </div>
                </div>
              {/if}

              {#if errorMsg}
                <Alert variant="destructive">
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              {/if}

              {#if createdDynamicLink}
                <div
                  data-testid="dynamic-link-success"
                  class="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3 text-xs"
                >
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <Check class="size-4 text-green-600" />
                    <span>
                      Live:{' '}
                      <strong class="font-mono text-foreground">/r/{createdDynamicLink.code}</strong>
                    </span>
                  </div>
                  <Button href="/dashboard" variant="link" size="sm" class="h-auto p-0">
                    Dashboard →
                  </Button>
                </div>
              {/if}

              <Button
                type="submit"
                disabled={isSubmitting}
                class="h-10 w-full bg-punch text-ink hover:bg-punch/80"
                data-testid="create-dynamic-link"
              >
                <span>{isSubmitting ? 'Creating...' : 'Create QR code'}</span>
                <ArrowRight class="size-4" />
              </Button>
              {/if}
            </div>
            </div>
            {@render preview()}
          </form>
          {:else}
            <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-10">
              <div class="contents lg:col-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
              <div class="order-1 min-w-0">
                <SourceField id="static-url" bind:value={source} bind:forcedType bind:fieldValues {resolved} />
              </div>

              <div class="order-3 min-w-0">
                {#if directPayload !== null}
                  {@render directNote()}
                {:else if resolved.status === 'ready' || resolved.status === 'empty'}
                  <div class="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                    <p data-testid="static-compressed-url" class="break-all font-mono text-xs text-foreground">
                      {staticResult?.url ?? '—'}
                    </p>
                    <div class="flex justify-between text-muted-foreground">
                      <span>Original</span>
                      <span class="font-mono text-foreground">{linkPayload?.length ?? 0} chars</span>
                    </div>
                    <div class="flex justify-between text-muted-foreground">
                      <span>Compressed</span>
                      <span class="font-mono font-medium text-green-600">
                        {staticResult?.url.length ?? 0} chars
                        {staticResult && staticResult.savings > 0 ? `(${staticResult.savings}% smaller)` : ''}
                      </span>
                    </div>
                  </div>
                {/if}
              </div>
              </div>
              {@render preview()}
            </div>
          {/if}
      </div>

    </Card>
  </div>

  <div
    bind:this={styleBarEl}
    data-testid="style-bar"
    class="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background from-40% to-transparent px-3 pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
    style:opacity={styleBarOpacity}
    style:transform={`translateY(${styleBarShift}px)`}
    style:pointer-events={styleBarOpacity < 0.12 ? 'none' : 'auto'}
    aria-hidden={styleBarOpacity < 0.12 ? true : undefined}
  >
    <div class="mx-auto w-full max-w-[1120px]">
      {#if tuneOpen}
        <div
          class="mb-2 max-h-[min(420px,46vh)] overflow-y-auto rounded-2xl bg-card p-4 text-foreground shadow-[0_24px_60px_-28px_rgba(17,17,19,0.55)] ring-1 ring-black/5 dark:ring-white/10"
        >
          <QRStyleEditor style={qrStyle} onChange={patchQrStyle} />
        </div>
      {/if}
      <div class="rounded-2xl bg-ink p-3 text-primary-foreground shadow-[0_24px_50px_-24px_rgba(17,17,19,0.85)] ring-1 ring-white/10">
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="min-w-0 truncate text-sm font-medium text-punch">
            {styleSummary}
          </p>
          <button
            type="button"
            class="h-7 shrink-0 cursor-pointer rounded-full bg-white/10 px-3 text-xs text-white hover:bg-white/20"
            aria-expanded={tuneOpen}
            onclick={() => (tuneOpen = !tuneOpen)}
          >
            {tuneOpen ? 'Close' : 'Colors'}
          </button>
        </div>
        <div class="relative">
          <QRStylePresets {activePresetId} onApply={(result, meta) => applyStyle(result, meta.presetId)} />
          <div
            class="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-ink to-transparent"
            aria-hidden="true"
          ></div>
        </div>
        <div class="mt-2.5">
        <QRStyleAssistant
          dock
          currentStyle={qrStyle}
          onApplyStyle={applyStyle}
          lastSummary={styleSummary}
        />
        </div>
      </div>
    </div>
  </div>

  <AuthModal bind:open={signInOpen} headline="Sign in to save this link" onBeforeOAuth={keepLinkThroughSignIn} />
</section>
