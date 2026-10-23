<script lang="ts">
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Pencil from '@lucide/svelte/icons/pencil';
  import X from '@lucide/svelte/icons/x';
  import Button from '@/lib/components/ui/button.svelte';
  import Dialog from '@/lib/components/ui/dialog.svelte';

  type Props = {
    open?: boolean;
    kind: 'menu' | 'linkpage';
    title: string;
    code: string;
    scans?: number;
    editHref: string;
  };

  let { open = $bindable(false), kind, title, code, scans = 0, editHref }: Props = $props();

  let loading = $state(true);
  let closeButton = $state<HTMLButtonElement | null>(null);

  const label = $derived(kind === 'menu' ? 'Menu preview' : 'Link page preview');
  const fallback = $derived(kind === 'menu' ? 'Untitled menu' : 'Untitled page');
  const href = $derived(`/r/${code}`);

  $effect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => closeButton?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
      focused?.focus();
    };
  });

  $effect(() => {
    if (!open) return;
    void href;
    loading = true;
  });
</script>

<Dialog
  bind:open
  class="previewdrawer-dialog"
>
  {#snippet children({ close })}
    <div class="previewdrawer-content" data-testid="preview-drawer">
      <header class="previewdrawer-header">
        <div class="previewdrawer-header-main">
          <p class="previewdrawer-label">
            {label}
          </p>
          <h2 class="previewdrawer-title">
            {title || fallback}
          </h2>
          <div class="previewdrawer-meta">
            <span class="previewdrawer-code font-mono">
              /r/{code}
            </span>
            <span class="previewdrawer-scans">
              {scans.toLocaleString()} {scans === 1 ? 'scan' : 'scans'}
            </span>
          </div>
        </div>
        <button
          type="button"
          bind:this={closeButton}
          aria-label="Close preview"
          class="previewdrawer-close"
          onclick={close}
        >
          <X class="previewdrawer-x-icon" />
        </button>
      </header>

      <div class="previewdrawer-body">
        <div class="previewdrawer-toolbar">
          <span class="previewdrawer-toolbar-label">
            Mobile preview
          </span>
          <span class="previewdrawer-toolbar-size font-mono">390 px</span>
        </div>
        <div class="previewdrawer-viewport">
          <div class="previewdrawer-phone">
            {#if loading}
              <div class="previewdrawer-loading" aria-hidden="true"></div>
            {/if}
            <iframe
              title={`${title || fallback} mobile preview`}
              src={href}
              class="previewdrawer-iframe"
              onload={() => (loading = false)}
            ></iframe>
            <div
              class="previewdrawer-notch-top"
              aria-hidden="true"
            ></div>
            <div
              class="previewdrawer-notch-bottom"
              aria-hidden="true"
            ></div>
          </div>
        </div>
      </div>

      <footer class="previewdrawer-footer">
        <Button href={editHref} variant="outline" class="previewdrawer-edit-btn">
          <Pencil class="previewdrawer-btn-icon" />
          Edit {kind === 'menu' ? 'menu' : 'page'}
        </Button>
        <Button href={href} target="_blank" rel="noopener noreferrer" class="previewdrawer-open-btn">
          <ExternalLink class="previewdrawer-btn-icon" />
          Open in new tab
        </Button>
      </footer>
    </div>
  {/snippet}
</Dialog>
<style>

  @layer components {
    :global(.previewdrawer-dialog) {
      left: auto;
      right: 0;
      top: 0;
      height: 100dvh;
      max-height: 100dvh;
      width: 100%;
      max-width: 100%;
      translate: 0 0;
      gap: 0;
      overflow: hidden;
      border-radius: 0;
      padding: 0;
    }

    .previewdrawer-content {
      display: flex;
      height: 100%;
      min-height: 0;
      flex-direction: column;
      background-color: var(--card);
    }

    .previewdrawer-header {
      display: flex;
      flex-shrink: 0;
      align-items: flex-start;
      gap: 0.75rem;
      border-bottom: 1px solid var(--border);
      padding: 1rem 1.25rem;
    }

    .previewdrawer-header-main {
      min-width: 0;
      flex: 1 1 0%;
    }

    .previewdrawer-label {
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted-foreground);
    }

    .previewdrawer-title {
      margin-top: 0.25rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 1.125rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--foreground);
    }

    .previewdrawer-meta {
      margin-top: 0.5rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    .previewdrawer-code {
      border-radius: calc(var(--radius) * 0.8);
      background-color: var(--muted);
      padding-left: 0.375rem;
      padding-right: 0.375rem;
      font-size: 10px;
      color: var(--muted-foreground);
    }

    .previewdrawer-scans {
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .previewdrawer-close {
      display: grid;
      width: 2rem;
      height: 2rem;
      flex-shrink: 0;
      cursor: pointer;
      place-items: center;
      border-radius: calc(var(--radius) * 1.4);
      color: var(--muted-foreground);
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
      outline-style: none;
    }

    :global(.previewdrawer-x-icon) {
      width: 1rem;
      height: 1rem;
    }

    .previewdrawer-body {
      display: flex;
      min-height: 0;
      flex: 1 1 0%;
      flex-direction: column;
      background-color: color-mix(in oklab, var(--muted) 40%, transparent);
    }

    .previewdrawer-toolbar {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1.25rem;
    }

    .previewdrawer-toolbar-label {
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted-foreground);
    }

    .previewdrawer-toolbar-size {
      font-size: 10px;
      color: var(--muted-foreground);
    }

    .previewdrawer-viewport {
      display: flex;
      min-height: 0;
      flex: 1 1 0%;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .previewdrawer-phone {
      position: relative;
      height: 100%;
      width: 100%;
      max-width: 402px;
      overflow: hidden;
      border-radius: 2.25rem;
      border: 6px solid var(--ink);
      background-color: white;
      box-shadow: 0 24px 50px -24px rgba(17, 17, 19, 0.45);
    }

    .previewdrawer-iframe {
      height: 100%;
      width: 100%;
      border: 0;
      background-color: white;
    }

    .previewdrawer-notch-top {
      position: absolute;
      left: 50%;
      top: 0.5rem;
      z-index: 20;
      height: 0.375rem;
      width: 4rem;
      transform: translateX(-50%);
      border-radius: 9999px;
      background-color: rgb(17 17 19 / 0.15);
      pointer-events: none;
    }

    .previewdrawer-notch-bottom {
      position: absolute;
      left: 50%;
      bottom: 0.5rem;
      z-index: 20;
      height: 0.25rem;
      width: 5rem;
      transform: translateX(-50%);
      border-radius: 9999px;
      background-color: rgb(17 17 19 / 0.2);
      pointer-events: none;
    }

    .previewdrawer-loading {
      position: absolute;
      inset: 0;
      z-index: 10;
      background-color: var(--muted);
      animation: previewdrawer-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .previewdrawer-footer {
      display: flex;
      flex-shrink: 0;
      gap: 0.5rem;
      border-top: 1px solid var(--border);
      padding: 0.75rem;
      padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
    }

    :global(.previewdrawer-edit-btn),
    :global(.previewdrawer-open-btn) {
      height: 2.5rem;
      flex: 1 1 0%;
    }

    :global(.previewdrawer-edit-btn) {
      border-color: var(--border);
      background-color: var(--card);
    }

    :global(.previewdrawer-btn-icon) {
      width: 1rem;
      height: 1rem;
    }
  }

  /* unlayered: hover, focus, media, keyframes */
  .previewdrawer-close:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }

  .previewdrawer-close:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  @media (width < 40rem) {
    .previewdrawer-phone {
      max-width: 100%;
      border-radius: 0;
      border-width: 0;
      box-shadow: none;
    }

    .previewdrawer-toolbar,
    .previewdrawer-notch-top,
    .previewdrawer-notch-bottom {
      display: none;
    }

    .previewdrawer-viewport {
      padding-left: 0;
      padding-right: 0;
      padding-bottom: 0;
    }
  }

  @keyframes previewdrawer-pulse {
    50% {
      opacity: 0.5;
    }
  }

  :global(.previewdrawer-dialog) {
    left: auto !important;
    right: 0 !important;
    top: 0 !important;
    height: 100dvh !important;
    max-height: 100dvh !important;
    width: 100% !important;
    max-width: 100% !important;
    translate: 0 0 !important;
    gap: 0 !important;
    overflow: hidden !important;
    border-radius: 0 !important;
    padding: 0 !important;
  }

  @media (min-width: 40rem) {
    :global(.previewdrawer-dialog) {
      max-width: 560px !important;
    }
  }
</style>
