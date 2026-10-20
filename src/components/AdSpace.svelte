<script lang="ts">
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import type { Sponsor } from '../types';
  import Badge from '@/lib/components/ui/badge.svelte';
  import Button from '@/lib/components/ui/button.svelte';
  import Card from '@/lib/components/ui/card.svelte';

  type Props = {
    sponsor: Sponsor | null | undefined;
    variant?: 'leaderboard' | 'native-card' | 'top-bar';
    slotId?: string;
  };

  let { sponsor, variant = 'leaderboard', slotId = 'main-sponsor-slot' }: Props = $props();
</script>

{#if sponsor}
  {#if variant === 'top-bar'}
    <aside
      aria-label="Sponsor Notice"
      class="border-b border-border bg-background/90 py-2 text-xs backdrop-blur-sm"
    >
      <div class="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-6 md:px-10">
        <div class="flex min-w-0 items-center gap-2 truncate">
          <Badge variant="outline" class="shrink-0 text-[10px] uppercase">{sponsor.badge}</Badge>
          <span class="truncate text-[12px] font-medium text-muted-foreground">
            {sponsor.brand_name} — {sponsor.headline}
          </span>
        </div>
        <a
          href={sponsor.target_url}
          target="_blank"
          rel="noopener sponsored"
          class="flex shrink-0 items-center gap-1 text-[12px] font-medium text-primary hover:text-primary/80"
        >
          <span>{sponsor.cta}</span>
          <ExternalLink class="size-3" />
        </a>
      </div>
    </aside>
  {:else if variant === 'native-card'}
    <aside aria-label="Featured Sponsor" data-slot-id={slotId}>
      <Card class="p-6">
        <div class="mb-3 flex items-center justify-between">
          <Badge variant="secondary" class="text-[10px] uppercase">{sponsor.badge}</Badge>
        </div>
        <div class="flex items-start gap-3.5">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-lg"
          >
            {sponsor.logo_url}
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="mb-0.5 text-[13px] font-medium leading-snug">{sponsor.headline}</h4>
            <p class="mb-3 text-[13px] leading-relaxed text-muted-foreground">{sponsor.tagline}</p>
            <a
              href={sponsor.target_url}
              target="_blank"
              rel="noopener sponsored"
              class="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:text-primary/80"
            >
              <span>{sponsor.cta}</span>
              <ExternalLink class="size-3" />
            </a>
          </div>
        </div>
      </Card>
    </aside>
  {:else}
    <aside
      aria-label="Sponsored Banner"
      class="flex flex-col items-center justify-between gap-4 sm:flex-row"
    >
      <Card class="flex w-full flex-col items-center justify-between gap-4 p-4 sm:flex-row sm:p-5">
        <div class="flex min-w-0 items-center gap-3.5 text-center sm:text-left">
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-lg"
          >
            {sponsor.logo_url}
          </div>
          <div class="min-w-0">
            <div class="mb-0.5 flex items-center justify-center gap-2 sm:justify-start">
              <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Sponsor
              </span>
              <span class="truncate text-[13px] font-medium">{sponsor.brand_name}</span>
            </div>
            <div class="max-w-md truncate text-[13px] text-muted-foreground">{sponsor.headline}</div>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-3">
          <Button size="sm" href={sponsor.target_url} target="_blank" rel="noopener sponsored">
            {sponsor.cta}
            <ExternalLink class="size-3" />
          </Button>
          <a
            href="mailto:sponsor@quickqr2.app"
            class="text-[12px] text-muted-foreground hover:text-foreground"
          >
            Sponsor this slot
          </a>
        </div>
      </Card>
    </aside>
  {/if}
{/if}
