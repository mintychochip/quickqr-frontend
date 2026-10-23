<script lang="ts">
  import Button from '@/lib/components/ui/button.svelte';
  import Logo from './Logo.svelte';

  $effect(() => {
    document.title = 'Page not found · quickqr.app';
  });
</script>

<div class="page">
  <header class="page-header">
    <a href="/" class="home-link" aria-label="quickqr.app home">
      <Logo />
    </a>
  </header>

  <main class="page-main">
    <svg viewBox="0 0 640 360" class="missing-mark" role="img" aria-label="A QR symbol with one finder pattern missing">
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

    <p class="status-code">404</p>
    <h1 class="qq-section-title page-title">This page isn’t a code.</h1>
    <p class="qq-lede page-lede">
      Nothing on quickqr.app lives at this address. The studio is still on the home page.
    </p>
    <Button href="/" variant="punch" class="page-cta">Back to the studio</Button>
  </main>
</div>

<style>
  .page {
    display: flex;
    min-height: 100vh;
    flex-direction: column;
    background-color: var(--background);
    color: var(--foreground);
  }

  .page-header {
    display: flex;
    align-items: center;
    height: 3.5rem;
    width: 100%;
    max-width: 1120px;
    margin-inline: auto;
    padding-inline: 1.5rem;
  }

  .home-link {
    display: inline-flex;
    align-items: center;
    padding-block: 0.25rem;
    border-radius: calc(var(--radius) * 1.4);
  }

  .page-main {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 760px;
    margin-inline: auto;
    padding-inline: 1.5rem;
    padding-bottom: 5rem;
  }

  .missing-mark {
    height: auto;
    width: 100%;
    max-width: 560px;
  }

  .status-code {
    margin-top: 2rem;
    font-size: 12px;
    line-height: calc(1.5 / 1);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--muted-foreground);
  }

  .page-title {
    margin-top: 0.5rem;
    text-align: center;
  }

  .page-lede {
    margin-top: 0.75rem;
    max-width: 420px;
    text-align: center;
    color: var(--muted-foreground);
  }

  /* A class handed to the Button: global here, prefixed with this component's name. */
  :global(.page-cta) {
    margin-top: 1.5rem;
    height: 2.5rem;
    padding-inline: 1rem;
  }

  @media (min-width: 48rem) {
    .page-header {
      padding-inline: 2.5rem;
    }
  }
</style>
