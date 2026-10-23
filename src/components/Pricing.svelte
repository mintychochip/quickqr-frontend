<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import Button from '@/lib/components/ui/button.svelte';
  import Card from '@/lib/components/ui/card.svelte';
  import { PLANS, PLEDGE, money, monthsFree, monthlyEquivalent } from '@/lib/pricing';

  /** Which price the plans show. Monthly by default: it is the cheaper thing to say yes to. */
  let period = $state<'monthly' | 'yearly'>('monthly');
</script>

<section id="pricing" class="pricing" aria-labelledby="pricing-title">
  <div class="shell">
    <div class="head">
      <div class="intro">
        <h2 id="pricing-title" class="qq-section-title">Pricing</h2>
        <p class="lede">
          Sponsors keep the free plan free. If you would rather not show one, that is what paid is for.
        </p>
      </div>

      <div role="group" aria-label="Billing period" class="period">
        <button
          type="button"
          aria-pressed={period === 'monthly'}
          data-testid="period-monthly"
          class="period-button"
          class:is-active={period === 'monthly'}
          onclick={() => (period = 'monthly')}
        >
          Monthly
        </button>
        <button
          type="button"
          aria-pressed={period === 'yearly'}
          data-testid="period-yearly"
          class="period-button"
          class:is-active={period === 'yearly'}
          onclick={() => (period = 'yearly')}
        >
          Annual
        </button>
      </div>
    </div>

    <div class="plans-grid">
      {#each PLANS as plan (plan.id)}
        <Card class="plan-card plan-{plan.id}" data-testid="plan-{plan.id}">
          <article aria-labelledby="plan-{plan.id}-name" class="plan">
            <h3 id="plan-{plan.id}-name" class="plan-name">{plan.name}</h3>
            <p class="plan-tagline">{plan.tagline}</p>

            <p class="plan-price">
              <span class="amount" data-testid="plan-{plan.id}-price">
                {plan.price ? money(period === 'yearly' ? plan.price.yearly : plan.price.monthly) : '$0'}
              </span>
              <span class="per">{plan.price ? (period === 'yearly' ? 'a year' : 'a month') : 'forever'}</span>
            </p>
            <p class="plan-period" data-testid="plan-{plan.id}-period">
              {#if plan.price}
                {#if period === 'yearly'}
                  <span class="period-amount">{money(monthlyEquivalent(plan.price))}</span> a month, billed yearly ({monthsFree(plan.price)} months free)
                {:else}
                  or <span class="period-amount">{money(plan.price.yearly)}</span> a year ({monthsFree(plan.price)} months free)
                {/if}
              {:else}
                No card, no trial clock.
              {/if}
            </p>

            <div class="plan-action">
              {#if plan.live}
                <Button href="#generator" size="lg" class="live-cta">Make a free code</Button>
              {:else}
                <span class="soon">Coming soon</span>
              {/if}
            </div>

            <ul class="features">
              {#each plan.features as feature (feature)}
                <li class="feature">
                  <Check class="check" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              {/each}
            </ul>
          </article>
        </Card>
      {/each}
    </div>

    <p class="pledge">{PLEDGE}</p>
  </div>
</section>

<style>
  /* App components own their styles, scoped, outside any layer: they sit above the primitives' `components`
     layer, so a class handed to a primitive is written `:global(.it)` here and wins. */
  .pricing {
    padding-block: 4rem;
    padding-inline: 1.5rem;
  }

  .shell {
    margin-inline: auto;
    max-width: 1120px;
  }

  .head {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 2.5rem;
  }

  .intro {
    margin-inline: auto;
    max-width: 32rem;
    text-align: center;
  }

  .lede {
    margin-top: 0.75rem;
    font-size: 1rem;
    line-height: 1.625;
    color: var(--muted-foreground);
  }

  .period {
    display: inline-flex;
    flex-shrink: 0;
    align-self: center;
    padding: 0.125rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background-color: var(--card);
  }

  .period-button {
    cursor: pointer;
    padding: 0.375rem 0.75rem;
    border: 0;
    border-radius: calc(var(--radius) * 0.8);
    background-color: transparent;
    color: var(--muted-foreground);
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    transition:
      background-color 150ms cubic-bezier(0.4, 0, 0.2, 1),
      color 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .period-button:hover {
    color: var(--foreground);
  }

  .period-button.is-active {
    background-color: var(--muted);
    color: var(--foreground);
  }

  .plans-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
  }

  :global(.plan-card) {
    --plan-ink: var(--foreground);
    --plan-muted: var(--muted-foreground);
    --plan-accent: var(--foreground);
    --plan-rule: var(--border);
    gap: 0;
    padding: 1.5rem;
  }

  /* Free is plain, Plus is a quiet secondary tint, and Pro is the ink card with the only lime edge. */
  :global(.plan-card.plan-plus) {
    --plan-muted: color-mix(in oklab, var(--foreground) 68%, var(--card));
    background-color: color-mix(in oklab, var(--secondary) 55%, var(--card));
  }

  :global(.dark .plan-card.plan-plus) {
    --plan-muted: var(--muted-foreground);
    background-color: var(--secondary);
  }

  :global(.plan-card.plan-pro) {
    --plan-ink: var(--on-ink);
    --plan-muted: color-mix(in oklab, var(--on-ink) 64%, var(--ink));
    --plan-accent: var(--punch);
    --plan-rule: color-mix(in oklab, var(--on-ink) 16%, transparent);
    border-color: var(--punch);
    background-color: var(--ink);
    color: var(--on-ink);
  }

  .plan {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: var(--plan-ink);
  }

  .plan-name {
    font-size: 0.75rem;
    line-height: 1rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--plan-ink);
  }

  .plan-tagline {
    margin-top: 0.375rem;
    font-size: 13px;
    line-height: 1.5;
    color: var(--plan-muted);
  }

  .plan-price {
    display: flex;
    align-items: baseline;
    gap: 0.375rem;
    margin-top: 1.5rem;
  }

  .amount {
    font-size: 2.5rem;
    line-height: 1.1;
    font-weight: 600;
    letter-spacing: -0.045em;
    color: var(--plan-accent);
    font-variant-numeric: tabular-nums;
  }

  .per {
    font-size: 0.875rem;
    line-height: 1.25;
    color: var(--plan-muted);
  }

  .plan-period {
    margin-top: 0.375rem;
    min-height: 2.5rem;
    font-size: 13px;
    line-height: 1.5;
    color: var(--plan-muted);
  }

  .period-amount {
    font-weight: 600;
    color: var(--plan-accent);
    font-variant-numeric: tabular-nums;
  }

  .plan-action {
    display: flex;
    align-items: center;
    height: 2.25rem;
    margin-top: 1.25rem;
  }

  .soon {
    font-size: 0.875rem;
    line-height: calc(1.25 / 0.875);
    font-weight: 500;
    color: var(--plan-muted);
  }

  .features {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--plan-rule);
    font-size: 13px;
    line-height: 1.375;
    color: var(--plan-ink);
  }

  .feature {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .feature + .feature {
    margin-top: 0.625rem;
  }

  .pledge {
    margin-top: 1.5rem;
    margin-inline: auto;
    max-width: 42rem;
    text-align: center;
    font-size: 0.875rem;
    line-height: 1.625;
    color: var(--muted-foreground);
  }

  /* Classes handed to a primitive: global here, so they land on the primitive's element. */
  :global(.live-cta) {
    width: 100%;
  }

  :global(.check) {
    flex-shrink: 0;
    width: 0.875rem;
    height: 0.875rem;
    margin-top: 1px;
    color: var(--plan-muted);
  }

  @media (min-width: 40rem) {
    .pricing {
      padding-block: 5rem;
    }
  }

  @media (min-width: 48rem) {
    .pricing {
      padding-inline: 2.5rem;
    }

    .head {
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
    }

    .intro {
      margin-inline: 0;
      text-align: left;
    }

    .period {
      align-self: auto;
      margin-inline: 0;
    }

    .pledge {
      margin-inline: 0;
      text-align: left;
    }
  }

  @media (min-width: 64rem) {
    .plans-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
