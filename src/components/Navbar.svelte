<script lang="ts">
  import Button, { buttonVariants } from '@/lib/components/ui/button.svelte';
  import Logo from './Logo.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import { cn } from '@/lib/utils';
  import type { User } from '@/types/auth';

  type Props = {
    user: User | null;
    onLogin: () => void;
    onLogout: () => void;
  };

  let { user, onLogin, onLogout }: Props = $props();
  const here = window.location.pathname.replace(/\/+$/, '') || '/';
</script>

<header class="navbar-header">
  <div
    class="navbar-container"
  >
    <a
      href="/"
      class="navbar-logo-link"
      aria-label="quickqr.app home"
    >
      <Logo wordmarkClass="navbar-wordmark" />
    </a>

    <div class="navbar-actions">
      <nav class="navbar-site-nav" aria-label="Site">
        <a
          href="/#pricing"
          class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'navbar-nav-link')}
        >
          Pricing
        </a>
      </nav>
      <ThemeToggle />
      <nav class="navbar-account-nav" aria-label="Account">
      {#if user}
        <a
          href="/dashboard"
          data-testid="dashboard-link"
          aria-current={here === '/dashboard' ? 'page' : undefined}
          class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'navbar-nav-link')}
        >
          Dashboard
        </a>
        <span class="navbar-user-email" title={user.email}>
          {user.email}
        </span>
        <Button variant="outline" size="sm" class="navbar-btn-logout" onclick={onLogout}>
          Log out
        </Button>
      {:else}
        <Button
          variant="outline"
          size="sm"
          class="navbar-btn-login"
          onclick={onLogin}
        >
          Log in
        </Button>
      {/if}
      </nav>
    </div>
  </div>
</header>

<style>
  @layer components {
    .navbar-header {
      position: sticky;
      top: 0;
      z-index: 40;
      border-bottom: 1px solid rgb(0 0 0 / 0.05);
      background-color: color-mix(in oklab, var(--background) 85%, transparent);
      backdrop-filter: blur(12px);
    }

    .navbar-container {
      margin-left: auto;
      margin-right: auto;
      display: flex;
      height: 3.5rem;
      max-width: 1120px;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding-left: 1rem;
      padding-right: 1rem;
    }

    .navbar-logo-link {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      border-radius: calc(var(--radius) * 1.4);
      padding-top: 0.25rem;
      padding-bottom: 0.25rem;
      text-align: left;
      color: var(--foreground);
      transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .navbar-actions {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: 0.25rem;
    }

    .navbar-site-nav {
      display: none;
      flex-shrink: 0;
      align-items: center;
    }

    .navbar-account-nav {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: 0.25rem;
    }

    .navbar-nav-link {
      font-size: 15px;
      font-weight: 500;
    }

    .navbar-user-email {
      display: none;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      color: var(--muted-foreground);
    }

    :global(.navbar-btn-logout) {
      font-size: 15px;
      font-weight: 500;
    }

  }

  :global(.navbar-btn-login) {
    height: 2rem;
    border-color: rgb(0 0 0 / 0.1);
    background-color: var(--card);
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    font-size: 15px;
    font-weight: 500;
    box-shadow: 0 8px 20px -16px rgba(17, 17, 19, 0.8);
  }


  /* unlayered: states, dark, responsive that must win over utilities */
  .navbar-logo-link:hover {
    opacity: 0.8;
  }

  :global(.dark) .navbar-header {
    border-color: rgb(255 255 255 / 0.1);
  }

  :global(.dark) :global(.navbar-btn-login) {
    border-color: rgb(255 255 255 / 0.15);
  }

  @media (min-width: 40rem) {
    .navbar-container {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }

    .navbar-actions {
      gap: 0.5rem;
    }

    .navbar-account-nav {
      gap: 0.5rem;
    }

    .navbar-site-nav {
      display: flex;
    }

    .navbar-user-email {
      display: inline;
    }
  }

  @media (min-width: 48rem) {
    .navbar-container {
      padding-left: 2.5rem;
      padding-right: 2.5rem;
    }
  }

  :global(.navbar-wordmark) {
    display: none;
  }

  @media (min-width: 360px) {
    :global(.navbar-wordmark) {
      display: inline;
    }
  }
</style>
