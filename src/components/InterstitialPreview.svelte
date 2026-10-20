<script lang="ts">
  import Play from '@lucide/svelte/icons/play';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Check from '@lucide/svelte/icons/check';
  import type { Sponsor } from '../types';
  import { fetchActiveSponsor } from '../lib/api';
  import Button from '@/lib/components/ui/button.svelte';
  import Badge from '@/lib/components/ui/badge.svelte';
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
      <Card class="w-[320px] p-5 sm:w-[360px]">
        <div class="rounded-2xl bg-ink p-4 text-center text-primary-foreground">
          <div class="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-punch">quickqr redirect</div>
          <div class="text-sm font-medium tracking-[-0.02em]">Table 4 Menu</div>
          <div class="mt-0.5 truncate font-mono text-[10px] text-white/55">
            https://cafe.example.com/menu
          </div>

          <div class="mt-3 mb-1.5 h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div
              class="h-full bg-punch transition-all duration-1000 ease-linear"
              style:width="{((3 - seconds) / 3) * 100}%"
            ></div>
          </div>

          <div class="flex items-center justify-between px-1 text-[10px] text-white/60">
            <span>
              {#if seconds > 0}
                Redirecting in <strong class="text-white">{seconds}s</strong>
              {:else}
                <span class="flex items-center justify-center gap-1 font-medium text-punch">
                  <Check class="h-3 w-3" /> Redirecting
                </span>
              {/if}
            </span>
            <button
              type="button"
              onclick={() => (seconds = 0)}
              class="cursor-pointer font-medium text-punch hover:text-white"
            >
              Skip →
            </button>
          </div>
        </div>

        {#if sponsor}
          <div class="mt-3 rounded-lg border border-border p-4 text-left">
            <div class="mb-1.5 flex items-center justify-between">
              <Badge variant="secondary" class="text-[9px] uppercase">{sponsor.badge}</Badge>
              <span class="text-[11px] text-muted-foreground">
                {sponsor.logo_url} {sponsor.brand_name}
              </span>
            </div>
            <div class="mb-0.5 text-xs font-medium leading-snug">{sponsor.headline}</div>
            <div class="mb-3 text-[11px] leading-relaxed text-muted-foreground">{sponsor.tagline}</div>
            <Button size="sm" class="w-full text-[11px]" href={sponsor.target_url} target="_blank" rel="noopener sponsored">
              {sponsor.cta} →
            </Button>
          </div>
        {:else}
          <div
            class="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground"
          >
            Optional sponsor message appears here on scan.
          </div>
        {/if}
      </Card>

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
