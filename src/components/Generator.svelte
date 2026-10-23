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

<section id="generator" class="gen">
  <div class="gen-wrap">
    <div class="gen-intro">
      <p class="gen-pill">
        <span class="gen-dot" aria-hidden="true"></span>
        Free QR codes forever
      </p>
      <h1 class="qq-hero-title gen-title">
        Dynamic QR codes
        <br class="gen-break" />
        without the paywall.
      </h1>
      <p class="qq-lede gen-lede">
        Paste a link. Download the code. Change where it goes later.
      </p>
    </div>

    <Card class="gen-card">
      <div class="gen-tabs">
        <TabsList class="gen-tabs-list">
          <TabsTrigger value="dynamic" activeValue={mode} class="gen-tab" onclick={() => (mode = 'dynamic')}>
            Dynamic
          </TabsTrigger>
          <TabsTrigger value="static" activeValue={mode} class="gen-tab" onclick={() => (mode = 'static')}>
            Static
          </TabsTrigger>
        </TabsList>
      </div>

      <div class="gen-body">
        {#snippet preview()}
          <div class="gen-preview">
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
          <p data-testid="direct-note" class="gen-note">
            This goes straight into the code. There's nothing to save or sign in for, and it can't be edited after printing.
          </p>
        {/snippet}

        {#if mode === 'dynamic'}
          <form onsubmit={handleCreateDynamic} class="gen-form">
            <div class="gen-fields">
              <div class="gen-source">
                <SourceField id="destination-url" bind:value={source} bind:forcedType bind:fieldValues {resolved} />
              </div>

              <div class="gen-options">
                {#if directPayload !== null}
                  {@render directNote()}
                {:else if resolved.status === 'ready' || resolved.status === 'empty'}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="gen-options-toggle"
                    onclick={() => (showOptions = !showOptions)}
                  >
                    <span>{showOptions ? 'Hide options' : 'Slug and ads'}</span>
                    {#if showOptions}
                      <ChevronUp class="gen-chevron" />
                    {:else}
                      <ChevronDown class="gen-chevron" />
                    {/if}
                  </Button>

                  {#if showOptions}
                    <div class="gen-options-body">
                      <div class="gen-option-grid">
                        <div class="gen-option">
                          <Label for="title">Title / label</Label>
                          <Input id="title" bind:value={title} placeholder="e.g. Table Menu" />
                        </div>
                        <div class="gen-option">
                          <Label for="slug">Custom slug</Label>
                          <div class="gen-slug">
                            <span class="gen-slug-prefix">/r/</span>
                            <Input
                              id="slug"
                              value={customSlug}
                              oninput={(e) => {
                                customSlug = e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                              }}
                              placeholder="my-link"
                              class="gen-slug-input"
                            />
                          </div>
                        </div>
                      </div>

                      <div class="gen-ad-block">
                        <Label>Ad format</Label>
                        <div class="gen-ad-grid">
                          {#each [
                            ['interstitial_3s', '3s Sponsor'],
                            ['sponsor_banner', 'Banner'],
                            ['direct', 'Direct'],
                          ] as [value, label] (value)}
                            <Button
                              type="button"
                              variant={adStyle === value ? 'default' : 'outline'}
                              size="sm"
                              class="gen-ad-button"
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
                    <div data-testid="dynamic-link-success" class="gen-success">
                      <div class="gen-success-status">
                        <Check class="gen-check" />
                        <span>
                          Live:{' '}
                          <strong class="font-mono gen-code">/r/{createdDynamicLink.code}</strong>
                        </span>
                      </div>
                      <Button href="/dashboard" variant="link" size="sm" class="gen-dashboard-link">
                        Dashboard →
                      </Button>
                    </div>
                  {/if}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    class="gen-submit"
                    data-testid="create-dynamic-link"
                  >
                    <span>{isSubmitting ? 'Creating...' : 'Create QR code'}</span>
                    <ArrowRight class="gen-arrow" />
                  </Button>
                {/if}
              </div>
            </div>
            {@render preview()}
          </form>
        {:else}
          <div class="gen-form">
            <div class="gen-fields">
              <div class="gen-source">
                <SourceField id="static-url" bind:value={source} bind:forcedType bind:fieldValues {resolved} />
              </div>

              <div class="gen-static-col">
                {#if directPayload !== null}
                  {@render directNote()}
                {:else if resolved.status === 'ready' || resolved.status === 'empty'}
                  <div class="gen-static">
                    <p data-testid="static-compressed-url" class="gen-static-url font-mono">
                      {staticResult?.url ?? '—'}
                    </p>
                    <div class="gen-static-row">
                      <span>Original</span>
                      <span class="font-mono gen-code">{linkPayload?.length ?? 0} chars</span>
                    </div>
                    <div class="gen-static-row">
                      <span>Compressed</span>
                      <span class="font-mono gen-savings">
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
    class="gen-stylebar"
    style:opacity={styleBarOpacity}
    style:transform={`translateY(${styleBarShift}px)`}
    style:pointer-events={styleBarOpacity < 0.12 ? 'none' : 'auto'}
    aria-hidden={styleBarOpacity < 0.12 ? true : undefined}
  >
    <div class="gen-wrap">
      {#if tuneOpen}
        <div class="gen-tune">
          <QRStyleEditor style={qrStyle} onChange={patchQrStyle} />
        </div>
      {/if}
      <div class="gen-dock">
        <div class="gen-dock-head">
          <p class="gen-summary">{styleSummary}</p>
          <button
            type="button"
            class="gen-colors"
            aria-expanded={tuneOpen}
            onclick={() => (tuneOpen = !tuneOpen)}
          >
            {tuneOpen ? 'Close' : 'Colors'}
          </button>
        </div>
        <div class="gen-presets">
          <QRStylePresets {activePresetId} onApply={(result, meta) => applyStyle(result, meta.presetId)} />
          <div class="gen-fade" aria-hidden="true"></div>
        </div>
        <div class="gen-assistant">
          <QRStyleAssistant dock currentStyle={qrStyle} onApplyStyle={applyStyle} lastSummary={styleSummary} />
        </div>
      </div>
    </div>
  </div>

  <AuthModal bind:open={signInOpen} headline="Sign in to save this link" onBeforeOAuth={keepLinkThroughSignIn} />
</section>

<style>
  @layer components {
    .gen {
      padding-inline: 1.5rem;
      padding-bottom: 4rem;
    }

    .gen-wrap {
      margin-inline: auto;
      width: 100%;
      max-width: 1120px;
    }

    .gen-intro {
      padding-block: 1.5rem;
    }

    .gen-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      border-radius: 9999px;
      background-color: var(--card);
      padding: 0.25rem 0.75rem;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: -0.01em;
      color: var(--foreground);
      box-shadow:
        0 0 0 1px rgb(0 0 0 / 0.05),
        0 10px 30px -18px rgba(17, 17, 19, 0.55);
    }

    .gen-dot {
      width: 0.375rem;
      height: 0.375rem;
      border-radius: 9999px;
      background-color: var(--punch);
    }

    .gen-title {
      max-width: 680px;
    }

    .gen-break {
      display: none;
    }

    .gen-lede {
      margin-top: 1rem;
      max-width: 420px;
      color: var(--muted-foreground);
    }

    .gen-tabs {
      border-bottom: 1px solid var(--border);
      padding: 0.75rem 1.25rem;
    }

    .gen-body {
      padding: 1.25rem;
    }

    .gen-preview {
      order: 2;
      width: 100%;
    }

    .gen-note {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background-color: color-mix(in oklab, var(--muted) 40%, transparent);
      padding: 1rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
      color: var(--muted-foreground);
    }

    .gen-form {
      display: grid;
      align-items: start;
      gap: 1.5rem;
    }

    .gen-fields {
      display: contents;
    }

    .gen-source {
      order: 1;
      min-width: 0;
    }

    .gen-options {
      display: flex;
      order: 3;
      min-width: 0;
      flex-direction: column;
      gap: 1rem;
    }

    .gen-options-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border-top: 1px solid var(--border);
      padding-top: 1rem;
    }

    .gen-option-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0.75rem;
    }

    .gen-option {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .gen-slug {
      display: flex;
      overflow: hidden;
      border: 1px solid var(--input);
      border-radius: var(--radius);
    }

    .gen-slug-prefix {
      border-right: 1px solid var(--input);
      background-color: var(--muted);
      padding: 0.5rem 0.625rem;
      font-size: 0.75rem;
      line-height: 1rem;
      color: var(--muted-foreground);
      user-select: none;
    }

    .gen-ad-block {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .gen-ad-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
    }

    .gen-success {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background-color: color-mix(in oklab, var(--muted) 50%, transparent);
      padding: 0.75rem;
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .gen-success-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--muted-foreground);
    }

    .gen-static-col {
      order: 3;
      min-width: 0;
    }

    .gen-static {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background-color: color-mix(in oklab, var(--muted) 40%, transparent);
      padding: 1rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .gen-static-url {
      font-size: 0.75rem;
      line-height: 1rem;
      color: var(--foreground);
      overflow-wrap: anywhere;
      word-break: break-all;
    }

    .gen-static-row {
      display: flex;
      justify-content: space-between;
      color: var(--muted-foreground);
    }

    .gen-code {
      color: var(--foreground);
    }

    .gen-savings {
      font-weight: 500;
      color: oklch(0.627 0.194 149.214);
    }

    .gen-stylebar {
      position: fixed;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 30;
      background-image: linear-gradient(to top, var(--background) 40%, transparent);
      padding: 1.5rem 0.75rem max(0.75rem, env(safe-area-inset-bottom));
    }

    .gen-tune {
      max-height: min(420px, 46vh);
      margin-bottom: 0.5rem;
      overflow-y: auto;
      border-radius: calc(var(--radius) * 1.8);
      background-color: var(--card);
      padding: 1rem;
      color: var(--foreground);
      box-shadow:
        0 0 0 1px rgb(0 0 0 / 0.05),
        0 24px 60px -28px rgba(17, 17, 19, 0.55);
    }

    .gen-dock {
      border-radius: calc(var(--radius) * 1.8);
      background-color: var(--ink);
      padding: 0.75rem;
      color: var(--primary-foreground);
      box-shadow:
        0 0 0 1px rgb(255 255 255 / 0.1),
        0 24px 50px -24px rgba(17, 17, 19, 0.85);
    }

    .gen-dock-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .gen-summary {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
      color: var(--punch);
    }

    .gen-colors {
      height: 1.75rem;
      flex-shrink: 0;
      cursor: pointer;
      border-radius: 9999px;
      background-color: rgb(255 255 255 / 0.1);
      padding-inline: 0.75rem;
      font-size: 0.75rem;
      line-height: 1rem;
      color: #fff;
    }

    .gen-presets {
      position: relative;
    }

    .gen-fade {
      pointer-events: none;
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 2rem;
      background-image: linear-gradient(to left, var(--ink), transparent);
    }

    .gen-assistant {
      margin-top: 0.625rem;
    }
  }

  @media (min-width: 40rem) {
    .gen-break {
      display: block;
    }

    .gen-tabs {
      padding-inline: 1.5rem;
    }

    .gen-body {
      padding: 1.5rem;
    }

    .gen-option-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .gen-stylebar {
      padding-inline: 1.5rem;
    }
  }

  @media (min-width: 48rem) {
    .gen {
      padding-inline: 2.5rem;
    }

    .gen-intro {
      padding-block: 2rem;
    }
  }

  @media (min-width: 64rem) {
    .gen-body {
      padding: 2rem;
    }

    .gen-preview {
      position: sticky;
      top: 5rem;
      grid-column-start: 2;
      grid-row-start: 1;
      order: 0;
      align-self: start;
    }

    .gen-form {
      grid-template-columns: minmax(0, 1fr) 300px;
      column-gap: 2.5rem;
    }

    .gen-fields {
      display: flex;
      grid-column-start: 1;
      min-width: 0;
      flex-direction: column;
      gap: 1rem;
    }
  }

  :global(.dark) .gen-pill {
    box-shadow:
      0 0 0 1px rgb(255 255 255 / 0.1),
      0 10px 30px -18px rgba(17, 17, 19, 0.55);
  }

  :global(.dark) .gen-tune {
    box-shadow:
      0 0 0 1px rgb(255 255 255 / 0.1),
      0 24px 60px -28px rgba(17, 17, 19, 0.55);
  }

  .gen-colors:hover {
    background-color: rgb(255 255 255 / 0.2);
  }

  /* Handed to a child component, so global and prefixed. Unlayered so it beats the primitive. */
  :global(.gen-card) {
    overflow: hidden;
    padding: 0;
  }

  :global(.gen-tabs-list) {
    width: 100%;
  }

  :global(.gen-tab) {
    flex: 1 1 0%;
  }

  @media (min-width: 40rem) {
    :global(.gen-tabs-list) {
      width: auto;
    }

    :global(.gen-tab) {
      flex: none;
    }
  }

  :global(.gen-options-toggle) {
    align-self: flex-start;
    width: fit-content;
    height: auto;
    padding-inline: 0;
    color: var(--muted-foreground);
  }

  :global(.gen-options-toggle:hover) {
    color: var(--foreground);
  }

  :global(.gen-chevron) {
    width: 0.875rem;
    height: 0.875rem;
  }

  :global(.gen-slug-input) {
    border-width: 0;
    box-shadow: none;
  }

  :global(.gen-slug-input:focus-visible) {
    box-shadow: none;
  }

  :global(.gen-ad-button) {
    height: auto;
    padding-block: 0.5rem;
    font-size: 0.75rem;
    line-height: 1rem;
  }

  :global(.gen-check) {
    width: 1rem;
    height: 1rem;
    color: oklch(0.627 0.194 149.214);
  }

  :global(.gen-dashboard-link) {
    height: auto;
    padding: 0;
  }

  :global(.gen-submit) {
    height: 2.5rem;
    width: 100%;
    background-color: var(--punch);
    color: var(--ink);
  }

  :global(.gen-submit:hover) {
    background-color: color-mix(in oklab, var(--punch) 80%, transparent);
  }

  :global(.gen-arrow) {
    width: 1rem;
    height: 1rem;
  }
</style>
