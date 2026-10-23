<script lang="ts">
  import Alert from '@/lib/components/ui/alert.svelte';
  import AlertDescription from '@/lib/components/ui/alert-description.svelte';
  import Button from '@/lib/components/ui/button.svelte';
  import { redeemGift } from '@/lib/api';
  import { forgetGiftToken, openGiftToken } from '@/lib/gift';
  import { formatDay } from '@/lib/plan';
  import { PLANS, PLEDGE } from '@/lib/pricing';
  import type { User } from '@/types/auth';
  import type { GiftClaimed } from '@/types/gift';
  import Logo from './Logo.svelte';

  type Props = {
    user: User | null;
    /** False until the app has asked the server who is signed in. */
    userResolved: boolean;
    onSignIn: () => void;
    onLogout: () => void;
  };

  let { user, userResolved, onSignIn, onLogout }: Props = $props();

  // The token leaves the address bar as soon as this page opens (see lib/gift.ts).
  let token = $state(openGiftToken());
  /** Set once the server has answered: the plan that was added, or null for a link that does not work. */
  let answered = $state<{ claim: GiftClaimed | null } | null>(null);
  let claiming = $state(false);
  let failure = $state('');

  const planName = $derived(PLANS.find((plan) => plan.id === answered?.claim?.plan)?.name ?? 'Your plan');

  $effect(() => {
    document.title = 'Your gift · quickqr.app';
  });

  // A session that ended while this page was open makes the failure it caused stale once someone signs in again.
  $effect(() => {
    if (!user) failure = '';
  });

  // Pasting another gift link into this tab changes only the fragment, so the page is not reloaded: pick the new token up.
  $effect(() => {
    const onHashChange = (): void => {
      const next = openGiftToken();
      if (next === token) return;
      token = next;
      answered = null;
      failure = '';
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  });

  async function claim(): Promise<void> {
    if (!token || claiming) return;
    claiming = true;
    failure = '';
    try {
      const claimed = await redeemGift(token);
      // Claimed or refused, the token cannot do anything more: forget it so a reload does not try it again.
      forgetGiftToken();
      token = null;
      answered = { claim: claimed };
    } catch (err: unknown) {
      failure = err instanceof Error ? err.message : 'Failed to claim the gift';
    } finally {
      claiming = false;
    }
  }
</script>

<div data-testid="gift-page" class="gift-page">
  <header class="gift-header">
    <a href="/" class="gift-home-link" aria-label="quickqr.app home">
      <Logo />
    </a>
  </header>

  <main class="gift-main">
    <div class="gift-content" aria-live="polite">
      {#if answered?.claim}
        <h1 data-testid="gift-result" class="gift-headline">
          {#if answered.claim.granted}
            {planName} is yours until {formatDay(answered.claim.until)}.
          {:else}
            You already have this gift.
          {/if}
        </h1>
        <p class="gift-desc">
          {#if answered.claim.granted}
            Scans of your codes go straight to the destination while it lasts, with no sponsor screen.
          {:else}
            {planName} is on your account until {formatDay(answered.claim.until)}. Scans of your codes go straight to the destination until then.
          {/if}
        </p>
        <p class="gift-desc">{PLEDGE}</p>
        <Button href="/dashboard" class="gift-action-btn">Go to your dashboard</Button>
        <a href="/" class="gift-back-link">
          Back to quickqr.app
        </a>
      {:else if answered}
        <h1 data-testid="gift-invalid" class="gift-headline">This gift link doesn’t work.</h1>
        <p class="gift-desc">
          It may have expired, been used up, or been turned off. Ask whoever sent it for a new one.
        </p>
        <Button href="/" variant="outline" class="gift-action-btn">Back to quickqr.app</Button>
      {:else if !userResolved}
        <div class="gift-skel-wrap" aria-hidden="true">
          <div class="gift-skel gift-skel-h8"></div>
          <div class="gift-skel gift-skel-h3"></div>
          <div class="gift-skel gift-skel-h3w34"></div>
        </div>
      {:else if !token}
        <h1 data-testid="gift-incomplete" class="gift-headline">This gift link is incomplete.</h1>
        <p class="gift-desc">
          This address has no gift in it. Open the link you were sent again, or ask whoever sent it to send it once more.
        </p>
        <Button href="/" variant="outline" class="gift-action-btn">Back to quickqr.app</Button>
      {:else if !user}
        <h1 class="gift-headline">You have a gift.</h1>
        <p class="gift-desc">
          Sign in to add it to your account. Nothing is claimed until you press Claim on the next screen.
        </p>
        <Button data-testid="gift-sign-in" class="gift-action-btn" onclick={onSignIn}>Sign in to claim</Button>
      {:else}
        <h1 class="gift-headline">Claim your gift</h1>
        <p class="gift-desc">
          It will be added to <span data-testid="gift-account" class="gift-account-email">{user.email}</span>.
        </p>
        {#if failure}
          <Alert variant="destructive" class="gift-failure-alert">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        {/if}
        <Button data-testid="gift-claim" class="gift-action-btn" disabled={claiming} onclick={claim}>
          {claiming ? 'Claiming…' : failure ? 'Try again' : 'Claim gift'}
        </Button>
        <p class="gift-signout-p">
          Not you?
          <button
            type="button"
            data-testid="gift-sign-out"
            class="gift-signout"
            onclick={onLogout}
          >
            Sign out
          </button>
        </p>
      {/if}
    </div>
  </main>
</div>

<style>
  @keyframes giftpage-pulse {
    50% {
      opacity: 0.5;
    }
  }

  @layer components {
    .gift-page {
      display: flex;
      min-height: 100dvh;
      flex-direction: column;
      background-color: var(--background);
      color: var(--foreground);
    }

    .gift-header {
      margin-left: auto;
      margin-right: auto;
      display: flex;
      height: 3.5rem;
      width: 100%;
      max-width: 1120px;
      align-items: center;
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }

    .gift-home-link {
      display: inline-flex;
      align-items: center;
      border-radius: calc(var(--radius) * 1.4);
      padding-top: 0.25rem;
      padding-bottom: 0.25rem;
    }

    .gift-main {
      display: grid;
      flex: 1;
      place-items: center;
      padding-left: 1.5rem;
      padding-right: 1.5rem;
      padding-bottom: 6rem;
    }

    .gift-content {
      width: 100%;
      max-width: 24rem;
    }

    .gift-headline {
      font-size: 26px;
      line-height: 1.25;
      font-weight: 600;
      letter-spacing: -0.035em;
    }

    .gift-desc {
      margin-top: 0.75rem;
      font-size: 0.875rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .gift-skel-wrap > * + * {
      margin-top: 0.75rem;
    }

    .gift-skel {
      animation: giftpage-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      border-radius: 0.25rem;
      background-color: var(--muted);
    }

    .gift-skel-h8 {
      height: 2rem;
      width: 12rem;
    }

    .gift-skel-h3 {
      height: 0.75rem;
      width: 100%;
    }

    .gift-skel-h3w34 {
      height: 0.75rem;
      width: 75%;
    }

    .gift-signout-p {
      margin-top: 1rem;
      text-align: center;
      font-size: 0.875rem;
      line-height: 1.25rem;
      color: var(--muted-foreground);
    }

    .gift-account-email {
      font-weight: 500;
      word-break: break-all;
      color: var(--foreground);
    }

    .gift-signout {
      cursor: pointer;
      border-radius: calc(var(--radius) * 0.6);
      font-weight: 500;
      color: var(--foreground);
      text-decoration: underline;
      text-underline-offset: 4px;
      outline-style: none;
    }

    :global(.gift-action-btn) {
      margin-top: 1.5rem;
      height: 2.5rem;
      width: 100%;
    }

    :global(.gift-failure-alert) {
      margin-top: 1.25rem;
    }

    :global(.gift-back-link) {
      margin-top: 1rem;
      display: inline-flex;
      width: 100%;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      line-height: 1.25rem;
      color: var(--muted-foreground);
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  .gift-back-link:hover {
    color: var(--foreground);
  }

  .gift-signout:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  @media (min-width: 48rem) {
    .gift-header {
      padding-left: 2.5rem;
      padding-right: 2.5rem;
    }
  }
</style>
