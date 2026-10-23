<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Check from '@lucide/svelte/icons/check';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Files from '@lucide/svelte/icons/files';
  import Gift from '@lucide/svelte/icons/gift';
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
  import { canUseMenus, describePlan } from '../lib/plan';
  import { fly } from 'svelte/transition';
  import type { Link, Sponsor } from '../types';
  import type { User } from '../types/auth';
  import type { DetailSelection, SavedLink } from '../types/dashboard';
  import AdSpace from './AdSpace.svelte';
  import CreateDynamicCodePanel from './CreateDynamicCodePanel.svelte';
  import Dashboard from './Dashboard.svelte';
  import GiftsSection from './GiftsSection.svelte';
  import LinkPageEditor from './LinkPageEditor.svelte';
  import LinkPagesSection from './LinkPagesSection.svelte';
  import LinkDetailSidebar from './LinkDetailSidebar.svelte';
  import Logo from './Logo.svelte';
  import MenuEditor from './MenuEditor.svelte';
  import MenusGate from './MenusGate.svelte';
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
  const plan = $derived(describePlan(user));
  /** The gift admin page. For anyone who is not an administrator its path is like any other the dashboard does not know. */
  const showGifts = $derived(path.startsWith('/dashboard/gifts') && user.is_admin === true);
  /** Menus are a Pro feature on the hosted server; a server with no plans (the Go reference) keeps them open. */
  const menusLocked = $derived(!canUseMenus(user));

  function pageTitle(): string {
    if (path.startsWith('/dashboard/menus')) {
      if (menusLocked) return 'Menus';
      if (path === '/dashboard/menus/new') return 'New menu';
      return path.startsWith('/dashboard/menus/') ? 'Edit menu' : 'Menus';
    }
    if (path.startsWith('/dashboard/pages')) {
      if (path === '/dashboard/pages/new') return 'New link page';
      return path.startsWith('/dashboard/pages/') ? 'Edit link page' : 'Link pages';
    }
    return showGifts ? 'Gifts' : 'Dynamic links';
  }

  const title = $derived(pageTitle());

  type NavItem = { label: string; href: string; icon: typeof Link2; testId: string; active: boolean; locked?: boolean };

  const items: NavItem[] = $derived([
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
      locked: menusLocked,
    },
    {
      label: 'Link pages',
      href: '/dashboard/pages',
      icon: Files,
      testId: 'nav-pages',
      active: path.startsWith('/dashboard/pages'),
    },
  ]);

  const giftsItem: NavItem = {
    label: 'Gifts',
    href: '/dashboard/gifts',
    icon: Gift,
    testId: 'nav-gifts',
    active: path.startsWith('/dashboard/gifts'),
  };

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

