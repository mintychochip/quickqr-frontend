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

<header class="sticky top-0 z-40 border-b border-black/5 bg-background/85 backdrop-blur-md dark:border-white/10">
  <div
    class="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-2 px-4 sm:px-6 md:px-10"
  >
    <a
      href="/"
      class="inline-flex shrink-0 items-center rounded-xl py-1 text-left text-foreground transition-opacity hover:opacity-80"
      aria-label="quickqr.app home"
    >
      <Logo wordmarkClass="hidden min-[360px]:inline" />
    </a>

    <div class="flex shrink-0 items-center gap-1 sm:gap-2">
      <ThemeToggle />
      <nav class="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Account">
      {#if user}
        <a
          href="/dashboard"
          data-testid="dashboard-link"
          aria-current={here === '/dashboard' ? 'page' : undefined}
          class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-[15px] font-medium')}
        >
          Dashboard
        </a>
        <span class="hidden max-w-[140px] truncate text-[13px] text-muted-foreground sm:inline" title={user.email}>
          {user.email}
        </span>
        <Button variant="outline" size="sm" class="text-[15px] font-medium" onclick={onLogout}>
          Log out
        </Button>
      {:else}
        <Button
          variant="outline"
          size="sm"
          class="h-8 border-black/10 bg-card px-3 text-[15px] font-medium shadow-[0_8px_20px_-16px_rgba(17,17,19,0.8)] dark:border-white/15"
          onclick={onLogin}
        >
          Log in
        </Button>
      {/if}
      </nav>
    </div>
  </div>
</header>
