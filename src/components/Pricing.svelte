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

    <Card class="plans">
      {#each PLANS as plan (plan.id)}
        <article data-testid="plan-{plan.id}" aria-labelledby="plan-{plan.id}-name" class="plan">
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
                {money(monthlyEquivalent(plan.price))} a month, billed yearly ({monthsFree(plan.price)} months free)
              {:else}
                or {money(plan.price.yearly)} a year ({monthsFree(plan.price)} months free)
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
      {/each}
    </Card>

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

  :global(.plans) {
    display: grid;
    gap: 0;
    padding-block: 0;
    grid-template-columns: minmax(0, 1fr);
  }

  .plan {
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
  }

  .plan + .plan {
    border-top: 1px solid var(--border);
  }

  .plan-name {
    font-size: 0.875rem;
    line-height: calc(1.25 / 0.875);
    font-weight: 500;
    color: var(--foreground);
  }

  .plan-tagline {
    margin-top: 0.25rem;
    font-size: 13px;
    color: var(--muted-foreground);
  }

  .plan-price {
    display: flex;
    align-items: baseline;
    gap: 0.375rem;
    margin-top: 1.5rem;
  }

  .amount {
    font-size: 2.25rem;
    line-height: calc(2.5 / 2.25);
    font-weight: 500;
    letter-spacing: -0.04em;
    color: var(--foreground);
  }

  .per {
    font-size: 0.875rem;
    line-height: calc(1.25 / 0.875);
    color: var(--muted-foreground);
  }

  .plan-period {
    margin-top: 0.25rem;
    font-size: 13px;
    color: var(--muted-foreground);
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
    color: var(--muted-foreground);
  }

  .features {
    margin-top: 1.5rem;
    font-size: 13px;
    line-height: 1.375;
    color: var(--foreground);
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
    padding-inline: 1rem;
  }

  :global(.check) {
    flex-shrink: 0;
    width: 0.875rem;
    height: 0.875rem;
    margin-top: 1px;
    color: var(--muted-foreground);
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

    :global(.plans) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .plan + .plan {
      border-top: 0;
      border-left: 1px solid var(--border);
    }

    .pledge {
      margin-inline: 0;
      text-align: left;
    }
  }
</style>
