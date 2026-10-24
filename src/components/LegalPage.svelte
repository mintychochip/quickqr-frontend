<script lang="ts">
  import Logo from './Logo.svelte';
  import { privacyPolicy, termsOfService } from '@/lib/legal';

  type Props = { kind: 'privacy' | 'terms' };

  let { kind }: Props = $props();

  const doc = $derived(kind === 'privacy' ? privacyPolicy : termsOfService);
  const year = new Date().getFullYear();

  $effect(() => {
    document.title = `${doc.title} · quickqr.app`;
  });
</script>

<div data-testid="legal-page" class="legal-page">
  <header class="legal-header">
    <a href="/" class="legal-home" aria-label="quickqr.app home">
      <Logo />
    </a>
    <a href="/" class="legal-back">Back to quickqr.app</a>
  </header>

  <main class="legal-main">
    <p class="legal-eyebrow">Legal</p>
    <h1>{doc.title}</h1>
    <p class="legal-updated">Last updated {doc.updated}</p>
    <p class="legal-intro">{doc.intro}</p>

    {#each doc.sections as section (section.heading)}
      <section class="legal-section">
        <h2>{section.heading}</h2>
        {#each section.paragraphs as paragraph}
          <p>{paragraph}</p>
        {/each}
      </section>
    {/each}
  </main>

  <footer class="legal-footer">
    <div class="legal-footer-row">
      <p>© {year} quickqr.app</p>
      <nav class="legal-footer-links" aria-label="Legal">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/">Back to quickqr.app</a>
      </nav>
    </div>
    <p class="legal-trademark">
      <strong>QR Code</strong> is a registered trademark of
      <strong>DENSO WAVE INCORPORATED</strong>. quickqr.app is not affiliated with or endorsed by
      DENSO WAVE INCORPORATED.
    </p>
  </footer>
</div>

<style>
  .legal-page {
    min-height: 100svh;
    background-color: var(--background);
    color: var(--foreground);
  }

  .legal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    max-width: 1024px;
    margin: 0 auto;
    padding: 1.5rem 1.5rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  .legal-home {
    display: inline-flex;
    align-items: center;
    color: var(--foreground);
  }

  .legal-back {
    font-size: 14px;
    font-weight: 500;
    color: var(--muted-foreground);
    transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .legal-back:hover {
    color: var(--foreground);
  }

  .legal-main {
    max-width: 720px;
    margin: 0 auto;
    padding: 3.5rem 1.5rem 4rem;
  }

  .legal-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--punch);
  }

  .legal-main h1 {
    margin-top: 0.75rem;
    font-size: clamp(2rem, 5vw, 2.75rem);
    font-weight: 600;
    letter-spacing: -0.035em;
    line-height: 1.05;
  }

  .legal-updated {
    margin-top: 0.75rem;
    font-size: 13px;
    color: var(--muted-foreground);
  }

  .legal-intro {
    margin-top: 1.5rem;
    font-size: 18px;
    line-height: 1.6;
    color: var(--muted-foreground);
  }

  .legal-section {
    margin-top: 2.25rem;
  }

  .legal-section h2 {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .legal-section p {
    margin-top: 0.625rem;
    font-size: 15px;
    line-height: 1.7;
  }

  .legal-section p + p {
    margin-top: 0.625rem;
  }

  .legal-footer {
    max-width: 720px;
    margin: 0 auto;
    padding: 1.75rem 1.5rem 3rem;
    border-top: 1px solid var(--border);
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted-foreground);
  }

  .legal-footer-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1.5rem;
  }

  .legal-footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .legal-footer-links a {
    color: var(--muted-foreground);
    transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .legal-footer-links a:hover {
    color: var(--foreground);
  }

  .legal-trademark {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .legal-trademark strong {
    font-weight: 500;
    color: var(--foreground);
  }

  @media (max-width: 640px) {
    .legal-header {
      padding: 1.25rem 1.25rem 1rem;
    }

    .legal-main {
      padding: 2.5rem 1.25rem 3rem;
    }

    .legal-footer {
      padding: 1.5rem 1.25rem 2.5rem;
    }
  }
</style>