{#snippet navLink(item: NavItem, close: () => void)}
  <a
    href={item.href}
    data-testid={item.testId}
    aria-current={item.active ? 'page' : undefined}
    onclick={close}
    class={cn(
      'dsh-nav-link',
      item.active
        ? 'dsh-nav-active'
        : 'dsh-nav-idle',
    )}
  >
    <item.icon
      class={cn(
        'dsh-nav-icon',
        item.active ? 'dsh-nav-icon-punch' : 'dsh-nav-icon-idle',
      )}
    />
    {item.label}
    {#if item.locked}
      <span class="dsh-nav-pro">Pro</span>
    {/if}
  </a>
{/snippet}

{#snippet navigation(close: () => void)}
  <p
    class="dsh-section-label"
  >
    Manage
  </p>
  <nav class="dsh-nav" aria-label="Dashboard">
    {#each items as item (item.href)}
      {@render navLink(item, close)}
    {/each}
  </nav>

  <div class="dsh-create-sec">
    <p
      class="dsh-section-label"
    >
      Create
    </p>
    <div class="dsh-create-list">
      <button
        type="button"
        onclick={() => {
          close();
          openCreate();
        }}
        class="dsh-create-btn"
      >
        <Plus class="dsh-create-icon" />
        Dynamic code
      </button>
      <a
        href="/dashboard/menus/new"
        onclick={close}
        class="dsh-create-link"
      >
        <UtensilsCrossed
          class="dsh-create-icon"
        />
        Menu
      </a>
      <a
        href="/dashboard/pages/new"
        onclick={close}
        class="dsh-create-link"
      >
        <Files class="dsh-create-icon" />
        Link page
      </a>
    </div>
  </div>

  {#if user.is_admin}
    <div class="dsh-admin-sec">
      <p
        class="dsh-section-label"
      >
        Admin
      </p>
      <nav class="dsh-nav" aria-label="Admin">
        {@render navLink(giftsItem, close)}
      </nav>
    </div>
  {/if}

  <div class="dsh-footer-link">
    <a
      href="/"
      onclick={close}
      class="dsh-footer-link-a"
    >
      <House class="dsh-create-icon" />
      Back to quickqr.app
    </a>
  </div>
{/snippet}

<div class="dsh-root">
  <aside
    class={cn(
      'dsh-aside',
      createOpen ? 'dsh-aside-wide' : 'dsh-aside-narrow',
    )}
    aria-label={createOpen ? 'Create dynamic code' : 'Dashboard navigation'}
  >
    <div class="dsh-aside-head">
      <a
        href="/"
        class="dsh-logo-link"
        aria-label="quickqr.app home"
      >
        <Logo />
      </a>
      <Badge
        variant="secondary"
        class="dsh-plan-badge"
      >
        {plan.name}
      </Badge>
    </div>

    {#if createOpen}
      <div class="dsh-panel-wrap">
        <CreateDynamicCodePanel
          onClose={closeCreate}
          onCreated={() => (dashboardRefresh += 1)}
        />
      </div>
    {:else}
      <div class="dsh-nav-wrap">
        {@render navigation(() => {})}
      </div>

      <div class="dsh-aside-foot">
        <div class="dsh-free-box">
          <div class="dsh-free-head">
            <ShieldCheck class="dsh-free-icon" />
            Always free
          </div>
          <p class="dsh-free-text">
            No trial timer on printed codes. Sponsor placements fund redirects.
          </p>
        </div>
      </div>
    {/if}
  </aside>

  <div class={cn('dsh-main-shift', createOpen ? 'dsh-main-wide' : 'dsh-main-narrow')}>
    <header
      class="dsh-header"
    >
      <button
        type="button"
        class="dsh-menu-btn"
        aria-label="Open navigation"
        onclick={() => (navOpen = true)}
      >
        <MenuIcon class="dsh-menu-icon" />
      </button>

      <a
        href="/"
        class="dsh-logo-link-sm"
        aria-label="quickqr.app home"
      >
        <Logo wordmark={false} />
      </a>

      <div class="dsh-breadcrumb">
        <a
          href="/dashboard"
          class="dsh-crumb"
        >
          Dashboard
        </a>
        <ChevronRight class="dsh-crumb-sep" />
        <span class="dsh-crumb-current">{title}</span>
      </div>

      <div class="dsh-header-actions">
        <Button
          variant="outline"
          size="sm"
          data-testid="scan-open"
          aria-label="Scan"
          class="dsh-header-btn"
          onclick={() => (scannerOpen = true)}
        >
          <ScanLine class="dsh-header-icon" />
          <span class="dsh-header-btn-text">Scan</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          aria-label="Create code"
          aria-pressed={desktop ? createOpen : mobileCreateOpen}
          class="dsh-header-btn"
          onclick={openCreate}
        >
          <Plus class="dsh-header-icon" />
          <span class="dsh-header-btn-text">Create code</span>
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger>
            {#snippet child({ props })}
              <button
                {...props}
                type="button"
                aria-label="Account menu"
                class="dsh-account-btn"
              >
                {initial}
              </button>
            {/snippet}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="dsh-menu-content">
            <DropdownMenuLabel class="dsh-menu-label">
              <span class="dsh-menu-email">
                {user.email}
              </span>
              <span class="dsh-menu-plan">
                {plan.line}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onclick={() => (window.location.href = '/')}>
              <House class="dsh-menu-item-icon" />
              Back to quickqr.app
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onclick={onLogout}>
              <LogOut class="dsh-menu-item-icon" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    <div class="dsh-content-row">
      {#if !createOpen}
        <div
          class={cn(
            'dsh-detail-slot',
            selectedDetail
              ? 'dsh-detail-on'
              : 'dsh-detail-off',
          )}
        >
          {#if selectedDetail}
            <aside
              in:fly={{ x: -12, duration: 180 }}
              out:fly={{ x: -12, duration: 140 }}
              class="dsh-detail-aside"
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

      <main class="dsh-main">
        <div class="dsh-main-inner">
        {#if path.startsWith('/dashboard/menus')}
          {#if menusLocked}
            <MenusGate />
          {:else if menuEditCode}
            <MenuEditor code={menuEditCode} />
          {:else}
            <MenusSection />
          {/if}
        {:else if pageEditCode}
          <LinkPageEditor code={pageEditCode} />
        {:else if path.startsWith('/dashboard/pages')}
          <LinkPagesSection />
        {:else if showGifts}
          <GiftsSection />
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
          class="dsh-rail"
          aria-label="Workspace overview"
        >
          <div class="dsh-rail-inner">
            <div class="dsh-rail-head">
              <div class="dsh-rail-title-row">
                <h2 class="dsh-rail-title">
                  Workspace
                </h2>
                <Badge
                  variant="secondary"
                  class="dsh-rail-badge"
                >
                  {plan.name}
                </Badge>
              </div>
              <p class="dsh-rail-sub">
                Live counts behind your printed codes.
              </p>
            </div>
            <dl class="dsh-rail-dl">
              {#each overviewRows as row (row.label)}
                <div class="dsh-rail-row">
                  <dt class="dsh-rail-dt">{row.label}</dt>
                  <dd class="dsh-rail-dd">
                    {#if row.value !== null}
                      {row.value.toLocaleString()}
                    {:else if overviewState === 'error'}
                      <span class="dsh-rail-empty">—</span>
                    {:else}
                      <span
                        class="dsh-pulse-small"
                      ></span>
                    {/if}
                  </dd>
                </div>
              {/each}
            </dl>
            <div class="dsh-rail-create">
              <Button
                onclick={openCreate}
                variant="outline"
                class="dsh-rail-create-btn"
              >
                Create a code
              </Button>
            </div>

            <section class="dsh-free-design">
              <div class="dsh-free-row">
                <span
                  class="dsh-shield"
                >
                  <ShieldCheck class="dsh-shield-icon" />
                </span>
                <div class="dsh-free-col">
                  <h2 class="dsh-free-title">
                    Free by design
                  </h2>
                  <p class="dsh-free-desc">
                    Sponsor placements fund dynamic redirects, not subscriptions.
                  </p>
                </div>
              </div>
              <ul class="dsh-free-list">
                <li class="dsh-free-li">
                  <Check class="dsh-check-icon" />
                  No trial timer on printed codes
                </li>
                <li class="dsh-free-li">
                  <Check class="dsh-check-icon" />
                  Edit a destination after printing
                </li>
                <li class="dsh-free-li">
                  <Check class="dsh-check-icon" />
                  Scan counts stay visible
                </li>
              </ul>

              <div class="dsh-preview-link">
                <a
                  href="/#preview"
                  class="dsh-preview-a"
                >
                  See the redirect preview
                  <ArrowUpRight class="dsh-preview-icon" />
                </a>
              </div>
            </section>

            {#if sponsor}
              <div class="dsh-rail-ad">
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
  class="dsh-mobile-nav"
>
  {#snippet children({ close })}
    <div class="dsh-nav-sheet">
      <div class="dsh-nav-sheet-head">
        <a
          href="/"
          class="dsh-logo-link"
          aria-label="quickqr.app home"
          onclick={close}
        >
          <Logo />
        </a>
        <button
          type="button"
          class="dsh-close-btn"
          aria-label="Close navigation"
          onclick={close}
        >
          <X class="dsh-icon-x" />
        </button>
      </div>
      <div class="dsh-nav-sheet-body">
        {@render navigation(close)}
      </div>
      <div class="dsh-nav-sheet-foot">
        <div class="dsh-user-box">
          <span
            class="dsh-user-avatar"
          >
            {initial}
          </span>
          <div class="dsh-user-info">
            <p class="dsh-user-email">{user.email}</p>
            <p class="dsh-user-plan">{plan.line}</p>
          </div>
          <button
            type="button"
            class="dsh-logout-btn"
            aria-label="Log out"
            onclick={onLogout}
          >
            <LogOut class="dsh-icon-x" />
          </button>
        </div>
      </div>
    </div>
  {/snippet}
</Dialog>

<Dialog
  bind:open={mobileCreateOpen}
  class="dsh-mobile-create"
>
  {#snippet children({ close })}
    <CreateDynamicCodePanel
      onClose={close}
      onCreated={() => (dashboardRefresh += 1)}
    />
  {/snippet}
</Dialog>

<MenuScanner bind:open={scannerOpen} />

<style>
  .dsh-root {
    min-height: 100dvh;
    background-color: var(--background);
  }

  :global(.dsh-aside) {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    z-index: 40;
    display: none;
    flex-direction: column;
    border-inline-end: 1px solid var(--border);
    background-color: var(--card);
    transition: width 200ms;
  }
  @media (min-width: 64rem) {
    :global(.dsh-aside) {
      display: flex;
    }
  }
  :global(.dsh-aside-wide) {
    width: 22rem;
  }
  :global(.dsh-aside-narrow) {
    width: 15rem;
  }

  .dsh-aside-head {
    display: flex;
    height: 3.5rem;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 1px solid var(--border);
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .dsh-logo-link {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    border-radius: var(--radius);
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
    text-align: left;
    color: var(--foreground);
    transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline-style: none;
  }
  .dsh-logo-link:hover {
    opacity: 0.8;
  }
  .dsh-logo-link:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  :global(.dsh-plan-badge) {
    margin-left: auto;
    height: 1.25rem;
    background-color: var(--muted);
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted-foreground);
  }

  .dsh-panel-wrap {
    min-height: 0;
    flex: 1 1 0%;
    overflow: hidden;
  }

  .dsh-nav-wrap {
    flex: 1 1 0%;
    overflow-y: auto;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 1rem;
    padding-bottom: 1rem;
  }

  .dsh-aside-foot {
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    padding: 0.75rem;
  }

  .dsh-free-box {
    border-radius: calc(var(--radius) * 1.4);
    background-color: color-mix(in oklab, var(--muted) 60%, transparent);
    padding: 0.875rem;
  }

  .dsh-free-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
  }

  :global(.dsh-free-icon) {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  .dsh-free-text {
    margin-top: 0.375rem;
    font-size: 0.75rem;
    line-height: 1.625;
    color: var(--muted-foreground);
  }

  :global(.dsh-main-shift) {
    transition: padding 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  @media (min-width: 64rem) {
    :global(.dsh-main-narrow) {
      padding-left: 15rem;
    }
    :global(.dsh-main-wide) {
      padding-left: 22rem;
    }
  }

  .dsh-header {
    position: sticky;
    top: 0;
    z-index: 30;
    display: flex;
    height: 3.5rem;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 1px solid var(--border);
    background-color: color-mix(in oklab, var(--card) 95%, transparent);
    padding-left: 1rem;
    padding-right: 1rem;
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }
  @media (min-width: 40rem) {
    .dsh-header {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
  }
  @media (min-width: 64rem) {
    .dsh-header {
      padding-left: 2rem;
      padding-right: 2rem;
    }
  }

  .dsh-menu-btn {
    display: grid;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    cursor: pointer;
    place-items: center;
    border-radius: var(--radius);
    color: var(--muted-foreground);
    transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline-style: none;
  }
  .dsh-menu-btn:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }
  .dsh-menu-btn:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }
  @media (width < 40rem) {
    .dsh-menu-btn {
      width: 2.25rem;
      height: 2.25rem;
    }
  }
  @media (min-width: 64rem) {
    .dsh-menu-btn {
      display: none;
    }
  }

  :global(.dsh-menu-icon) {
    width: 1.25rem;
    height: 1.25rem;
  }

  .dsh-logo-link-sm {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    border-radius: var(--radius);
    color: var(--foreground);
    transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline-style: none;
  }
  .dsh-logo-link-sm:hover {
    opacity: 0.8;
  }
  .dsh-logo-link-sm:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }
  @media (min-width: 64rem) {
    .dsh-logo-link-sm {
      display: none;
    }
  }

  .dsh-breadcrumb {
    display: none;
    min-width: 0;
    align-items: center;
    gap: 0.375rem;
    font-size: 13px;
  }
  @media (min-width: 40rem) {
    .dsh-breadcrumb {
      display: flex;
    }
  }

  .dsh-crumb {
    flex-shrink: 0;
    border-radius: calc(var(--radius) * 0.6);
    color: var(--muted-foreground);
    transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline-style: none;
  }
  .dsh-crumb:hover {
    color: var(--foreground);
  }
  .dsh-crumb:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  :global(.dsh-crumb-sep) {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
    color: color-mix(in oklab, var(--muted-foreground) 60%, transparent);
  }

  .dsh-crumb-current {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
    color: var(--foreground);
  }

  .dsh-header-actions {
    margin-left: auto;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.dsh-header-btn) {
    height: 2rem;
    gap: 0.375rem;
    border: 1px solid var(--border);
    background-color: var(--card);
    padding-left: 0.625rem;
    padding-right: 0.625rem;
    font-size: 13px;
  }
  @media (width < 40rem) {
    :global(.dsh-header-btn) {
      height: 2.25rem;
    }
  }

  :global(.dsh-header-icon) {
    width: 1rem;
    height: 1rem;
  }

  .dsh-header-btn-text {
    display: none;
  }
  @media (min-width: 40rem) {
    .dsh-header-btn-text {
      display: inline;
    }
  }

  .dsh-account-btn {
    display: grid;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
    place-items: center;
    border-radius: 9999px;
    border: 1px solid var(--border);
    background-color: var(--muted);
    font-size: 12px;
    font-weight: 600;
    color: var(--foreground);
    transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline-style: none;
  }
  .dsh-account-btn:hover {
    background-color: var(--secondary);
  }
  .dsh-account-btn:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }
  @media (width < 40rem) {
    .dsh-account-btn {
      width: 2.25rem;
      height: 2.25rem;
    }
  }

  :global(.dsh-menu-content) {
    width: 15rem;
  }

  :global(.dsh-menu-label) {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
  }

  .dsh-menu-email {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
  }

  .dsh-menu-plan {
    margin-top: 0.125rem;
    display: block;
    font-size: 11px;
    font-weight: 400;
    color: var(--muted-foreground);
  }

  :global(.dsh-menu-item-icon) {
    width: 1rem;
    height: 1rem;
  }

  .dsh-content-row {
    display: flex;
    min-height: calc(100dvh - 3.5rem);
  }

  :global(.dsh-detail-slot) {
    display: none;
    flex-shrink: 0;
    overflow-x: clip;
    border-inline-end: 1px solid var(--border);
    background-color: var(--card);
    transition: width 200ms;
  }
  @media (min-width: 1360px) {
    :global(.dsh-detail-slot) {
      display: block;
    }
  }
  :global(.dsh-detail-on) {
    width: 320px;
    border-inline-end: 1px solid var(--border);
  }
  @media (min-width: 1900px) {
    :global(.dsh-detail-on) {
      width: 360px;
    }
  }
  @media (min-width: 2300px) {
    :global(.dsh-detail-on) {
      width: 400px;
    }
  }
  :global(.dsh-detail-off) {
    width: 0;
    border-inline-end-width: 0;
  }

  .dsh-detail-aside {
    position: sticky;
    top: 3.5rem;
    height: calc(100dvh - 3.5rem);
    width: 320px;
    overflow-y: auto;
    background-color: var(--card);
  }
  @media (min-width: 1900px) {
    .dsh-detail-aside {
      width: 360px;
    }
  }
  @media (min-width: 2300px) {
    .dsh-detail-aside {
      width: 400px;
    }
  }

  .dsh-main {
    min-width: 0;
    flex: 1 1 0%;
  }

  .dsh-main-inner {
    margin-left: auto;
    margin-right: auto;
    width: 100%;
    max-width: 1200px;
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 1.5rem;
    padding-bottom: 1.5rem;
  }
  @media (min-width: 40rem) {
    .dsh-main-inner {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
  }
  @media (min-width: 64rem) {
    .dsh-main-inner {
      padding-left: 2rem;
      padding-right: 2rem;
      padding-top: 2rem;
      padding-bottom: 2rem;
    }
  }

  .dsh-rail {
    display: none;
    width: 280px;
    flex-shrink: 0;
    border-inline-start: 1px solid var(--border);
    background-color: var(--card);
  }
  @media (min-width: 1360px) {
    .dsh-rail {
      display: block;
    }
  }
  @media (min-width: 1900px) {
    .dsh-rail {
      width: 320px;
    }
  }
  @media (min-width: 2300px) {
    .dsh-rail {
      width: 360px;
    }
  }

  .dsh-rail-inner {
    position: sticky;
    top: 3.5rem;
    height: calc(100dvh - 3.5rem);
    overflow-y: auto;
  }

  .dsh-rail-head {
    border-bottom: 1px solid var(--border);
    padding: 1rem;
  }

  .dsh-rail-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .dsh-rail-title {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--foreground);
  }

  :global(.dsh-rail-badge) {
    height: 1.25rem;
    background-color: var(--muted);
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted-foreground);
  }

  .dsh-rail-sub {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    line-height: 1.625;
    color: var(--muted-foreground);
  }

  .dsh-rail-dl {
    border-top-width: 1px;
    border-bottom-width: 1px;
    border-color: var(--border);
  }

  .dsh-rail-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 0.625rem;
    padding-bottom: 0.625rem;
  }

  .dsh-rail-dt {
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }

  .dsh-rail-dd {
    font-size: 13px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--foreground);
  }

  .dsh-rail-empty {
    color: var(--muted-foreground);
  }

  .dsh-pulse-small {
    display: inline-block;
    height: 0.75rem;
    width: 2rem;
    animation: dsh-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    border-radius: 0.25rem;
    background-color: var(--muted);
    vertical-align: middle;
  }

  @keyframes dsh-pulse {
    50% {
      opacity: 0.5;
    }
  }

  .dsh-rail-create {
    border-top: 1px solid var(--border);
    padding: 0.75rem;
  }

  :global(.dsh-rail-create-btn) {
    height: 2rem;
    width: 100%;
    border: 1px solid var(--border);
    background-color: var(--card);
    font-size: 13px;
  }

  .dsh-free-design {
    border-top: 1px solid var(--border);
  }

  .dsh-free-row {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 0.875rem;
    padding-bottom: 0.875rem;
  }

  .dsh-shield {
    margin-top: 0.125rem;
    display: grid;
    width: 1.75rem;
    height: 1.75rem;
    flex-shrink: 0;
    place-items: center;
    border-radius: var(--radius);
    background-color: color-mix(in oklab, var(--punch) 40%, transparent);
    color: var(--ink);
  }

  :global(.dsh-shield-icon) {
    width: 1rem;
    height: 1rem;
  }

  .dsh-free-col {
    min-width: 0;
  }

  .dsh-free-title {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--foreground);
  }

  .dsh-free-desc {
    margin-top: 0.125rem;
    font-size: 0.75rem;
    line-height: 1.625;
    color: var(--muted-foreground);
  }

  .dsh-free-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-left: 1rem;
    padding-right: 1rem;
    padding-bottom: 0.75rem;
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }

  .dsh-free-li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  :global(.dsh-check-icon) {
    margin-top: 1px;
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
    color: var(--foreground);
  }

  .dsh-preview-link {
    border-top: 1px solid var(--border);
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 0.625rem;
    padding-bottom: 0.625rem;
  }

  .dsh-preview-a {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    border-radius: calc(var(--radius) * 0.6);
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--foreground);
    outline-style: none;
  }
  .dsh-preview-a:hover {
    text-decoration: underline;
  }
  .dsh-preview-a:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  :global(.dsh-preview-icon) {
    width: 0.875rem;
    height: 0.875rem;
  }

  .dsh-rail-ad {
    border-top: 1px solid var(--border);
    padding: 1rem;
  }

  :global(.dsh-mobile-nav) {
    left: 0;
    top: 0;
    height: 100dvh;
    max-height: 100dvh;
    width: 18rem;
    max-width: 85vw;
    translate: 0 0;
    gap: 0;
    border-radius: 0;
    padding: 0;

  }
  @media (min-width: 40rem) {
    :global(.dsh-mobile-nav) {
      max-width: 85vw;
    }
  }

  .dsh-nav-sheet {
    display: flex;
    height: 100%;
    flex-direction: column;
    background-color: var(--card);
  }

  .dsh-nav-sheet-head {
    display: flex;
    height: 3.5rem;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .dsh-close-btn {
    display: grid;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
    place-items: center;
    border-radius: var(--radius);
    color: var(--muted-foreground);
    transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline-style: none;
  }
  .dsh-close-btn:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }
  .dsh-close-btn:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  :global(.dsh-icon-x) {
    width: 1rem;
    height: 1rem;
  }

  .dsh-nav-sheet-body {
    flex: 1 1 0%;
    overflow-y: auto;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 1rem;
    padding-bottom: 1rem;
  }

  .dsh-nav-sheet-foot {
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    padding: 0.75rem;
    padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  }

  .dsh-user-box {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    border-radius: calc(var(--radius) * 1.4);
    background-color: color-mix(in oklab, var(--muted) 60%, transparent);
    padding: 0.75rem;
  }

  .dsh-user-avatar {
    display: grid;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    place-items: center;
    border-radius: 9999px;
    background-color: var(--ink);
    font-size: 12px;
    font-weight: 600;
    color: var(--punch);
  }

  .dsh-user-info {
    min-width: 0;
    flex: 1 1 0%;
  }

  .dsh-user-email {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
  }

  .dsh-user-plan {
    font-size: 11px;
    color: var(--muted-foreground);
  }

  .dsh-logout-btn {
    display: grid;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
    place-items: center;
    border-radius: var(--radius);
    color: var(--muted-foreground);
    transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline-style: none;
  }
  .dsh-logout-btn:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }
  .dsh-logout-btn:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  :global(.dsh-mobile-create) {
    left: 0;
    top: 0;
    height: 100dvh;
    max-height: 100dvh;
    width: 100%;
    max-width: 92vw;
    translate: 0 0;
    gap: 0;
    overflow: hidden;
    border-radius: 0;
    padding: 0;

  }
  @media (min-width: 40rem) {
    :global(.dsh-mobile-create) {
      max-width: 360px;
    }
  }

  .dsh-nav-link {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    border-radius: var(--radius);
    padding-left: 0.625rem;
    padding-right: 0.625rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    font-size: 13px;
    font-weight: 500;
    transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline-style: none;
  }
  .dsh-nav-link:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }
  @media (width < 64rem) {
    .dsh-nav-link {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
    }
  }

  .dsh-nav-active {
    background-color: var(--ink);
    color: white;
  }

  .dsh-nav-idle {
    color: var(--muted-foreground);
  }
  .dsh-nav-idle:hover {
    background-color: color-mix(in oklab, var(--muted) 70%, transparent);
    color: var(--foreground);
  }

  .dsh-nav-pro {
    margin-left: auto;
    border: 1px solid color-mix(in oklab, currentColor 45%, transparent);
    border-radius: 999px;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 500;
    line-height: 1.35;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  :global(.dsh-nav-icon) {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  .dsh-nav-icon-punch {
    color: var(--punch);
  }

  .dsh-nav-icon-idle {
    color: var(--muted-foreground);
  }
  :global(.dsh-nav-link:hover) :global(.dsh-nav-icon-idle) {
    color: var(--foreground);
  }

  .dsh-section-label {
    padding-left: 0.625rem;
    padding-right: 0.625rem;
    padding-bottom: 0.5rem;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
  }
  :global(.dark) .dsh-section-label {
    color: var(--muted-foreground);
  }

  .dsh-nav {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .dsh-create-sec {
    margin-top: 1.5rem;
  }

  .dsh-create-list {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .dsh-create-btn {
    display: flex;
    width: 100%;
    cursor: pointer;
    align-items: center;
    gap: 0.625rem;
    border-radius: var(--radius);
    padding-left: 0.625rem;
    padding-right: 0.625rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    text-align: left;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted-foreground);
    transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline-style: none;
  }
  .dsh-create-btn:hover {
    background-color: color-mix(in oklab, var(--muted) 70%, transparent);
    color: var(--foreground);
  }
  .dsh-create-btn:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  :global(.dsh-create-icon) {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: var(--muted-foreground);
  }
  :global(.dsh-create-btn:hover) :global(.dsh-create-icon),
  :global(.dsh-create-link:hover) :global(.dsh-create-icon) {
    color: var(--foreground);
  }

  .dsh-create-link {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    border-radius: var(--radius);
    padding-left: 0.625rem;
    padding-right: 0.625rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted-foreground);
    transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline-style: none;
  }
  .dsh-create-link:hover {
    background-color: color-mix(in oklab, var(--muted) 70%, transparent);
    color: var(--foreground);
  }
  .dsh-create-link:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }
  @media (width < 64rem) {
    .dsh-create-link {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
    }
  }

  .dsh-admin-sec {
    margin-top: 1.5rem;
  }

  .dsh-footer-link {
    margin-top: 1.5rem;
    border-top: 1px solid var(--border);
    padding-top: 1rem;
  }

  .dsh-footer-link-a {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    border-radius: var(--radius);
    padding-left: 0.625rem;
    padding-right: 0.625rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted-foreground);
    transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline-style: none;
  }
  .dsh-footer-link-a:hover {
    background-color: color-mix(in oklab, var(--muted) 70%, transparent);
    color: var(--foreground);
  }
  .dsh-footer-link-a:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }
  @media (width < 64rem) {
    .dsh-footer-link-a {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
    }
  }
</style>
