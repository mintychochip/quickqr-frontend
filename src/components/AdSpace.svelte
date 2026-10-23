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
      class="adspace-topbar"
    >
      <div class="adspace-topbar-inner">
        <div class="adspace-topbar-brand">
          <Badge variant="outline" class="adspace-badge-outline">{sponsor.badge}</Badge>
          <span class="adspace-topbar-text">
            {sponsor.brand_name} — {sponsor.headline}
          </span>
        </div>
        <a
          href={sponsor.target_url}
          target="_blank"
          rel="noopener sponsored"
          class="adspace-topbar-cta"
        >
          <span>{sponsor.cta}</span>
          <ExternalLink class="adspace-icon" />
        </a>
      </div>
    </aside>
  {:else if variant === 'native-card'}
    <aside aria-label="Featured Sponsor" data-slot-id={slotId}>
      <Card class="adspace-card-native">
        <div class="adspace-native-header">
          <Badge variant="secondary" class="adspace-badge-secondary">{sponsor.badge}</Badge>
        </div>
        <div class="adspace-native-body">
          <div class="adspace-logo-box">
            {sponsor.logo_url}
          </div>
          <div class="adspace-native-content">
            <h4 class="adspace-headline">{sponsor.headline}</h4>
            <p class="adspace-tagline">{sponsor.tagline}</p>
            <a
              href={sponsor.target_url}
              target="_blank"
              rel="noopener sponsored"
              class="adspace-native-cta"
            >
              <span>{sponsor.cta}</span>
              <ExternalLink class="adspace-icon" />
            </a>
          </div>
        </div>
      </Card>
    </aside>
  {:else}
    <aside
      aria-label="Sponsored Banner"
      class="adspace-leaderboard"
    >
      <Card class="adspace-card-leaderboard">
        <div class="adspace-leader-brand">
          <div class="adspace-logo-box-sm">
            {sponsor.logo_url}
          </div>
          <div class="adspace-leader-info">
            <div class="adspace-sponsor-row">
              <span class="adspace-sponsor-label">Sponsor</span>
              <span class="adspace-brand-name">{sponsor.brand_name}</span>
            </div>
            <div class="adspace-leader-headline">{sponsor.headline}</div>
          </div>
        </div>
        <div class="adspace-leader-actions">
          <Button size="sm" href={sponsor.target_url} target="_blank" rel="noopener sponsored">
            {sponsor.cta}
            <ExternalLink class="adspace-icon" />
          </Button>
          <a
            href="mailto:sponsor@quickqr2.app"
            class="adspace-sponsor-slot"
          >
            Sponsor this slot
          </a>
        </div>
      </Card>
    </aside>
  {/if}
{/if}

<style>

  @layer components {
    .adspace-topbar {
      border-bottom: 1px solid var(--border);
      background-color: color-mix(in oklab, var(--background) 90%, transparent);
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
      font-size: 0.75rem;
      line-height: 1rem;
      backdrop-filter: blur(4px);
    }

    .adspace-topbar-inner {
      margin-left: auto;
      margin-right: auto;
      max-width: 1120px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }

    .adspace-topbar-brand {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 0.5rem;
      flex: 1 1 0%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .adspace-topbar-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 500;
      color: var(--muted-foreground);
    }

    .adspace-topbar-cta {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: 0.25rem;
      font-size: 12px;
      font-weight: 500;
      color: var(--primary);
    }

    :global(.adspace-card-native) {
      padding: 1.5rem;
    }

    .adspace-native-header {
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .adspace-native-body {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
    }

    .adspace-logo-box {
      display: flex;
      width: 2.5rem;
      height: 2.5rem;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: calc(var(--radius) * 1.4);
      border: 1px solid var(--border);
      background-color: var(--muted);
      font-size: 1.125rem;
    }

    .adspace-logo-box-sm {
      display: flex;
      width: 2.25rem;
      height: 2.25rem;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: calc(var(--radius) * 1.4);
      border: 1px solid var(--border);
      background-color: var(--muted);
      font-size: 1.125rem;
    }

    .adspace-native-content {
      min-width: 0;
      flex: 1 1 0%;
    }

    .adspace-headline {
      margin-bottom: 0.125rem;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.25;
    }

    .adspace-tagline {
      margin-bottom: 0.75rem;
      font-size: 13px;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .adspace-native-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 13px;
      font-weight: 500;
      color: var(--primary);
    }

    .adspace-leaderboard {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    :global(.adspace-card-leaderboard) {
      display: flex;
      width: 100%;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem;
    }

    .adspace-leader-brand {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 0.875rem;
      text-align: center;
    }

    .adspace-leader-info {
      min-width: 0;
    }

    .adspace-sponsor-row {
      margin-bottom: 0.125rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .adspace-sponsor-label {
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted-foreground);
    }

    .adspace-brand-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 500;
    }

    .adspace-leader-headline {
      max-width: 28rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      color: var(--muted-foreground);
    }

    .adspace-leader-actions {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: 0.75rem;
    }

    .adspace-sponsor-slot {
      font-size: 12px;
      color: var(--muted-foreground);
    }

    :global(.adspace-badge-outline),
    :global(.adspace-badge-secondary) {
      font-size: 10px;
      text-transform: uppercase;
    }
  }

  /* unlayered wins: hovers, responsive */
  .adspace-topbar-cta:hover {
    color: color-mix(in oklab, var(--primary) 80%, transparent);
  }

  .adspace-native-cta:hover {
    color: color-mix(in oklab, var(--primary) 80%, transparent);
  }

  .adspace-sponsor-slot:hover {
    color: var(--foreground);
  }

  @media (min-width: 40rem) {
    .adspace-leaderboard {
      flex-direction: row;
    }

    :global(.adspace-card-leaderboard) {
      flex-direction: row;
      padding: 1.25rem;
    }

    .adspace-leader-brand {
      text-align: left;
    }

    .adspace-sponsor-row {
      justify-content: flex-start;
    }

    .adspace-leader-headline {
      max-width: 28rem;
    }
  }

  :global(.adspace-icon) {
    width: 0.75rem;
    height: 0.75rem;
  }
</style>
