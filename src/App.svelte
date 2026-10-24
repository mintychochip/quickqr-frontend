<script lang="ts">
  import Navbar from './components/Navbar.svelte';
  import Generator from './components/Generator.svelte';
  import Pricing from './components/Pricing.svelte';
  import DashboardShell from './components/DashboardShell.svelte';
  import DashboardPreview from './components/DashboardPreview.svelte';
  import Footer from './components/Footer.svelte';
  import GiftPage from './components/GiftPage.svelte';
  import LegalPage from './components/LegalPage.svelte';
  import HomeCards from './components/HomeCards.svelte';
  import Logo from './components/Logo.svelte';
  import NotFound from './components/NotFound.svelte';
  import QrEmbedPage from './components/QrEmbedPage.svelte';
  import AuthModal from './components/AuthModal.svelte';
  import Button from './lib/components/ui/button.svelte';
  import { dynamicCodeFromQrPayload, staticDestinationFromQrPayload } from './lib/dynamicQr';
  import { fetchCurrentUser, logoutAccount, consumeAuthTokenFromUrl, setAuthToken } from './lib/auth';
  import type { User } from './types/auth';

  let user = $state<User | null>(null);
  let authOpen = $state(false);
  let authError = $state<string | null>(null);
  let userResolved = $state(false);
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const isHome = path === '/';
  const isDashboard = path === '/dashboard' || path.startsWith('/dashboard/');
  const isQrPage = path === '/qr';
  const isGift = path === '/gift';
  const isPrivacy = path === '/privacy';
  const isTerms = path === '/terms';
  const isLegalPage = isPrivacy || isTerms;
  const compressedCode =
    !isHome && !isDashboard && !isQrPage && !isGift && !isLegalPage
      ? dynamicCodeFromQrPayload(window.location.href)
      : null;
  const staticDestination =
    !isHome && !isDashboard && !isQrPage && !isGift && !isLegalPage && !compressedCode
      ? staticDestinationFromQrPayload(window.location.href)
      : null;
  if (compressedCode) {
    window.location.replace(`/r/${compressedCode}`);
  } else if (staticDestination) {
    window.location.replace(staticDestination);
  }

  $effect(() => {
    if (isQrPage) return;
    const { token, error } = consumeAuthTokenFromUrl();
    if (error) {
      authError = error;
      authOpen = true;
    }
    if (token) {
      setAuthToken(token);
      fetchCurrentUser().then((u) => {
        user = u;
        userResolved = true;
      });
    }
  });

  $effect(() => {
    if (isQrPage) return;
    fetchCurrentUser().then((u) => {
      user = u;
      userResolved = true;
    });
  });

  $effect(() => {
    if (isQrPage) return;
    const onUnauthorized = (): void => {
      user = null;
    };
    window.addEventListener('quickqr:unauthorized', onUnauthorized);
    return () => {
      window.removeEventListener('quickqr:unauthorized', onUnauthorized);
    };
  });

  function openAuth() {
    authError = null;
    authOpen = true;
  }


  async function handleLogout() {
    await logoutAccount();
    user = null;
  }
</script>

