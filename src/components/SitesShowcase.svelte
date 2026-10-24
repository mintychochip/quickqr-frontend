<script lang="ts">
  import { onMount } from 'svelte';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
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
  let tabsEl = $state<HTMLDivElement>();

  const paused = $derived(userPaused || hovered);
  const current = $derived(sites[active] ?? sites[0]);
  const liveUrl = (code: string): string => `https://sites.quickqr.app/${code}/`;

  onMount(() => {
    motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  $effect(() => {
    const container = tabsEl;
    const tab = container?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!container || !tab) return;
    container.scrollTo({
      left: Math.max(0, tab.offsetLeft - container.offsetLeft - 8),
      behavior: motionOk ? 'smooth' : 'auto',
    });
  });

  $effect(() => {
    if (!motionOk || paused) return;
    const timer = window.setTimeout(() => {
      active = (active + 1) % sites.length;
    }, 6000);
    return () => window.clearTimeout(timer);
  });

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
    <div class="copy">
      <p class="eyebrow"><span aria-hidden="true"></span>Hosted sites</p>
      <h2 id="sites-showcase-title" class="qq-section-title">A whole site,<br>behind one code.</h2>
      <p class="lede">Real sites, hosted on quickqr. Pick one to look around.</p>

      <div class="actions">
        <Button href={liveUrl(current.code)} target="_blank" rel="noreferrer">
          Visit {current.name}
          <ArrowUpRight class="icon" aria-hidden="true" />
        </Button>
        <a class="text-link" href="/dashboard/sites">
          Open Sites
          <ArrowUpRight class="icon" aria-hidden="true" />
        </a>
      </div>

      <div class="carousel" data-testid="sites-carousel">
        <div class="carousel-head">
          <div class="tabs" bind:this={tabsEl} role="group" aria-label="Sites to preview">
            {#each sites as site, index (site.code)}
              <button
                type="button"
                class="tab"
                class:active={index === active}
                data-tab={index}
                aria-pressed={index === active}
                onclick={() => (active = index)}
              >
                <span class="num">0{index + 1}</span>
                <span class="name">{site.name}</span>
                <span class="kind">{site.kind}</span>
              </button>
            {/each}
          </div>

          {#if motionOk}
            <button
              type="button"
              class="pause"
              aria-label={userPaused ? 'Resume the site carousel' : 'Pause the site carousel'}
              onclick={() => (userPaused = !userPaused)}
            >
              {#if userPaused}
                <Play class="pause-icon" aria-hidden="true" />
                <span>Play</span>
              {:else}
                <Pause class="pause-icon" aria-hidden="true" />
                <span>Pause</span>
              {/if}
            </button>
          {/if}
        </div>
      </div>
    </div>

    <a
      class="frame"
      href={liveUrl(current.code)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${current.name}, a ${current.kind} site hosted on quickqr, in a new tab`}
    >
      <div class="frame-bar" aria-hidden="true">
        <span class="dots"><i></i><i></i><i></i></span>
        <span class="url">sites.quickqr.app/{current.code}</span>
        <span class="live"><i></i>Live</span>
      </div>
      <div class="shots">
        {#each sites as site, index (site.code)}
          <img
            class:on={index === active}
            src={site.image}
            alt={index === active ? site.alt : ''}
            aria-hidden={index !== active}
            width="1024"
            height="711"
            loading="eager"
            decoding="async"
          />
        {/each}
      </div>
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

  .carousel {
    margin-top: 1.6rem;
  }

  .carousel-head {
    display: flex;
    align-items: stretch;
    gap: 0.4rem;
  }

  .tabs {
    position: relative;
    display: flex;
    flex: 1;
    gap: 0.35rem;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
    scroll-snap-type: x proximity;
  }

  .tabs::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: grid;
    flex: 0 0 auto;
    min-width: 8.6rem;
    gap: 1px;
    padding: 0.55rem 0.7rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 0.9);
    background: transparent;
    color: var(--muted-foreground);
    text-align: left;
    cursor: pointer;
    scroll-snap-align: start;
    transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
  }

  .tab:hover {
    border-color: color-mix(in srgb, var(--foreground) 30%, var(--border));
    color: var(--foreground);
  }

  .tab.active {
    border-color: color-mix(in srgb, var(--foreground) 45%, var(--border));
    background: var(--card);
    color: var(--foreground);
  }

  .num {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.55rem;
    letter-spacing: 0.08em;
    color: var(--punch);
  }

  .name {
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }

  .kind {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.55rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .pause {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.3rem;
    padding: 0 0.55rem;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 0.9);
    background: transparent;
    color: var(--muted-foreground);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.55rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 160ms ease, color 160ms ease;
  }

  .pause:hover {
    border-color: var(--foreground);
    color: var(--foreground);
  }

  :global(.pause-icon) {
    width: 11px;
    height: 11px;
  }

  .frame {
    display: block;
    min-width: 0;
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
    min-width: 0;
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

  .shots {
    position: relative;
    aspect-ratio: 1024 / 711;
    background: #f2eee5;
  }

  .shots img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 450ms ease;
  }

  .shots img.on {
    opacity: 1;
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

  @media (max-width: 26rem) {
    .pause span {
      display: none;
    }

    .pause {
      padding-inline: 0.45rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .frame,
    .text-link,
    .tab,
    .pause {
      transition: none;
    }

    .frame:hover {
      transform: none;
    }

    .shots img {
      transition: none;
    }
  }
</style>
