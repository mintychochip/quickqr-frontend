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

<section id="preview" class="px-6 py-16 sm:py-20 md:px-10">
  <div class="mx-auto max-w-[1120px]">
    <div class="mx-auto mb-10 max-w-lg text-center md:text-left">
      <h2 class="qq-section-title">Scan redirect preview</h2>
      <p class="mt-3 text-base leading-relaxed text-muted-foreground">
        A short sponsor screen funds free dynamic codes—then visitors continue to your URL.
      </p>
    </div>

    <div class="flex flex-col items-center">
      <div class="w-[320px] sm:w-[360px]">
        <Card class="flex min-h-[440px] flex-col p-5">
          <div class="mt-auto text-lg font-semibold leading-tight tracking-[-0.03em]">Table 4 Menu</div>
          <div class="mt-1 break-all font-mono text-[11px] leading-snug text-muted-foreground">
            https://cafe.example.com/menu
          </div>

          <p class="mt-3 text-[13px] text-muted-foreground" aria-live="polite">
            {#if seconds > 0}
              Redirecting in <strong class="font-semibold tabular-nums text-foreground">{seconds}s</strong>
            {:else}
              <span class="inline-flex items-center gap-1 font-medium text-foreground">
                <Check class="h-3 w-3" /> Redirecting
              </span>
            {/if}
          </p>

          <div class="mb-auto mt-6 border-t border-border pt-5">
            {#if sponsor}
              <div class="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span class="text-[9px] font-semibold uppercase tracking-[0.08em]">{sponsor.badge}</span>
                <span aria-hidden="true">·</span>
                <span class="inline-flex items-center gap-1.5 font-medium">
                  <span
                    class="grid h-5 w-5 place-items-center rounded-md bg-muted text-[10px] font-semibold text-foreground"
                    aria-hidden="true">{sponsor.logo_url}</span
                  >{sponsor.brand_name}
                </span>
              </div>
              <div class="text-[15px] font-semibold leading-snug tracking-[-0.02em]">{sponsor.headline}</div>
              <div class="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{sponsor.tagline}</div>
              <a
                class="mt-1 inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold underline underline-offset-[3px]"
                href={sponsor.target_url}
                target="_blank"
                rel="noopener sponsored"
              >
                {sponsor.cta} ↗
              </a>
            {:else}
              <div class="mb-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                How it stays free
              </div>
              <div class="text-[15px] font-semibold leading-snug tracking-[-0.02em]">A short pause. No subscription.</div>
              <div class="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                Sponsor messages keep dynamic redirects free. Your printed code never expires.
              </div>
            {/if}
          </div>
          <Button
            type="button"
            variant="outline"
            class="mt-6 h-11 w-full text-[13px] font-medium"
            onclick={() => (seconds = 0)}
          >
            Skip redirect now
          </Button>
        </Card>
      </div>

      <div class="mt-6 flex items-center gap-3">
        <Button type="button" class="bg-punch text-ink hover:bg-punch/80" onclick={restartCountdown}>
          <Play class="h-3 w-3" />
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
          <RotateCcw class="h-3 w-3" />
          Reset
        </Button>
      </div>
    </div>
  </div>
</section>
