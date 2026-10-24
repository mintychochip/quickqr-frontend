<script lang="ts">
  import { onMount } from 'svelte';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Pause from '@lucide/svelte/icons/pause';
  import Play from '@lucide/svelte/icons/play';
  import Button from '@/lib/components/ui/button.svelte';
  import fieldNotesPreview from '../assets/field-notes-preview.webp';
  import morrowPreview from '../assets/morrow-preview.webp';
  import portfolioPreview from '../assets/portfolio-preview.webp';

  const sites = [
    {
      name: 'Nora Vale',
      kind: 'Portfolio',
      code: 'fawcsx',
      image: portfolioPreview,
      alt: 'The Nora Vale portfolio: a warm editorial page with a large serif headline and an arch illustration',
    },
    {
      name: 'Morrow',
      kind: 'Bakery',
      code: 'qcd7n3',
      image: morrowPreview,
      alt: 'The Morrow bakery site: a terracotta hero with a loaf, a sun, and a sourdough price card',
    },
    {
      name: 'Field Notes',
      kind: 'Launch page',
      code: 'd2hq9g',
      image: fieldNotesPreview,
      alt: 'The Field Notes launch page: a forest-green reading card and a large serif headline',
    },
  ] as const;

  let active = $state(0);
  let userPaused = $state(false);
  let hovered = $state(false);
  let motionOk = $state(false);

  const paused = $derived(userPaused || hovered);
  const current = $derived(sites[active] ?? sites[0]);
  const liveUrl = (code: string): string => `https://sites.quickqr.app/${code}/`;

  onMount(() => {
    motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  $effect(() => {
    if (!motionOk || paused) return;
    const timer = window.setTimeout(() => {
      active = (active + 1) % sites.length;
    }, 6000);
    return () => window.clearTimeout(timer);
  });

  function offsetFor(index: number): number {
    return ((index - active + 1 + sites.length) % sites.length) - 1;
  }

  function step(delta: number) {
    active = (active + delta + sites.length) % sites.length;
  }

  function select(index: number) {
    const site = sites[index];
    if (!site) return;
    if (index === active) {
      window.open(liveUrl(site.code), '_blank', 'noopener,noreferrer');
    } else {
      active = index;
    }
  }

  function onFocusOut(event: FocusEvent) {
    const root = event.currentTarget;
    const next = event.relatedTarget;
    if (!(root instanceof HTMLElement) || !(next instanceof Node) || !root.contains(next)) hovered = false;
  }
</script>

<section
  class="sites-showcase"
  aria-labelledby="sites-showcase-title"
  data-testid="sites-showcase"
  onmouseenter={() => (hovered = true)}
  onmouseleave={() => (hovered = false)}
  onfocusin={() => (hovered = true)}
  onfocusout={onFocusOut}
>
  <div class="shell">
    <div class="intro">
      <div class="intro-copy">
        <p class="eyebrow"><span aria-hidden="true"></span>Hosted sites</p>
        <h2 id="sites-showcase-title" class="qq-section-title">A whole site,<br>behind one code.</h2>
        <p class="lede">Real sites, hosted on quickqr. The pages do the talking.</p>
      </div>
      <a class="text-link" href="/dashboard/sites">
        Open Sites
        <ArrowUpRight class="icon" aria-hidden="true" />
      </a>
    </div>

    <div
      class="stage"
      role="group"
      aria-roledescription="carousel"
      aria-label="Sites hosted on quickqr"
      data-testid="sites-carousel"
    >
      {#each sites as site, index (site.code)}
        {@const offset = offsetFor(index)}
        <button
          type="button"
          class="page"
          class:active={offset === 0}
          style:--offset={offset}
          style:--abs={Math.abs(offset)}
          aria-label={offset === 0 ? `Open ${site.name}, a ${site.kind} site` : `Show ${site.name}, a ${site.kind} site`}
          aria-current={offset === 0 ? 'true' : undefined}
          data-site={site.code}
          onclick={() => select(index)}
        >
          <img src={site.image} alt={site.alt} width="1024" height="711" loading="eager" decoding="async" />
          <span class="meta">
            <span class="name">{site.name}</span>
            <span class="kind">{site.kind}</span>
            {#if offset === 0}
              <ArrowUpRight class="meta-arrow" aria-hidden="true" />
            {/if}
          </span>
        </button>
      {/each}
    </div>

    <div class="controls">
      <div class="steppers">
        <button type="button" class="round" aria-label="Previous site" onclick={() => step(-1)}>
          <ChevronLeft class="control-icon" aria-hidden="true" />
        </button>
        <button type="button" class="round" aria-label="Next site" onclick={() => step(1)}>
          <ChevronRight class="control-icon" aria-hidden="true" />
        </button>
      </div>

      <Button href={liveUrl(current.code)} target="_blank" rel="noreferrer">
        Visit {current.name}
        <ArrowUpRight class="icon" aria-hidden="true" />
      </Button>

      {#if motionOk}
        <button
          type="button"
          class="round"
          aria-label={userPaused ? 'Resume the site carousel' : 'Pause the site carousel'}
          onclick={() => (userPaused = !userPaused)}
        >
          {#if userPaused}
            <Play class="control-icon" aria-hidden="true" />
          {:else}
            <Pause class="control-icon" aria-hidden="true" />
          {/if}
        </button>
      {/if}
    </div>
  </div>
</section>

<style>
  .sites-showcase {
    padding-block: 3.5rem;
    padding-inline: 1.5rem;
  }

  .shell {
    margin-inline: auto;
    max-width: 1120px;
  }

  .intro {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 2rem;
  }

  .intro-copy {
    min-width: 0;
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

  .text-link {
    display: inline-flex;
    flex: 0 0 auto;
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

  :global(.icon) {
    width: 15px;
    height: 15px;
  }

  .stage {
    --card-w: min(82vw, 520px);
    position: relative;
    height: calc(var(--card-w) * 0.694 + 100px);
    margin-top: 1.5rem;
    overflow: hidden;
    perspective: 1400px;
    perspective-origin: 50% 42%;
  }

  .page {
    position: absolute;
    top: 50%;
    left: 50%;
    display: block;
    width: var(--card-w);
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 1.2);
    background: var(--card);
    box-shadow: 0 2px 4px rgba(20, 20, 22, 0.06), 0 24px 50px -32px rgba(20, 20, 22, 0.45);
    font: inherit;
    color: var(--foreground);
    text-align: left;
    cursor: pointer;
    opacity: calc(1 - var(--abs) * 0.3);
    z-index: calc(3 - var(--abs));
    transform: translate(-50%, -50%) translateX(calc(var(--offset) * 58%))
      translateZ(calc(var(--abs) * -110px)) rotateY(calc(var(--offset) * -34deg))
      scale(calc(1 - var(--abs) * 0.12));
    transition:
      transform 650ms cubic-bezier(0.2, 0.8, 0.2, 1),
      opacity 450ms ease,
      box-shadow 300ms ease,
      border-color 300ms ease;
    will-change: transform;
  }

  .page.active {
    opacity: 1;
    border-color: color-mix(in srgb, var(--foreground) 22%, var(--border));
    box-shadow: 0 4px 10px rgba(20, 20, 22, 0.08), 0 38px 70px -34px rgba(20, 20, 22, 0.55);
  }

  .page:hover {
    border-color: color-mix(in srgb, var(--foreground) 32%, var(--border));
  }

  .page:focus-visible {
    outline: 2px solid var(--punch);
    outline-offset: 3px;
  }

  .page img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 1024 / 711;
    object-fit: cover;
    object-position: top center;
    background: #f2eee5;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.75rem 0.6rem;
    border-top: 1px solid var(--border);
    background: var(--card);
  }

  .name {
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }

  .kind {
    margin-left: auto;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.55rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted-foreground);
    white-space: nowrap;
  }

  :global(.meta-arrow) {
    width: 13px;
    height: 13px;
    color: var(--punch);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    margin-top: 0.35rem;
  }

  .steppers {
    display: flex;
    gap: 0.35rem;
  }

  .round {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
    transition:
      border-color 160ms ease,
      color 160ms ease,
      background-color 160ms ease;
  }

  .round:hover {
    border-color: var(--foreground);
    color: var(--foreground);
  }

  .round:focus-visible {
    outline: 2px solid var(--punch);
    outline-offset: 2px;
  }

  :global(.control-icon) {
    width: 15px;
    height: 15px;
  }

  @media (min-width: 48rem) {
    .sites-showcase {
      padding-inline: 2.5rem;
      padding-block: 4rem;
    }

    .stage {
      --card-w: min(46vw, 520px);
      height: calc(var(--card-w) * 0.694 + 110px);
      margin-top: 2rem;
    }
  }

  @media (max-width: 47.99rem) {
    .intro {
      flex-direction: column;
      align-items: flex-start;
      gap: 1.1rem;
    }

    .text-link {
      align-self: flex-start;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .page,
    .text-link,
    .round {
      transition: none;
    }
  }
</style>
