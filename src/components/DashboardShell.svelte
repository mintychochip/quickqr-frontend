<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Check from '@lucide/svelte/icons/check';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Files from '@lucide/svelte/icons/files';
  import House from '@lucide/svelte/icons/house';
  import Link2 from '@lucide/svelte/icons/link-2';
  import LogOut from '@lucide/svelte/icons/log-out';
  import MenuIcon from '@lucide/svelte/icons/menu';
  import Plus from '@lucide/svelte/icons/plus';
  import ScanLine from '@lucide/svelte/icons/scan-line';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
  import X from '@lucide/svelte/icons/x';
  import { cn } from '@/lib/utils';
  import Badge from '@/lib/components/ui/badge.svelte';
  import Button from '@/lib/components/ui/button.svelte';
  import Dialog from '@/lib/components/ui/dialog.svelte';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/lib/components/ui/dropdown-menu';
  import { fetchLinks } from '../lib/api';
  import { fly } from 'svelte/transition';
  import type { Link, Sponsor } from '../types';
  import type { User } from '../types/auth';
  import type { DetailSelection, SavedLink } from '../types/dashboard';
  import AdSpace from './AdSpace.svelte';
  import CreateDynamicCodePanel from './CreateDynamicCodePanel.svelte';
  import Dashboard from './Dashboard.svelte';
  import LinkPageEditor from './LinkPageEditor.svelte';
  import LinkPagesSection from './LinkPagesSection.svelte';
  import LinkDetailSidebar from './LinkDetailSidebar.svelte';
  import Logo from './Logo.svelte';
  import MenuEditor from './MenuEditor.svelte';
  import MenuScanner from './MenuScanner.svelte';
  import MenusSection from './MenusSection.svelte';
  import ThemeToggle from './ThemeToggle.svelte';

  type Props = {
    user: User;
    sponsor?: Sponsor | null;
    onLogout: () => void;
  };

  let { user, sponsor = null, onLogout }: Props = $props();

  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const menuEditCode = path.startsWith('/dashboard/menus/')
    ? decodeURIComponent(path.slice('/dashboard/menus/'.length))
    : null;
  const pageEditCode = path.startsWith('/dashboard/pages/')
    ? decodeURIComponent(path.slice('/dashboard/pages/'.length))
    : null;

  let scannerOpen = $state(false);
  let navOpen = $state(false);
  let createOpen = $state(false);
  let mobileCreateOpen = $state(false);
  let desktop = $state(window.matchMedia('(min-width: 1024px)').matches);
  let wide = $state(window.matchMedia('(min-width: 1360px)').matches);
  let selectedDetail = $state<DetailSelection | null>(null);
  let dashboardRefresh = $state(0);

  $effect(() => {
    const query = window.matchMedia('(min-width: 1360px)');
    const update = () => (wide = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });

  $effect(() => {
    if (!wide || createOpen) selectedDetail = null;
  });

  function handleDetailSaved(next: SavedLink) {
    if (!selectedDetail) return;
    selectedDetail.onSaved(next);
    selectedDetail = { ...selectedDetail, link: { ...selectedDetail.link, ...next } };
  }

  $effect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => (desktop = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });

  $effect(() => {
    if (desktop && mobileCreateOpen) {
      mobileCreateOpen = false;
      createOpen = true;
    } else if (!desktop && createOpen) {
      createOpen = false;
      mobileCreateOpen = true;
    }
  });

  $effect(() => {
    if (!mobileCreateOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  });

  function openCreate() {
    navOpen = false;
    if (desktop) createOpen = true;
    else mobileCreateOpen = true;
  }

  function closeCreate() {
    createOpen = false;
    mobileCreateOpen = false;
  }

  const initial = $derived(user.email.slice(0, 1).toUpperCase());

  const title =
    path === '/dashboard/menus/new'
      ? 'New menu'
      : path.startsWith('/dashboard/menus/')
        ? 'Edit menu'
        : path.startsWith('/dashboard/menus')
          ? 'Menus'
          : path === '/dashboard/pages/new'
            ? 'New link page'
            : path.startsWith('/dashboard/pages/')
              ? 'Edit link page'
              : path.startsWith('/dashboard/pages')
                ? 'Link pages'
                : 'Dynamic links';

  const items = [
    {
      label: 'Dynamic links',
      href: '/dashboard',
      icon: Link2,
      testId: 'nav-dashboard',
      active: path === '/dashboard',
    },
    {
      label: 'Menus',
      href: '/dashboard/menus',
      icon: UtensilsCrossed,
      testId: 'nav-menus',
      active: path.startsWith('/dashboard/menus'),
    },
    {
      label: 'Link pages',
      href: '/dashboard/pages',
      icon: Files,
      testId: 'nav-pages',
      active: path.startsWith('/dashboard/pages'),
    },
  ];

  let overview = $state<{ links: number; menus: number; pages: number; scans: number } | null>(
    null,
  );
  let overviewState = $state<'loading' | 'ready' | 'error'>('loading');

  $effect(() => {
    let cancelled = false;
    fetchLinks()
      .then((all: Link[]) => {
        if (cancelled) return;
        let links = 0;
        let menus = 0;
        let pages = 0;
        let scans = 0;
        for (const link of all) {
          if (link.kind === 'menu') menus += 1;
          else if (link.kind === 'linkpage') pages += 1;
          else links += 1;
          scans += link.total_scans || 0;
        }
        overview = { links, menus, pages, scans };
        overviewState = 'ready';
      })
      .catch(() => {
        if (!cancelled) overviewState = 'error';
      });
    return () => {
      cancelled = true;
    };
  });

  const overviewRows = $derived([
    { label: 'Dynamic links', value: overview?.links ?? null },
    { label: 'Menus', value: overview?.menus ?? null },
    { label: 'Link pages', value: overview?.pages ?? null },
    { label: 'All scans', value: overview?.scans ?? null },
  ]);
</script>

{#snippet navigation(close: () => void)}
  <p
    class="px-2.5 pb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70 dark:text-muted-foreground"
  >
    Manage
  </p>
  <nav class="space-y-0.5" aria-label="Dashboard">
    {#each items as item (item.href)}
      <a
        href={item.href}
        data-testid={item.testId}
        aria-current={item.active ? 'page' : undefined}
        onclick={close}
        class={cn(
          'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 max-lg:py-2.5',
          item.active
            ? 'bg-ink text-white'
            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
        )}
      >
        <item.icon
          class={cn(
            'size-4 shrink-0',
            item.active ? 'text-punch' : 'text-muted-foreground group-hover:text-foreground',
          )}
        />
        {item.label}
      </a>
    {/each}
  </nav>

  <div class="mt-6">
    <p
      class="px-2.5 pb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70 dark:text-muted-foreground"
    >
      Create
    </p>
    <div class="space-y-0.5">
      <button
        type="button"
        onclick={() => {
          close();
          openCreate();
        }}
        class="group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Plus class="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
        Dynamic code
      </button>
      <a
        href="/dashboard/menus/new"
        onclick={close}
        class="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 max-lg:py-2.5"
      >
        <UtensilsCrossed
          class="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
        />
        Menu
      </a>
      <a
        href="/dashboard/pages/new"
        onclick={close}
        class="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 max-lg:py-2.5"
      >
        <Files class="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
        Link page
      </a>
    </div>
  </div>

  <div class="mt-6 border-t border-border pt-4">
    <a
      href="/"
      onclick={close}
      class="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 max-lg:py-2.5"
    >
      <House class="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
      Back to quickqr.app
    </a>
  </div>
{/snippet}

<div class="min-h-dvh bg-background">
  <aside
    class={cn(
      'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex',
      createOpen ? 'w-[22rem]' : 'w-60',
    )}
    aria-label={createOpen ? 'Create dynamic code' : 'Dashboard navigation'}
  >
    <div class="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <a
        href="/"
        class="inline-flex min-w-0 items-center rounded-lg py-1 text-left text-foreground transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label="quickqr.app home"
      >
        <Logo />
      </a>
      <Badge
        variant="secondary"
        class="ml-auto h-5 bg-muted px-2 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
      >
        Free
      </Badge>
    </div>

    {#if createOpen}
      <div class="min-h-0 flex-1 overflow-hidden">
        <CreateDynamicCodePanel
          onClose={closeCreate}
          onCreated={() => (dashboardRefresh += 1)}
        />
      </div>
    {:else}
      <div class="flex-1 overflow-y-auto px-3 py-4">
        {@render navigation(() => {})}
      </div>

      <div class="shrink-0 border-t border-border p-3">
        <div class="rounded-xl bg-muted/60 p-3.5">
          <div class="flex items-center gap-2 text-[13px] font-medium text-foreground">
            <ShieldCheck class="size-4 shrink-0" />
            Always free
          </div>
          <p class="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            No trial timer on printed codes. Sponsor placements fund redirects.
          </p>
        </div>
      </div>
    {/if}
  </aside>

  <div class={cn('transition-[padding] duration-200', createOpen ? 'lg:pl-[22rem]' : 'lg:pl-60')}>
    <header
      class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-4 backdrop-blur-md sm:px-6 lg:px-8"
    >
      <button
        type="button"
        class="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 max-sm:size-9 lg:hidden"
        aria-label="Open navigation"
        onclick={() => (navOpen = true)}
      >
        <MenuIcon class="size-5" />
      </button>

      <a
        href="/"
        class="inline-flex shrink-0 items-center rounded-lg text-foreground transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/40 lg:hidden"
        aria-label="quickqr.app home"
      >
        <Logo wordmark={false} />
      </a>

      <div class="hidden min-w-0 items-center gap-1.5 text-[13px] sm:flex">
        <a
          href="/dashboard"
          class="shrink-0 rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          Dashboard
        </a>
        <ChevronRight class="size-3.5 shrink-0 text-muted-foreground/60" />
        <span class="truncate font-medium text-foreground">{title}</span>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          data-testid="scan-open"
          aria-label="Scan"
          class="h-8 gap-1.5 border-border bg-card px-2.5 text-[13px] max-sm:h-9"
          onclick={() => (scannerOpen = true)}
        >
          <ScanLine class="size-4" />
          <span class="hidden sm:inline">Scan</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          aria-label="Create code"
          aria-pressed={desktop ? createOpen : mobileCreateOpen}
          class="h-8 gap-1.5 border-border bg-card px-2.5 text-[13px] max-sm:h-9"
          onclick={openCreate}
        >
          <Plus class="size-4" />
          <span class="hidden sm:inline">Create code</span>
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger>
            {#snippet child({ props })}
              <button
                {...props}
                type="button"
                aria-label="Account menu"
                class="grid size-8 cursor-pointer place-items-center rounded-full border border-border bg-muted text-[12px] font-semibold text-foreground transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40 max-sm:size-9"
              >
                {initial}
              </button>
            {/snippet}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-60">
            <DropdownMenuLabel class="px-2 py-1.5">
              <span class="block truncate text-[13px] font-medium text-foreground">
                {user.email}
              </span>
              <span class="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                Free plan
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onclick={() => (window.location.href = '/')}>
              <House class="size-4" />
              Back to quickqr.app
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onclick={onLogout}>
              <LogOut class="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    <div class="flex min-h-[calc(100dvh-3.5rem)]">
      {#if !createOpen}
        <div
          class={cn(
            'hidden shrink-0 overflow-x-clip border-border bg-card transition-[width] duration-200 min-[1360px]:block',
            selectedDetail
              ? 'w-[320px] border-r min-[1900px]:w-[360px] min-[2300px]:w-[400px]'
              : 'w-0 border-r-0',
          )}
        >
          {#if selectedDetail}
            <aside
              in:fly={{ x: -12, duration: 180 }}
              out:fly={{ x: -12, duration: 140 }}
              class="sticky top-14 h-[calc(100dvh-3.5rem)] w-[320px] overflow-y-auto bg-card min-[1900px]:w-[360px] min-[2300px]:w-[400px]"
              aria-label="Link details"
            >
              <LinkDetailSidebar
                link={selectedDetail.link}
                onClose={() => (selectedDetail = null)}
                onSaved={handleDetailSaved}
              />
            </aside>
          {/if}
        </div>
      {/if}

      <main class="min-w-0 flex-1">
        <div class="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {#if menuEditCode}
          <MenuEditor code={menuEditCode} />
        {:else if pageEditCode}
          <LinkPageEditor code={pageEditCode} />
        {:else if path.startsWith('/dashboard/menus')}
          <MenusSection />
        {:else if path.startsWith('/dashboard/pages')}
          <LinkPagesSection />
        {:else}
          <Dashboard
            {sponsor}
            refreshKey={dashboardRefresh}
            onCreate={openCreate}
            useDetailSidebar={wide && !createOpen}
            selectedCode={selectedDetail?.link.code ?? null}
            compactTable={selectedDetail !== null}
            onSelectLink={(selection) => (selectedDetail = selection)}
          />
        {/if}
        </div>
      </main>

      {#if !createOpen}
        <aside
          class="hidden w-[280px] shrink-0 border-l border-border bg-card min-[1360px]:block min-[1900px]:w-[320px] min-[2300px]:w-[360px]"
          aria-label="Workspace overview"
        >
          <div class="sticky top-14 h-[calc(100dvh-3.5rem)] overflow-y-auto">
            <div class="border-b border-border p-4">
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
                  Workspace
                </h2>
                <Badge
                  variant="secondary"
                  class="h-5 bg-muted px-2 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
                >
                  Free
                </Badge>
              </div>
              <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
                Live counts behind your printed codes.
              </p>
            </div>
            <dl class="divide-y divide-border">
              {#each overviewRows as row (row.label)}
                <div class="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt class="text-xs text-muted-foreground">{row.label}</dt>
                  <dd class="font-mono text-[13px] font-medium tabular-nums text-foreground">
                    {#if row.value !== null}
                      {row.value.toLocaleString()}
                    {:else if overviewState === 'error'}
                      <span class="text-muted-foreground">—</span>
                    {:else}
                      <span
                        class="inline-block h-3 w-8 animate-pulse rounded bg-muted align-middle"
                      ></span>
                    {/if}
                  </dd>
                </div>
              {/each}
            </dl>
            <div class="border-t border-border p-3">
              <Button
                onclick={openCreate}
                variant="outline"
                class="h-8 w-full border-border bg-card text-[13px]"
              >
                Create a code
              </Button>
            </div>

            <section class="border-t border-border">
              <div class="flex items-start gap-2.5 px-4 py-3.5">
                <span
                  class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-punch/40 text-ink"
                >
                  <ShieldCheck class="size-4" />
                </span>
                <div class="min-w-0">
                  <h2 class="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
                    Free by design
                  </h2>
                  <p class="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Sponsor placements fund dynamic redirects, not subscriptions.
                  </p>
                </div>
              </div>
              <ul class="space-y-2 px-4 pb-3 text-xs text-muted-foreground">
                <li class="flex items-start gap-2">
                  <Check class="mt-px size-3.5 shrink-0 text-foreground" />
                  No trial timer on printed codes
                </li>
                <li class="flex items-start gap-2">
                  <Check class="mt-px size-3.5 shrink-0 text-foreground" />
                  Edit a destination after printing
                </li>
                <li class="flex items-start gap-2">
                  <Check class="mt-px size-3.5 shrink-0 text-foreground" />
                  Scan counts stay visible
                </li>
              </ul>
              <div class="border-t border-border px-4 py-2.5">
                <a
                  href="/#preview"
                  class="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  See the redirect preview
                  <ArrowUpRight class="size-3.5" />
                </a>
              </div>
            </section>

            {#if sponsor}
              <div class="border-t border-border p-4">
                <AdSpace variant="native-card" {sponsor} slotId="dashboard-rail" />
              </div>
            {/if}
          </div>
        </aside>
      {/if}
    </div>
  </div>
</div>

<Dialog
  bind:open={navOpen}
  class="left-0 top-0 h-dvh max-h-dvh w-72 max-w-[85vw] translate-x-0 translate-y-0 gap-0 rounded-none p-0 ring-0 sm:max-w-[85vw]"
>
  {#snippet children({ close })}
    <div class="flex h-full flex-col bg-card">
      <div class="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <a
          href="/"
          class="inline-flex items-center rounded-lg text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="quickqr.app home"
          onclick={close}
        >
          <Logo />
        </a>
        <button
          type="button"
          class="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Close navigation"
          onclick={close}
        >
          <X class="size-4" />
        </button>
      </div>
      <div class="flex-1 overflow-y-auto px-3 py-4">
        {@render navigation(close)}
      </div>
      <div class="shrink-0 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div class="flex items-center gap-2.5 rounded-xl bg-muted/60 p-3">
          <span
            class="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-punch"
          >
            {initial}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-medium text-foreground">{user.email}</p>
            <p class="text-[11px] text-muted-foreground">Free plan</p>
          </div>
          <button
            type="button"
            class="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label="Log out"
            onclick={onLogout}
          >
            <LogOut class="size-4" />
          </button>
        </div>
      </div>
    </div>
  {/snippet}
</Dialog>

<Dialog
  bind:open={mobileCreateOpen}
  class="left-0 top-0 h-dvh max-h-dvh w-full max-w-[92vw] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none p-0 ring-0 motion-safe:animate-in motion-safe:slide-in-from-left-4 motion-safe:duration-200 sm:max-w-[360px]"
>
  {#snippet children({ close })}
    <CreateDynamicCodePanel
      onClose={close}
      onCreated={() => (dashboardRefresh += 1)}
    />
  {/snippet}
</Dialog>

<MenuScanner bind:open={scannerOpen} />