{#if compressedCode || staticDestination}
  <p class="app-opening">Opening link…</p>
{:else if isQrPage}
  <QrEmbedPage />
{:else if isGift}
  <GiftPage {user} {userResolved} onSignIn={openAuth} onLogout={handleLogout} />

  <AuthModal
    bind:open={authOpen}
    headline="Sign in to claim your gift"
    externalError={authError}
  />
{:else if isPrivacy}
  <LegalPage kind="privacy" />
{:else if isTerms}
  <LegalPage kind="terms" />
{:else if !isHome && !isDashboard}
  <NotFound />
{:else if isDashboard}
  {#if !userResolved}
    <div class="app-gate">
      <div class="app-gate-stack">
        <div class="app-skel app-skel-title"></div>
        <div class="app-skel app-skel-heading"></div>
        <div class="app-skel app-skel-line"></div>
        <div class="app-skel app-skel-short"></div>
      </div>
    </div>
  {:else if user}
    <DashboardShell {user} onLogout={handleLogout} />
  {:else}
    <div class="app-signin">
      <header class="app-signin-bar">
        <a href="/" class="app-signin-home" aria-label="quickqr.app home">
          <Logo />
        </a>
        <span class="app-signin-kicker">Dashboard</span>
      </header>
      <main class="app-signin-main">
        <div class="app-signin-card">
          <Logo wordmark={false} markClass="app-signin-mark" />
          <h1 class="app-signin-title">Sign in to your dashboard</h1>
          <p class="app-signin-lede">
            Manage destinations, menus, and link pages behind your printed codes.
          </p>
          <Button class="app-signin-submit" onclick={openAuth}>Sign in</Button>
          <a href="/" class="app-signin-back">Back to quickqr.app</a>
        </div>
      </main>
    </div>
  {/if}

  <AuthModal
    bind:open={authOpen}
    externalError={authError}
  />
{:else}
<div class="app-home">
  <Navbar
    {user}
    onLogin={() => openAuth()}
    onLogout={handleLogout}
  />

  <AuthModal
    bind:open={authOpen}
    externalError={authError}
  />

  <main class="app-main">
    <Generator isAuthenticated={user !== null} />

    <HomeCards />

    <DashboardPreview />

    <Pricing />
  </main>

  <Footer />
</div>
{/if}

<style>
  .app-opening {
    padding: 4rem 1.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--muted-foreground);
  }

  .app-gate {
    display: grid;
    min-height: 100dvh;
    place-items: center;
    background-color: var(--background);
    padding-inline: 1.5rem;
  }

  .app-gate-stack {
    display: flex;
    width: 100%;
    max-width: 24rem;
    flex-direction: column;
    gap: 0.75rem;
  }

  .app-skel {
    border-radius: 4px;
    background-color: var(--muted);
    animation: app-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .app-skel-title {
    height: 0.75rem;
    width: 6rem;
  }

  .app-skel-heading {
    height: 2rem;
    width: 12rem;
  }

  .app-skel-line {
    height: 0.75rem;
    width: 100%;
  }

  .app-skel-short {
    height: 0.75rem;
    width: 75%;
  }

  .app-signin {
    display: flex;
    min-height: 100dvh;
    flex-direction: column;
    background-color: var(--background);
  }

  .app-signin-bar {
    display: flex;
    height: 4rem;
    align-items: center;
    justify-content: space-between;
    padding-inline: 1.5rem;
  }

  .app-signin-home {
    display: inline-flex;
    align-items: center;
    border-radius: var(--radius);
    color: var(--foreground);
    transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .app-signin-home:hover {
    opacity: 0.8;
  }

  .app-signin-kicker {
    font-size: 13px;
    color: var(--muted-foreground);
  }

  .app-signin-main {
    display: grid;
    flex: 1;
    place-items: center;
    padding-inline: 1.5rem;
    padding-bottom: 5rem;
  }

  .app-signin-card {
    width: 100%;
    max-width: 24rem;
  }

  .app-signin-title {
    margin-top: 1.25rem;
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.035em;
  }

  .app-signin-lede {
    margin-top: 0.5rem;
    max-width: 20rem;
    font-size: 0.875rem;
    line-height: 1.625;
    color: var(--muted-foreground);
  }

  .app-signin-back {
    display: inline-flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    margin-top: 1rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--muted-foreground);
    transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .app-signin-back:hover {
    color: var(--foreground);
  }

  .app-home {
    display: flex;
    min-height: 100vh;
    flex-direction: column;
  }

  .app-main {
    flex: 1;
  }

  :global(.app-signin-mark) {
    width: 2.75rem;
    height: 2.75rem;
  }

  :global(.app-signin-submit) {
    margin-top: 1.5rem;
    height: 2.5rem;
    width: 100%;
  }

  @media (min-width: 40rem) {
    .app-signin-bar {
      padding-inline: 2.5rem;
    }
  }

  @keyframes app-pulse {
    50% {
      opacity: 0.5;
    }
  }
</style>

