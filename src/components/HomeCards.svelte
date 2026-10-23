<script lang="ts">
  import Card from '@/lib/components/ui/card.svelte';
  import { onMount } from 'svelte';

  const SCAN_TOTAL = 128;

  let sectionEl: HTMLElement | undefined = $state();
  let live = $state(false);
  let motionOk = $state(false);
  let scans = $state(SCAN_TOTAL);

  onMount(() => {
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      // The CSS animations are behind a no-preference query, so this only settles the count.
      live = true;
      return;
    }
    motionOk = true;
    const el = sectionEl;
    if (!el) {
      live = true;
      return;
    }
    // Already on screen: start in this frame, so the cards never show their settled state first.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      live = true;
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          live = true;
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (!live || !motionOk) return;
    scans = 0;
    const start = performance.now();
    const delay = 420;
    const duration = 900;
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(Math.max((now - start - delay) / duration, 0), 1);
      scans = Math.round(SCAN_TOTAL * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  });
</script>

<section
  bind:this={sectionEl}
  class="hc-section"
  class:qq-live={live}
  data-testid="home-cards"
  aria-label="How quickqr.app stays free"
>
  <div class="hc-grid">
    <Card class="qq-card" style="--d: 0ms">
      <svg viewBox="0 0 320 168" class="hc-svg" role="img" aria-label="A black card with a small QR and a lime mark">
        <defs>
          <clipPath id="qq-home-plate-clip">
            <rect x="18" y="18" width="132" height="132" rx="28" />
          </clipPath>
        </defs>
        <rect width="320" height="168" rx="22" fill="var(--secondary)" />
        <rect class="qq-plate" style="--d: 200ms" x="18" y="18" width="132" height="132" rx="28" fill="var(--ink)" />
        <g clip-path="url(#qq-home-plate-clip)">
          <rect class="qq-mod" style="--i: 0" x="36" y="36" width="34" height="34" rx="8" fill="#f7f7f5" />
          <rect class="qq-mod" style="--i: 1" x="44" y="44" width="18" height="18" rx="4" fill="#111113" />
          <rect class="qq-mod qq-pupil" style="--i: 2" x="49" y="49" width="8" height="8" rx="2" fill="#d7ff3c" />
          <rect class="qq-mod" style="--i: 3" x="78" y="36" width="14" height="14" rx="4" fill="#f7f7f5" />
          <rect class="qq-mod" style="--i: 4" x="98" y="36" width="14" height="14" rx="4" fill="#d7ff3c" />
          <rect class="qq-mod" style="--i: 5" x="118" y="36" width="14" height="14" rx="4" fill="#f7f7f5" />
          <rect class="qq-mod" style="--i: 6" x="78" y="56" width="14" height="14" rx="4" fill="#f7f7f5" />
          <rect class="qq-mod" style="--i: 7" x="118" y="56" width="14" height="14" rx="4" fill="#f7f7f5" />
          <rect class="qq-mod" style="--i: 8" x="36" y="78" width="14" height="14" rx="4" fill="#f7f7f5" />
          <rect class="qq-mod" style="--i: 9" x="56" y="78" width="14" height="14" rx="4" fill="#d7ff3c" />
          <rect class="qq-mod" style="--i: 10" x="78" y="78" width="34" height="14" rx="4" fill="#f7f7f5" />
          <rect class="qq-mod" style="--i: 11" x="118" y="78" width="14" height="14" rx="4" fill="#f7f7f5" />
          <rect class="qq-mod" style="--i: 12" x="36" y="98" width="14" height="14" rx="4" fill="#f7f7f5" />
          <rect class="qq-mod" style="--i: 13" x="56" y="98" width="14" height="14" rx="4" fill="#f7f7f5" />
          <rect class="qq-mod" style="--i: 14" x="98" y="98" width="14" height="14" rx="4" fill="#d7ff3c" />
          <rect class="qq-mod" style="--i: 15" x="118" y="118" width="14" height="14" rx="4" fill="#f7f7f5" />
          <rect class="qq-mod" style="--i: 16" x="36" y="118" width="34" height="14" rx="7" fill="#d7ff3c" />
          <rect class="qq-sweep" x="18" y="14" width="132" height="4" rx="2" fill="#d7ff3c" />
        </g>
        <text class="qq-line" style="--d: 1050ms" x="176" y="78" fill="var(--foreground)" font-family="Geist Variable, ui-sans-serif, sans-serif" font-size="22" font-weight="600" letter-spacing="-0.8">$0</text>
        <text class="qq-line" style="--d: 1150ms" x="176" y="104" fill="var(--muted-foreground)" font-family="Geist Variable, ui-sans-serif, sans-serif" font-size="13">every month</text>
      </svg>
      <div class="hc-caption">
        <h2 class="qq-copy hc-h2" style="--d: 1250ms">Free QR codes forever</h2>
        <p class="qq-copy hc-p" style="--d: 1350ms">
          Print it once. The code stays live without a trial clock or a monthly bill.
        </p>
      </div>
    </Card>

    <Card class="qq-card" style="--d: 90ms">
      <svg viewBox="0 0 320 168" class="hc-svg" role="img" aria-label="A printed code beside a destination you can edit">
        <defs>
          <clipPath id="qq-home-url-clip">
            <rect class="qq-type" style="--d: 1550ms" x="220" y="84" width="56" height="22" />
          </clipPath>
        </defs>
        <rect width="320" height="168" rx="22" fill="var(--secondary)" />
        <g class="qq-print" style="--d: 140ms">
          <rect x="18" y="28" width="118" height="112" rx="24" fill="#ffffff" stroke="#e6e6ea" />
          <rect class="qq-mod" style="--i: 0" x="34" y="44" width="28" height="28" rx="6" fill="#111113" />
          <rect class="qq-mod" style="--i: 1" x="40" y="50" width="16" height="16" rx="3" fill="#ffffff" />
          <rect class="qq-mod" style="--i: 2" x="45" y="55" width="6" height="6" rx="1.5" fill="#111113" />
          <rect class="qq-mod" style="--i: 3" x="70" y="44" width="10" height="10" rx="2" fill="#111113" />
          <rect class="qq-mod" style="--i: 4" x="84" y="44" width="10" height="10" rx="2" fill="#111113" />
          <rect class="qq-mod" style="--i: 5" x="98" y="44" width="10" height="10" rx="2" fill="#d7ff3c" />
          <rect class="qq-mod" style="--i: 6" x="70" y="58" width="10" height="10" rx="2" fill="#111113" />
          <rect class="qq-mod" style="--i: 7" x="98" y="58" width="10" height="10" rx="2" fill="#111113" />
          <rect class="qq-bar" style="--i: 0" x="34" y="80" width="50" height="8" rx="4" fill="#e6e6ea" />
          <rect class="qq-bar" style="--i: 1" x="34" y="96" width="74" height="8" rx="4" fill="#111113" />
          <rect class="qq-bar" style="--i: 2" x="34" y="112" width="40" height="8" rx="4" fill="#e6e6ea" />
        </g>
        <path class="qq-draw" style="--d: 760ms" d="M156 84h28" pathLength="100" stroke="#d7ff3c" stroke-width="4" stroke-linecap="round" />
        <path class="qq-draw" style="--d: 1020ms" d="M176 74l12 10-12 10" pathLength="100" stroke="var(--foreground)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        <g class="qq-chip" style="--d: 1080ms">
          <rect x="196" y="46" width="106" height="76" rx="18" fill="#111113" />
          <text class="qq-line" style="--d: 1250ms" x="210" y="74" fill="#ffffff" fill-opacity="0.55" font-family="Geist Mono Variable, ui-monospace, monospace" font-size="10">/r/menu</text>
          <rect class="qq-pill" style="--d: 1330ms" x="210" y="86" width="76" height="18" rx="9" fill="#d7ff3c" />
          <text class="qq-line" style="--d: 1520ms" clip-path="url(#qq-home-url-clip)" x="220" y="99" fill="#111113" font-family="Geist Mono Variable, ui-monospace, monospace" font-size="10">new url</text>
        </g>
      </svg>
      <div class="hc-caption">
        <h2 class="qq-copy hc-h2" style="--d: 1750ms">Change it after you print</h2>
        <p class="qq-copy hc-p" style="--d: 1850ms">
          The symbol on the menu stays. The destination behind it does not have to.
        </p>
      </div>
    </Card>

    <Card class="qq-card" style="--d: 180ms">
      <svg viewBox="0 0 320 168" class="hc-svg" role="img" aria-label="A scan chart in lime on a black card">
        <rect width="320" height="168" rx="22" fill="var(--secondary)" />
        <rect class="qq-plate" style="--d: 300ms" x="18" y="18" width="284" height="132" rx="28" fill="#111113" />
        <text class="qq-line" style="--d: 430ms" x="36" y="46" fill="#ffffff" fill-opacity="0.55" font-family="Geist Variable, ui-sans-serif, sans-serif" font-size="11" letter-spacing="1.4">SCANS</text>
        <text class="qq-line" style="--d: 470ms" data-testid="home-scans" x="36" y="74" fill="#d7ff3c" font-family="Geist Variable, ui-sans-serif, sans-serif" font-size="28" font-weight="600" letter-spacing="-1">{scans}</text>
        <path class="qq-area" style="--d: 940ms" d="M150 112c18-8 28-28 46-30 16-2 22 16 40 12 14-3 22-22 40-28V124H150Z" fill="#d7ff3c" fill-opacity="0.18" />
        <path class="qq-draw" style="--d: 620ms" d="M150 112c18-8 28-28 46-30 16-2 22 16 40 12 14-3 22-22 40-28" pathLength="100" stroke="#d7ff3c" stroke-width="4" stroke-linecap="round" fill="none" />
        <circle class="qq-halo" cx="196" cy="82" r="5" fill="none" stroke="#d7ff3c" stroke-width="2" />
        <circle class="qq-dot" style="--d: 990ms" cx="196" cy="82" r="5" fill="#d7ff3c" />
        <circle class="qq-dot" style="--d: 1480ms" cx="276" cy="66" r="5" fill="#ffffff" />
      </svg>
      <div class="hc-caption">
        <h2 class="qq-copy hc-h2" style="--d: 1250ms">See who scanned</h2>
        <p class="qq-copy hc-p" style="--d: 1350ms">
          Counts and device mix sit next to the code, without a separate analytics plan.
        </p>
      </div>
    </Card>
  </div>
