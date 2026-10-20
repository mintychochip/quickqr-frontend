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
  class="left-auto right-0 top-0 h-dvh max-h-dvh w-full max-w-full translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none p-0 ring-0 motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:duration-200 sm:max-w-[560px]"
>
  {#snippet children({ close })}
    <div class="flex h-full min-h-0 flex-col bg-card" data-testid="preview-drawer">
      <header class="flex shrink-0 items-start gap-3 border-b border-border px-5 py-4">
        <div class="min-w-0 flex-1">
          <p class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <h2 class="mt-1 truncate text-lg font-semibold tracking-[-0.02em] text-foreground">
            {title || fallback}
          </h2>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground">
              /r/{code}
            </span>
            <span class="text-xs text-muted-foreground">
              {scans.toLocaleString()} {scans === 1 ? 'scan' : 'scans'}
            </span>
          </div>
        </div>
        <button
          type="button"
          bind:this={closeButton}
          aria-label="Close preview"
          class="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          onclick={close}
        >
          <X class="size-4" />
        </button>
      </header>

      <div class="flex min-h-0 flex-1 flex-col bg-muted/40">
        <div class="flex shrink-0 items-center justify-between px-5 py-2 max-sm:hidden">
          <span class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Mobile preview
          </span>
          <span class="font-mono text-[10px] text-muted-foreground">390 px</span>
        </div>
        <div class="flex min-h-0 flex-1 items-center justify-center px-4 pb-4 max-sm:px-0 max-sm:pb-0">
          <div
            class="relative h-full w-full max-w-[402px] overflow-hidden rounded-[2.25rem] border-[6px] border-ink bg-white shadow-[0_24px_50px_-24px_rgba(17,17,19,0.45)] max-sm:max-w-full max-sm:rounded-none max-sm:border-0 max-sm:shadow-none"
          >
            {#if loading}
              <div class="absolute inset-0 z-10 animate-pulse bg-muted" aria-hidden="true"></div>
            {/if}
            <iframe
              title={`${title || fallback} mobile preview`}
              src={href}
              class="h-full w-full border-0 bg-white"
              onload={() => (loading = false)}
            ></iframe>
            <div
              class="pointer-events-none absolute left-1/2 top-2 z-20 h-1.5 w-16 -translate-x-1/2 rounded-full bg-ink/15 max-sm:hidden"
              aria-hidden="true"
            ></div>
            <div
              class="pointer-events-none absolute bottom-2 left-1/2 z-20 h-1 w-20 -translate-x-1/2 rounded-full bg-ink/20 max-sm:hidden"
              aria-hidden="true"
            ></div>
          </div>
        </div>
      </div>

      <footer class="flex shrink-0 gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button href={editHref} variant="outline" class="h-10 flex-1 border-border bg-card">
          <Pencil class="size-4" />
          Edit {kind === 'menu' ? 'menu' : 'page'}
        </Button>
        <Button href={href} target="_blank" rel="noopener noreferrer" class="h-10 flex-1">
          <ExternalLink class="size-4" />
          Open in new tab
        </Button>
      </footer>
    </div>
  {/snippet}
</Dialog>
