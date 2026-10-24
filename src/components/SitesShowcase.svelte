<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Button from '@/lib/components/ui/button.svelte';
  import portfolioPreview from '../assets/portfolio-preview.webp';

  const liveSite = 'https://sites.quickqr.app/fawcsx/';
</script>

<section class="sites-showcase" aria-labelledby="sites-showcase-title" data-testid="sites-showcase">
  <div class="shell">
    <div class="copy">
      <p class="eyebrow"><span aria-hidden="true"></span>Hosted sites</p>
      <h2 id="sites-showcase-title" class="qq-section-title">A whole site,<br>behind one code.</h2>
      <p class="lede">
        Portfolios, menus, launch pages — host the real files at
        <code>sites.quickqr.app/&lt;code&gt;</code> and print one code for all of it.
        The portfolio shown here is live, not a mockup.
      </p>
      <div class="actions">
        <Button href={liveSite} target="_blank" rel="noreferrer">
          Visit the live site
          <ArrowUpRight class="icon" aria-hidden="true" />
        </Button>
        <a class="text-link" href="/dashboard/sites">
          Open Sites
          <ArrowUpRight class="icon" aria-hidden="true" />
        </a>
      </div>
    </div>

    <a
      class="frame"
      href={liveSite}
      target="_blank"
      rel="noreferrer"
      aria-label="Open the Nora Vale portfolio, a live quickqr site, in a new tab"
    >
      <div class="frame-bar" aria-hidden="true">
        <span class="dots"><i></i><i></i><i></i></span>
        <span class="url">sites.quickqr.app/fawcsx</span>
        <span class="live"><i></i>Live</span>
      </div>
      <img
        src={portfolioPreview}
        alt="The Nora Vale portfolio: a warm editorial page with a large serif headline and an arch illustration"
        width="1024"
        height="711"
        loading="lazy"
        decoding="async"
      />
    </a>
  </div>
</section>

<style>
  .sites-showcase {
    padding-block: 3.5rem;
    padding-inline: 1.5rem;
  }

  .shell {
    margin-inline: auto;
    display: grid;
    max-width: 1120px;
    gap: 2rem;
    align-items: center;
  }

  .copy {
    max-width: 34rem;
  }

  .eyebrow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.9rem;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted-foreground);
  }

  .eyebrow span {
    width: 7px;
    height: 7px;
    border-radius: 2px;
    background: var(--punch);
  }

  h2 {
    margin: 0;
    max-width: 30rem;
    font-size: clamp(1.9rem, 4vw, 2.9rem);
    line-height: 1.04;
    letter-spacing: -0.045em;
  }

  .lede {
    margin: 1rem 0 0;
    font-size: 1rem;
    line-height: 1.65;
    color: var(--muted-foreground);
  }

  code {
    padding: 0.1rem 0.3rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--muted);
    color: var(--foreground);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.85em;
    white-space: nowrap;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem 1.4rem;
    margin-top: 1.6rem;
  }

  :global(.icon) {
    width: 15px;
    height: 15px;
  }

  .text-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding-bottom: 2px;
    border-bottom: 1px solid var(--border);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--foreground);
    text-decoration: none;
    transition: border-color 160ms ease;
  }

  .text-link:hover {
    border-color: var(--foreground);
  }

  .frame {
    display: block;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 1.5);
    background: var(--card);
    box-shadow: 0 1px 2px rgba(20, 20, 22, 0.05), 0 18px 40px -28px rgba(20, 20, 22, 0.35);
    text-decoration: none;
    transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
  }

  .frame:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--foreground) 22%, var(--border));
    box-shadow: 0 1px 2px rgba(20, 20, 22, 0.05), 0 26px 50px -30px rgba(20, 20, 22, 0.42);
  }

  .frame-bar {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.65rem 0.85rem;
    border-bottom: 1px solid var(--border);
    background: var(--card);
  }

  .dots {
    display: inline-flex;
    gap: 4px;
  }

  .dots i {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--border);
  }

  .url {
    overflow: hidden;
    flex: 1;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.6875rem;
    color: var(--muted-foreground);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .live {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.625rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #2f7a4f;
  }

  .live i {
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: #2f7a4f;
    box-shadow: 0 0 0 3px rgba(47, 122, 79, 0.12);
  }

  .frame img {
    display: block;
    width: 100%;
    height: auto;
    background: #f2eee5;
  }

  @media (min-width: 48rem) {
    .sites-showcase {
      padding-inline: 2.5rem;
      padding-block: 4rem;
    }

    .shell {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.06fr);
      gap: 3.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .frame,
    .text-link {
      transition: none;
    }

    .frame:hover {
      transform: none;
    }
  }
</style>
