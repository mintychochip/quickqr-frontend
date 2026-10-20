<script lang="ts">
  import Button from '@/lib/components/ui/button.svelte';
  import Logo from './Logo.svelte';

  $effect(() => {
    document.title = 'Page not found · quickqr.app';
  });
</script>

<div class="flex min-h-screen flex-col bg-background text-foreground">
  <header class="mx-auto flex h-14 w-full max-w-[1120px] items-center px-6 md:px-10">
    <a href="/" class="inline-flex items-center rounded-xl py-1" aria-label="quickqr.app home">
      <Logo />
    </a>
  </header>

  <main class="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center justify-center px-6 pb-20">
    <svg viewBox="0 0 640 360" class="h-auto w-full max-w-[560px]" role="img" aria-label="A QR symbol with one finder pattern missing">
      <rect x="70" y="28" width="500" height="304" rx="40" fill="#111113" />
      <g fill="#f7f7f5">
        <rect x="118" y="68" width="22" height="22" rx="5" />
        <rect x="148" y="68" width="22" height="22" rx="5" />
        <rect x="178" y="68" width="22" height="22" rx="5" />
        <rect x="238" y="68" width="22" height="22" rx="5" />
        <rect x="268" y="68" width="22" height="22" rx="5" />
        <rect x="118" y="98" width="22" height="22" rx="5" />
        <rect x="178" y="98" width="22" height="22" rx="5" />
        <rect x="208" y="98" width="22" height="22" rx="5" />
        <rect x="268" y="98" width="22" height="22" rx="5" />
        <rect x="118" y="128" width="22" height="22" rx="5" />
        <rect x="148" y="128" width="22" height="22" rx="5" />
        <rect x="208" y="128" width="22" height="22" rx="5" />
        <rect x="238" y="128" width="22" height="22" rx="5" />
        <rect x="148" y="158" width="22" height="22" rx="5" />
        <rect x="208" y="158" width="22" height="22" rx="5" />
        <rect x="268" y="158" width="22" height="22" rx="5" />
        <rect x="118" y="188" width="22" height="22" rx="5" />
        <rect x="178" y="188" width="22" height="22" rx="5" />
        <rect x="238" y="188" width="22" height="22" rx="5" />
        <rect x="148" y="218" width="22" height="22" rx="5" />
        <rect x="208" y="218" width="22" height="22" rx="5" />
        <rect x="268" y="218" width="22" height="22" rx="5" />
        <rect x="118" y="248" width="22" height="22" rx="5" />
        <rect x="178" y="248" width="22" height="22" rx="5" />
        <rect x="238" y="248" width="22" height="22" rx="5" />
      </g>
      <g fill="#d7ff3c">
        <rect x="208" y="68" width="22" height="22" rx="5" />
        <rect x="148" y="98" width="22" height="22" rx="5" />
        <rect x="178" y="158" width="22" height="22" rx="5" />
        <rect x="148" y="188" width="22" height="22" rx="5" />
        <rect x="208" y="248" width="22" height="22" rx="5" />
      </g>
      <rect x="332" y="78" width="92" height="92" rx="22" fill="none" stroke="#d7ff3c" stroke-width="8" />
      <rect x="356" y="102" width="44" height="44" rx="12" fill="#d7ff3c" />
      <rect x="332" y="196" width="92" height="92" rx="22" fill="none" stroke="#f7f7f5" stroke-width="8" stroke-dasharray="16 12" />
      <circle cx="470" cy="168" r="7" fill="#d7ff3c" />
      <rect x="454" y="214" width="28" height="28" rx="8" fill="#f7f7f5" transform="rotate(12 468 228)" />
    </svg>

    <p class="mt-8 text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground">404</p>
    <h1 class="qq-section-title mt-2 text-center">This page isn’t a code.</h1>
    <p class="qq-lede mt-3 max-w-[420px] text-center text-muted-foreground">
      Nothing on quickqr.app lives at this address. The studio is still on the home page.
    </p>
    <Button href="/" class="mt-6 h-10 bg-punch px-4 text-ink hover:bg-punch/80">Back to the studio</Button>
  </main>
</div>
