<script lang="ts">
  import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
  import Button from '@/lib/components/ui/button.svelte';
  import Card from '@/lib/components/ui/card.svelte';

  type Props = {
    /** Inside a dialog: no page-height centering and no card chrome; the dialog is the surface. */
    compact?: boolean;
    /** The id the dialog names itself by; the page gate leaves it unset. */
    titleId?: string;
  };

  let { compact = false, titleId = undefined }: Props = $props();
</script>

<section data-testid="menus-gate" class="menus-gate" class:menus-gate-compact={compact}>
  <Card class="menus-gate-card">
    <span class="menus-gate-mark" aria-hidden="true">
      <UtensilsCrossed class="menus-gate-mark-icon" />
    </span>
    <h1 id={titleId} class="menus-gate-title">Menus are a Pro feature</h1>
    <p class="menus-gate-copy">
      Build a hosted menu behind a printed code and change it whenever you like. The code on the table stays the same.
    </p>
    <p class="menus-gate-note">
      Pro isn't on sale yet. A menu you already made keeps working.
    </p>
    <Button href="/#pricing" class="menus-gate-cta">See the plans</Button>
  </Card>
</section>

<style>
  @layer components {
    .menus-gate {
      display: flex;
      min-height: calc(100dvh - 10rem);
      align-items: center;
      justify-content: center;
      padding-block: 1rem;
    }

    .menus-gate-compact {
      min-height: 0;
      padding-block: 0;
    }

    :global(.menus-gate-card) {
      display: flex;
      width: 100%;
      max-width: 34rem;
      flex-direction: column;
      align-items: center;
      gap: 0.875rem;
      padding: 1.75rem 1.5rem;
      text-align: center;
    }

    :global(.menus-gate-compact .menus-gate-card) {
      border: 0;
      background-color: transparent;
      padding: 0;
      box-shadow: none;
    }

    .menus-gate-mark {
      display: grid;
      width: 3rem;
      height: 3rem;
      place-items: center;
      border-radius: 999px;
      background-color: color-mix(in oklab, var(--punch) 24%, var(--card));
      color: var(--ink);
    }

    :global(.dark) .menus-gate-mark {
      background-color: color-mix(in oklab, var(--punch) 16%, var(--card));
      color: var(--punch);
    }

    :global(.menus-gate-mark-icon) {
      width: 1.25rem;
      height: 1.25rem;
    }

    .menus-gate-title {
      font-size: 1.375rem;
      line-height: 1.9rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--foreground);
      text-wrap: balance;
    }

    .menus-gate-copy {
      max-width: 28rem;
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--muted-foreground);
      text-wrap: pretty;
    }

    .menus-gate-note {
      font-size: 13px;
      line-height: 1.5;
      color: var(--muted-foreground);
    }

    :global(.menus-gate-cta) {
      margin-top: 0.5rem;
    }
  }
</style>
