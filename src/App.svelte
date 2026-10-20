<script lang="ts">
  import Navbar from './components/Navbar.svelte';
  import AdSpace from './components/AdSpace.svelte';
  import Generator from './components/Generator.svelte';
  import InterstitialPreview from './components/InterstitialPreview.svelte';
  import DashboardShell from './components/DashboardShell.svelte';
  import Footer from './components/Footer.svelte';
  import HomeCards from './components/HomeCards.svelte';
  import Logo from './components/Logo.svelte';
  import NotFound from './components/NotFound.svelte';
  import AuthModal from './components/AuthModal.svelte';
  import Button from './lib/components/ui/button.svelte';
  import { fetchActiveSponsor } from './lib/api';
  import { dynamicCodeFromQrPayload, staticDestinationFromQrPayload } from './lib/dynamicQr';
  import { fetchCurrentUser, logoutAccount, consumeAuthTokenFromUrl, setAuthToken } from './lib/auth';
  import type { Sponsor } from './types';
  import type { User } from './types/auth';

  let activeSponsor = $state<Sponsor | null>(null);
  let user = $state<User | null>(null);
  let authOpen = $state(false);
  let authError = $state<string | null>(null);
  let userResolved = $state(false);
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const isHome = path === '/';
  const isDashboard = path === '/dashboard' || path.startsWith('/dashboard/');
  const compressedCode = !isHome && !isDashboard ? dynamicCodeFromQrPayload(window.location.href) : null;
  const staticDestination =
    !isHome && !isDashboard && !compressedCode
      ? staticDestinationFromQrPayload(window.location.href)
      : null;
  if (compressedCode) {
    window.location.replace(`/r/${compressedCode}`);
  } else if (staticDestination) {
    window.location.replace(staticDestination);
  }

  $effect(() => {
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
    fetchActiveSponsor().then((s) => {
      activeSponsor = s;
    });
    fetchCurrentUser().then((u) => {
      user = u;
      userResolved = true;
    });
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
  <p class="px-6 py-16 text-sm text-muted-foreground">Opening link…</p>
{:else if !isHome && !isDashboard}
  <NotFound />
{:else if isDashboard}
  {#if !userResolved}
    <div class="grid min-h-dvh place-items-center bg-background px-6">
      <div class="w-full max-w-sm space-y-3">
        <div class="h-3 w-24 animate-pulse rounded bg-muted"></div>
        <div class="h-8 w-48 animate-pulse rounded bg-muted"></div>
        <div class="h-3 w-full animate-pulse rounded bg-muted"></div>
        <div class="h-3 w-3/4 animate-pulse rounded bg-muted"></div>
      </div>
    </div>
  {:else if user}
    <DashboardShell {user} sponsor={activeSponsor} onLogout={handleLogout} />
  {:else}
    <div class="flex min-h-dvh flex-col bg-background">
      <header class="flex h-16 items-center justify-between px-6 sm:px-10">
        <a
          href="/"
          class="inline-flex items-center rounded-lg text-foreground transition-opacity hover:opacity-80"
          aria-label="quickqr.app home"
        >
          <Logo />
        </a>
        <span class="text-[13px] text-muted-foreground">Dashboard</span>
      </header>
      <main class="grid flex-1 place-items-center px-6 pb-20">
        <div class="w-full max-w-sm">
          <Logo wordmark={false} markClass="size-11" />
          <h1 class="mt-5 text-[26px] font-semibold tracking-[-0.035em]">
            Sign in to your dashboard
          </h1>
          <p class="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Manage destinations, menus, and link pages behind your printed codes.
          </p>
          <Button class="mt-6 h-10 w-full" onclick={openAuth}>Sign in</Button>
          <a
            href="/"
            class="mt-4 inline-flex w-full items-center justify-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to quickqr.app
          </a>
        </div>
      </main>
    </div>
  {/if}

  <AuthModal
    bind:open={authOpen}
    externalError={authError}
  />
{:else}
<div class="flex min-h-screen flex-col">
  <AdSpace variant="top-bar" sponsor={activeSponsor} />
  <Navbar
    {user}
    onLogin={() => openAuth()}
    onLogout={handleLogout}
  />

  <AuthModal
    bind:open={authOpen}
    externalError={authError}
  />

  <main class="flex-1">
    <Generator
      isAuthenticated={user !== null}
      authExternalError={authError}
    />

    <HomeCards />

    {#if activeSponsor}
      <div class="qq-shell my-4">
        <AdSpace variant="leaderboard" sponsor={activeSponsor} slotId="homepage-middle-banner" />
      </div>
    {/if}

    <InterstitialPreview />
  </main>

  <Footer />
</div>
{/if}
