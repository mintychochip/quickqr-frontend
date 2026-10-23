<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Globe from '@lucide/svelte/icons/globe';
  import QRCanvas from './QRCanvas.svelte';
  import Alert from '@/lib/components/ui/alert.svelte';
  import AlertDescription from '@/lib/components/ui/alert-description.svelte';
  import Button from '@/lib/components/ui/button.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import Label from '@/lib/components/ui/label.svelte';
  import { createLink } from '../lib/api';
  import { dynamicQrValue, dynamicShortLink } from '../lib/dynamicQr';
  import { DEFAULT_QR_PRESET_ID, presetStyleById, withQrStyleDefaults } from '@/lib/qrStylePresets';
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

  const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const qrStyle = withQrStyleDefaults(presetStyleById(DEFAULT_QR_PRESET_ID));
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

  function createAnother() {
    reset();
    requestAnimationFrame(() => document.getElementById('create-code-destination')?.focus());
  }
</script>

<div data-testid="create-code-panel" class="createdynamic-root">
  <header class="createdynamic-header">
    <button
      type="button"
      aria-label="Back to navigation"
      class="createdynamic-back"
      onclick={onClose}
    >
      <ArrowLeft class="createdynamic-back-icon" />
    </button>
    <div class="createdynamic-head-main">
      <h2 class="createdynamic-head-title">
        {created ? 'Code ready' : 'Create dynamic code'}
      </h2>
      {#if !created}
        <p class="createdynamic-head-sub">Print once, edit the destination later</p>
      {/if}
    </div>
  </header>

  {#if created}
    <div data-testid="create-code-success" class="createdynamic-success">
      <div class="createdynamic-success-body">
        <QRCanvas
          value={createdQrValue}
          style={qrStyle}
          label={created.title}
          displayValue={createdShortLink}
        />

        <p class="createdynamic-success-note">
          This QR never changes. Edit its destination any time from the dashboard.
        </p>
      </div>

      <div class="createdynamic-success-actions">
        <Button type="button" class="createdynamic-done-btn" onclick={onClose}>
          Done
        </Button>
        <Button type="button" variant="outline" class="createdynamic-another-btn" onclick={createAnother}>
          Create another
        </Button>
      </div>
    </div>
  {:else}
    <form onsubmit={submit} class="createdynamic-form">
      <div class="createdynamic-form-body">
        <div class="createdynamic-qr-box">
          <div class="createdynamic-qr-inner">
            <QRCanvas
              value={previewValue}
              style={qrStyle}
              label={title || 'Dynamic code'}
              size={128}
              inline
            />
          </div>
          <p class="createdynamic-slug font-mono">
            /r/{customSlug || 'your-slug'}
          </p>
        </div>

        <div class="createdynamic-field">
          <Label for="create-code-destination">Destination URL</Label>
          <div class="createdynamic-input-wrap">
            <Globe class="createdynamic-input-icon" />
            <Input
              id="create-code-destination"
              type="url"
              required
              bind:value={destinationUrl}
              placeholder="https://yoursite.com/menu"
              class="createdynamic-input"
            />
          </div>
        </div>

        <div class="createdynamic-field">
          <Label for="create-code-title">Title</Label>
          <Input id="create-code-title" bind:value={title} placeholder="e.g. Table menu" />
        </div>

        <div class="createdynamic-field">
          <Label for="create-code-slug">Custom slug</Label>
          <div class="createdynamic-slug-group">
            <span class="createdynamic-slug-prefix">
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
              class="createdynamic-slug-input"
            />
          </div>
        </div>

        <div class="createdynamic-field">
          <Label>Ad format</Label>
          <div class="createdynamic-ad-grid">
            {#each [
              ['interstitial_3s', '3s Sponsor'],
              ['sponsor_banner', 'Banner'],
              ['direct', 'Direct'],
            ] as [value, label] (value)}
              <Button
                type="button"
                variant={adStyle === value ? 'default' : 'outline'}
                size="sm"
                class="createdynamic-ad-btn"
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

      <div class="createdynamic-form-actions">
        <Button type="button" variant="outline" class="createdynamic-cancel-btn" onclick={onClose}>Cancel</Button>
        <Button
          type="submit"
          disabled={submitting}
          data-testid="create-code-submit"
          class="createdynamic-submit-btn"
        >
          {#if submitting}
            Creating…
          {:else}
            Create
            <ArrowRight class="createdynamic-submit-icon" />
          {/if}
        </Button>
      </div>
    </form>
  {/if}
</div>

<style>

  @layer components {
    .createdynamic-root {
      display: flex;
      height: 100%;
      min-height: 0;
      flex-direction: column;
      background-color: var(--card);
    }

    .createdynamic-header {
      display: flex;
      height: 3.5rem;
      flex-shrink: 0;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border);
      padding-left: 0.75rem;
      padding-right: 0.75rem;
    }

    .createdynamic-back {
      display: grid;
      width: 2.25rem;
      height: 2.25rem;
      flex-shrink: 0;
      cursor: pointer;
      place-items: center;
      border-radius: calc(var(--radius) * 1.4);
      color: var(--muted-foreground);
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
      outline-style: none;
    }

    :global(.createdynamic-back-icon) {
      width: 1rem;
      height: 1rem;
    }

    .createdynamic-head-main {
      min-width: 0;
      flex: 1 1 0%;
    }

    .createdynamic-head-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.875rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--foreground);
    }

    .createdynamic-head-sub {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
      color: var(--muted-foreground);
    }

    .createdynamic-success {
      display: flex;
      min-height: 0;
      flex: 1 1 0%;
      flex-direction: column;
    }

    .createdynamic-success-body {
      flex: 1 1 0%;
      overflow-y: auto;
      padding: 1rem;
    }

    .createdynamic-success-note {
      margin-top: 1rem;
      text-align: center;
      font-size: 0.75rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .createdynamic-success-actions {
      display: flex;
      flex-shrink: 0;
      flex-direction: column;
      gap: 0.5rem;
      border-top: 1px solid var(--border);
      padding: 0.75rem;
      padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
    }

    :global(.createdynamic-done-btn) {
      height: 2.5rem;
      background-color: var(--punch);
      color: var(--ink);
    }

    :global(.createdynamic-another-btn) {
      height: 2.5rem;
    }

    .createdynamic-form {
      display: flex;
      min-height: 0;
      flex: 1 1 0%;
      flex-direction: column;
    }

    .createdynamic-form-body {
      flex: 1 1 0%;
      overflow-y: auto;
      padding: 1rem;
    }

    .createdynamic-qr-box {
      border-radius: calc(var(--radius) * 1.4);
      border: 1px solid var(--border);
      background-color: color-mix(in oklab, var(--muted) 40%, transparent);
      padding: 0.75rem;
      text-align: center;
    }

    .createdynamic-qr-inner {
      margin-left: auto;
      margin-right: auto;
      width: fit-content;
      border-radius: calc(var(--radius) * 1.4);
      background-color: white;
      padding: 0.5rem;
    }

    .createdynamic-slug {
      margin-top: 0.5rem;
      font-size: 10px;
      color: var(--muted-foreground);
    }

    .createdynamic-field {
      margin-top: 1rem;
    }

    .createdynamic-input-wrap {
      position: relative;
    }

    :global(.createdynamic-input-icon) {
      position: absolute;
      top: 50%;
      left: 0.75rem;
      transform: translateY(-50%);
      width: 1rem;
      height: 1rem;
      color: var(--muted-foreground);
      pointer-events: none;
    }

    :global(.createdynamic-input) {
      height: 2.5rem;
      padding-left: 2.25rem;
    }

    .createdynamic-slug-group {
      display: flex;
      overflow: hidden;
      border-radius: calc(var(--radius) * 1.4);
      border: 1px solid var(--input);
    }

    .createdynamic-slug-prefix {
      border-right: 1px solid var(--input);
      background-color: var(--muted);
      padding-left: 0.625rem;
      padding-right: 0.625rem;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
      font-size: 0.75rem;
      color: var(--muted-foreground);
      user-select: none;
    }

    :global(.createdynamic-slug-input) {
      border: 0;
      box-shadow: none;
    }

    .createdynamic-ad-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.375rem;
    }

    :global(.createdynamic-ad-btn) {
      height: auto;
      padding-left: 0.25rem;
      padding-right: 0.25rem;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
      font-size: 11px;
    }

    .createdynamic-form-actions {
      display: flex;
      flex-shrink: 0;
      gap: 0.5rem;
      border-top: 1px solid var(--border);
      padding: 0.75rem;
      padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
    }

    :global(.createdynamic-cancel-btn) {
      height: 2.5rem;
      flex: 1 1 0%;
    }

    :global(.createdynamic-submit-btn) {
      height: 2.5rem;
      flex: 1 1 0%;
      background-color: var(--punch);
      color: var(--ink);
    }

    :global(.createdynamic-submit-icon) {
      width: 1rem;
      height: 1rem;
    }
  }

  /* unlayered: hovers, focus, disabled states, responsive */
  .createdynamic-back:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }

  .createdynamic-back:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  :global(.createdynamic-done-btn:hover) {
    background-color: color-mix(in oklab, var(--punch) 80%, transparent);
  }

  :global(.createdynamic-submit-btn:hover) {
    background-color: color-mix(in oklab, var(--punch) 80%, transparent);
  }

  :global(.createdynamic-submit-btn:disabled) {
    opacity: 0.6;
    pointer-events: none;
  }

  :global(.createdynamic-input:focus-visible) {
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--ring) 50%, transparent);
  }

  :global(.createdynamic-slug-input:focus-visible) {
    box-shadow: none;
  }
</style>
