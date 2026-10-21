<script lang="ts">
  import Button from '@/lib/components/ui/button.svelte';
  import Alert from '@/lib/components/ui/alert.svelte';
  import AlertDescription from '@/lib/components/ui/alert-description.svelte';
  import Logo from './Logo.svelte';
  import X from '@lucide/svelte/icons/x';
  import {
    fetchOAuthProviders,
    startOAuthSignIn,
    startDevOAuthSignIn,
    type OAuthProviders,
  } from '@/lib/auth';

  type Props = {
    /** The title, which also names the dialog it sits in. */
    headline?: string;
    externalError?: string | null;
    onCancel?: () => void;
    /** Runs when a provider is chosen, just before the browser leaves for it. */
    onBeforeOAuth?: () => void;
  };

  let {
    headline = 'Sign in',
    externalError = null,
    onCancel,
    onBeforeOAuth,
  }: Props = $props();

  let oauthProviders = $state<OAuthProviders>({ google: false, github: false, dev: false });
  /** Until the server has answered, an empty list means "not yet", not "none". */
  let providersLoaded = $state(false);

  $effect(() => {
    fetchOAuthProviders().then((p) => {
      oauthProviders = p;
      providersLoaded = true;
    });
  });

  function beginOAuth(provider: 'google' | 'github') {
    onBeforeOAuth?.();
    if (oauthProviders[provider]) {
      startOAuthSignIn(provider);
      return;
    }
    startDevOAuthSignIn(provider);
  }

  const realOAuth = $derived(oauthProviders.google || oauthProviders.github);
  const showSocial = $derived(realOAuth || oauthProviders.dev);
</script>

<div class="relative px-6 py-6 sm:px-7 sm:py-7">
  {#if onCancel}
    <button
      type="button"
      class="absolute top-4 right-4 grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="Close"
      onclick={onCancel}
    >
      <X class="size-4" />
    </button>
  {/if}

  <div class="mb-6 pr-8">
    <Logo wordmark={false} markClass="size-9" class="mb-4" />
    <h2 id="auth-dialog-title" class="text-[28px] font-semibold leading-none tracking-[-0.045em] text-balance">
      {headline}
    </h2>
    <p class="mt-2 max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
      Free QR codes forever. An account lets you change the destination after you print.
    </p>
  </div>

  {#if externalError}
    <Alert variant="destructive" class="mb-4">
      <AlertDescription>{externalError}</AlertDescription>
    </Alert>
  {/if}

  {#if showSocial}
    <div class="flex flex-col gap-2">
      {#if oauthProviders.google || oauthProviders.dev}
        <Button
          type="button"
          variant="outline"
          class="h-11 w-full justify-center gap-2 rounded-xl bg-card font-medium"
          onclick={() => beginOAuth('google')}
        >
          <svg class="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>
      {/if}
      {#if oauthProviders.github || oauthProviders.dev}
        <Button
          type="button"
          variant="outline"
          class="h-11 w-full justify-center gap-2 rounded-xl bg-card font-medium"
          onclick={() => beginOAuth('github')}
        >
          <svg class="size-4 shrink-0 text-foreground" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.395-.135-.345-.72-1.395-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.855 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
            />
          </svg>
          Continue with GitHub
        </Button>
      {/if}
      {#if oauthProviders.dev && !realOAuth}
        <p class="px-1 text-center text-[12px] leading-relaxed text-muted-foreground">
          Local sign-in until Google and GitHub keys are added.
        </p>
      {/if}
    </div>
  {/if}

  {#if providersLoaded && !showSocial}
    <p class="text-sm leading-relaxed text-muted-foreground">Sign-in isn't available on this server.</p>
  {/if}
</div>
