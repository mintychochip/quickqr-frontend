<script lang="ts">
  import Play from '@lucide/svelte/icons/play';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Check from '@lucide/svelte/icons/check';
  import type { Sponsor } from '../types';
  import { fetchActiveSponsor } from '../lib/api';
  import Button from '@/lib/components/ui/button.svelte';
  import Card from '@/lib/components/ui/card.svelte';

  let seconds = $state(3);
  let isRunning = $state(false);
  let sponsor = $state<Sponsor | null>(null);

  $effect(() => {
    fetchActiveSponsor().then((sp) => {
      if (sp) sponsor = sp;
    });
  });

  $effect(() => {
    if (!isRunning || seconds <= 0) return;
    const interval = setInterval(() => {
      seconds -= 1;
    }, 1000);
    return () => clearInterval(interval);
  });

  $effect(() => {
    if (seconds === 0) isRunning = false;
  });

  function restartCountdown() {
    seconds = 3;
    isRunning = true;
  }
</script>

<section id="preview" class="interstitial-section">
  <div class="interstitial-shell">
    <div class="interstitial-header">
      <h2 class="qq-section-title">Scan redirect preview</h2>
      <p class="interstitial-lede">
        A short sponsor screen funds free dynamic codes—then visitors continue to your URL.
      </p>
    </div>

    <div class="interstitial-preview-wrap">
      <div class="interstitial-frame-wrap">
        <Card class="interstitial-card">
          <div class="interstitial-card-title">Table 4 Menu</div>
          <div class="interstitial-card-url font-mono">
            https://cafe.example.com/menu
          </div>

          <p class="interstitial-countdown" aria-live="polite">
            {#if seconds > 0}
              Redirecting in <strong class="interstitial-seconds">{seconds}s</strong>
            {:else}
              <span class="interstitial-redirecting">
                <Check class="interstitial-check-icon" /> Redirecting
              </span>
            {/if}
          </p>

          <div class="interstitial-sponsor-area">
            {#if sponsor}
              <div class="interstitial-sponsor-header">
                <span class="interstitial-badge">{sponsor.badge}</span>
                <span aria-hidden="true">·</span>
                <span class="interstitial-brand">
                  <span
                    class="interstitial-logo-emoji"
                    aria-hidden="true">{sponsor.logo_url}</span
                  >{sponsor.brand_name}
                </span>
              </div>
              <div class="interstitial-sponsor-headline">{sponsor.headline}</div>
              <div class="interstitial-sponsor-tagline">{sponsor.tagline}</div>
              <a
                class="interstitial-sponsor-cta"
                href={sponsor.target_url}
                target="_blank"
                rel="noopener sponsored"
              >
                {sponsor.cta} ↗
              </a>
            {:else}
              <div class="interstitial-howfree">
                How it stays free
              </div>
              <div class="interstitial-howfree-headline">A short pause. No subscription.</div>
              <div class="interstitial-howfree-body">
                Sponsor messages keep dynamic redirects free. Your printed code never expires.
              </div>
            {/if}
          </div>
          <Button
            type="button"
            variant="outline"
            class="interstitial-skip-btn"
            onclick={() => (seconds = 0)}
          >
            Skip redirect now
          </Button>
        </Card>
      </div>

      <div class="interstitial-controls">
        <Button type="button" class="interstitial-play-btn" onclick={restartCountdown}>
          <Play class="interstitial-play-icon" />
          Simulate 3s redirect
        </Button>
        <Button
          type="button"
          variant="outline"
          onclick={() => {
            seconds = 3;
            isRunning = false;
          }}
        >
          <RotateCcw class="interstitial-reset-icon" />
          Reset
        </Button>
      </div>
    </div>
  </div>
</section>

<style>

  @layer components {
    .interstitial-section {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
      padding-top: 4rem;
      padding-bottom: 4rem;
    }

    .interstitial-shell {
      margin-left: auto;
      margin-right: auto;
      max-width: 1120px;
    }

    .interstitial-header {
      margin-left: auto;
      margin-right: auto;
      max-width: 32rem;
      margin-bottom: 2.5rem;
      text-align: center;
    }

    .interstitial-lede {
      margin-top: 0.75rem;
      font-size: 1rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .interstitial-preview-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .interstitial-frame-wrap {
      width: 320px;
    }

    :global(.interstitial-card) {
      display: flex;
      min-height: 440px;
      flex-direction: column;
      padding: 1.25rem;
    }

    .interstitial-card-title {
      margin-top: auto;
      font-size: 1.125rem;
      font-weight: 600;
      line-height: 1.25;
      letter-spacing: -0.03em;
    }

    .interstitial-card-url {
      margin-top: 0.25rem;
      font-size: 11px;
      line-height: 1.25;
      color: var(--muted-foreground);
      word-break: break-all;
    }

    .interstitial-countdown {
      margin-top: 0.75rem;
      font-size: 13px;
      color: var(--muted-foreground);
    }

    .interstitial-seconds {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--foreground);
    }

    .interstitial-redirecting {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 500;
      color: var(--foreground);
    }

    .interstitial-sponsor-area {
      margin-top: auto;
      margin-bottom: auto;
      border-top: 1px solid var(--border);
      padding-top: 1.25rem;
    }

    .interstitial-sponsor-header {
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 11px;
      color: var(--muted-foreground);
    }

    .interstitial-badge {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .interstitial-brand {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-weight: 500;
    }

    .interstitial-logo-emoji {
      display: grid;
      width: 1.25rem;
      height: 1.25rem;
      place-items: center;
      border-radius: calc(var(--radius) * 0.8);
      background-color: var(--muted);
      font-size: 10px;
      font-weight: 600;
      color: var(--foreground);
    }

    .interstitial-sponsor-headline {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }

    .interstitial-sponsor-tagline {
      margin-top: 0.125rem;
      font-size: 13px;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .interstitial-sponsor-cta {
      margin-top: 0.25rem;
      display: inline-flex;
      min-height: 2.25rem;
      align-items: center;
      gap: 0.25rem;
      font-size: 13px;
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .interstitial-howfree {
      margin-bottom: 0.5rem;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted-foreground);
    }

    .interstitial-howfree-headline {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }

    .interstitial-howfree-body {
      margin-top: 0.125rem;
      font-size: 13px;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    :global(.interstitial-skip-btn) {
      margin-top: 1.5rem;
      height: 2.75rem;
      width: 100%;
      font-size: 13px;
      font-weight: 500;
    }

    .interstitial-controls {
      margin-top: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    :global(.interstitial-play-btn) {
      background-color: var(--punch);
      color: var(--ink);
    }

    :global(.interstitial-play-icon),
    :global(.interstitial-reset-icon) {
      width: 0.75rem;
      height: 0.75rem;
    }

    :global(.interstitial-check-icon) {
      width: 0.75rem;
      height: 0.75rem;
    }
  }

  /* unlayered to win: hover, animate, responsive */
  :global(.interstitial-play-btn:hover) {
    background-color: color-mix(in oklab, var(--punch) 80%, transparent);
  }

  .interstitial-section {
    @media (min-width: 40rem) {
      padding-top: 5rem;
      padding-bottom: 5rem;
    }
    @media (min-width: 48rem) {
      padding-left: 2.5rem;
      padding-right: 2.5rem;
    }
  }

  .interstitial-header {
    @media (min-width: 48rem) {
      text-align: left;
    }
  }

  .interstitial-frame-wrap {
    @media (min-width: 40rem) {
      width: 360px;
    }
  }

  @keyframes interstitial-pulse {
    50% {
      opacity: 0.5;
    }
  }

  :global(.interstitial-loading) {
    position: absolute;
    inset: 0;
    z-index: 10;
    background-color: var(--muted);
    animation: interstitial-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

    :global(.interstitial-card) {
    position: relative;
  }
</style>