</section>

<style>
  /* The illustrations build themselves once, the first time the section is on screen. */
  .qq-plate,
  .qq-mod,
  .qq-dot,
  .qq-pill {
    transform-box: fill-box;
    transform-origin: center;
  }

  .qq-print,
  .qq-chip {
    transform-box: view-box;
  }

  .qq-print {
    transform-origin: 77px 84px;
  }

  .qq-chip {
    transform-origin: 249px 84px;
  }

  .qq-bar,
  .qq-type {
    transform-box: fill-box;
    transform-origin: left center;
  }

  .qq-halo {
    opacity: 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    /* Held back until the section is on screen; each animation fills its own delay. */
    :global(.qq-card),
    .qq-copy,
    .qq-line,
    .qq-mod,
    .qq-dot,
    .qq-pill,
    .qq-plate,
    .qq-print,
    .qq-chip,
    .qq-area {
      opacity: 0;
    }

    .qq-bar,
    .qq-type {
      transform: scaleX(0);
    }

    .qq-draw {
      stroke-dasharray: 100;
      stroke-dashoffset: 100;
    }

    .qq-live :global(.qq-card) {
      animation: qq-rise 560ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
      animation-delay: var(--d, 0ms);
    }

    .qq-live .qq-copy {
      animation: qq-rise 520ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
      animation-delay: var(--d, 0ms);
    }

    .qq-live .qq-plate,
    .qq-live .qq-print,
    .qq-live .qq-chip {
      animation: qq-settle 460ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
      animation-delay: var(--d, 0ms);
    }

    .qq-live .qq-mod {
      animation: qq-pop 380ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
      animation-delay: calc(var(--i, 0) * 30ms + 260ms);
    }

    .qq-live .qq-pupil {
      animation:
        qq-pop 380ms cubic-bezier(0.22, 0.61, 0.36, 1) both,
        qq-throb 2600ms ease-in-out infinite;
      animation-delay: calc(var(--i, 0) * 30ms + 260ms), 1600ms;
    }

    .qq-live .qq-bar {
      animation: qq-grow 420ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
      animation-delay: calc(var(--i, 0) * 110ms + 480ms);
    }

    .qq-live .qq-sweep {
      animation: qq-sweep 950ms cubic-bezier(0.45, 0, 0.55, 1) both;
      animation-delay: 880ms;
    }

    .qq-live .qq-draw {
      animation: qq-draw 460ms ease-out both;
      animation-delay: var(--d, 0ms);
    }

    .qq-live .qq-line {
      animation: qq-rise 500ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
      animation-delay: var(--d, 0ms);
    }

    .qq-live .qq-area {
      animation: qq-fade 700ms ease-out both;
      animation-delay: var(--d, 0ms);
    }

    .qq-live .qq-dot {
      animation: qq-pop 420ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
      animation-delay: var(--d, 0ms);
    }

    .qq-live .qq-halo {
      animation: qq-ping 2600ms ease-out infinite;
      animation-delay: 1100ms;
    }

    .qq-live .qq-pill {
      animation: qq-pop 440ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
      animation-delay: var(--d, 0ms);
    }

    .qq-live .qq-type {
      animation: qq-grow 520ms steps(7, jump-start) both;
      animation-delay: var(--d, 0ms);
    }

    @keyframes qq-rise {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes qq-settle {
      from {
        opacity: 0;
        transform: scale(0.94);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes qq-pop {
      from {
        opacity: 0;
        transform: scale(0.5);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes qq-grow {
      from {
        transform: scaleX(0);
      }
      to {
        transform: scaleX(1);
      }
    }

    @keyframes qq-draw {
      from {
        stroke-dashoffset: 100;
      }
      to {
        stroke-dashoffset: 0;
      }
    }

    @keyframes qq-fade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes qq-sweep {
      from {
        opacity: 0;
        transform: translateY(0);
      }
      12% {
        opacity: 0.7;
      }
      82% {
        opacity: 0.7;
      }
      to {
        opacity: 0;
        transform: translateY(136px);
      }
    }

    @keyframes qq-throb {
      0%,
      100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.22);
      }
    }

    @keyframes qq-ping {
      from {
        opacity: 0.7;
        transform: scale(0.6);
      }
      to {
        opacity: 0;
        transform: scale(2.4);
      }
    }
  }
  @layer components {
    .hc-section {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
      padding-bottom: 1.5rem;
    }

    .hc-grid {
      margin-inline: auto;
      display: grid;
      max-width: 1120px;
      gap: 0.75rem;
    }

    .hc-svg {
      height: auto;
      width: 100%;
    }

    .hc-caption {
      padding-left: 0.75rem;
      padding-right: 0.75rem;
      padding-top: 0.75rem;
      padding-bottom: 0.5rem;
    }

    .hc-h2 {
      font-size: 1rem;
      line-height: 1.5rem;
      font-weight: 500;
      letter-spacing: -0.03em;
    }

    .hc-p {
      margin-top: 0.25rem;
      font-size: 0.875rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }
  }

  @media (min-width: 48rem) {
    .hc-section {
      padding-left: 2.5rem;
      padding-right: 2.5rem;
    }

    .hc-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
