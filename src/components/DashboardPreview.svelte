<script lang="ts">
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Check from '@lucide/svelte/icons/check';
  import Edit2 from '@lucide/svelte/icons/edit-2';
  import Files from '@lucide/svelte/icons/files';
  import Link2 from '@lucide/svelte/icons/link-2';
  import Moon from '@lucide/svelte/icons/moon';
  import Plus from '@lucide/svelte/icons/plus';
  import QrCode from '@lucide/svelte/icons/qr-code';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import ScanLine from '@lucide/svelte/icons/scan-line';
  import Search from '@lucide/svelte/icons/search';
  import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
  import Button from '@/lib/components/ui/button.svelte';
  import Card from '@/lib/components/ui/card.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import LinkRowMenu from './LinkRowMenu.svelte';
  import Logo from './Logo.svelte';
  import QRCanvas from './QRCanvas.svelte';
  import Sparkline from './Sparkline.svelte';
  import { DEFAULT_QR_PRESET_ID, presetStyleById, withQrStyleDefaults } from '@/lib/qrStylePresets';
  import { onMount } from 'svelte';

  type DemoLink = { code: string; title: string; destination: string; scans: number; points: number[] };

  /** What the pointer does, in ms into the pass. */
  const CYCLE = 15_000;
  const DESTINATION = 'cafe.example.com/spring-menu';
  const EDITED = 'cafe.example.com/summer-menu';
  const SCAN_TOTAL = 128;
  const SCAN_POINTS = [6, 9, 8, 17, 24, 41];
  const FIELD_CLICK = 1700;
  const TYPED = 4100;
  const CREATE_CLICK = 5200;
  const ROW_IN = 5900;
  const SCANS_DONE = 8000;
  const EDIT_CLICK = 9200;
  const EDITED_AT = 10_600;
  const SAVE_CLICK = 10_900;
  /** Where the pointer rests, and when it gets there. Each target holds through its click and what that started. */
  const REST_UNTIL = 500;
  const AT_FIELD = 1400;
  const FIELD_BEAT = 4250;
  const AT_CREATE = 4900;
  const AT_EDIT_FROM = 8350;
  const AT_EDIT = 8900;
  const LEAVE_AT = 11_250;
  const LEAVES = 12_000;

  type Waypoint = { t: number; x: number; y: number };

  /** Deterministic value in [0, 1) for a seed, so a path does not redraw itself from frame to frame. */
  function noise(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /** Minimum-jerk progress: a hand speeds up, coasts, and slows down, rather than easing both ends alike. */
  function minJerk(p: number): number {
    return p * p * p * (10 + p * (-15 + 6 * p));
  }

  function smoothstep(p: number): number {
    return p * p * (3 - 2 * p);
  }

  /** A hand is never completely still: sub-pixel tremor on two incommensurate clocks. */
  function tremorAt(t: number): { x: number; y: number } {
    return {
      x: 0.32 * Math.sin(t * 0.047) + 0.18 * Math.sin(t * 0.019 + 1.3),
      y: 0.3 * Math.sin(t * 0.041 + 2.1) + 0.16 * Math.sin(t * 0.023 + 4.2),
    };
  }

  /**
   * The pointer's position at `t`: a hand-like path between waypoints, holding on each one. A move leaves rest,
   * bows slightly off the straight line, overshoots the target a little, and is corrected before the click fires;
   * between moves the hand trembles faintly rather than freezing.
   */
  function cursorAt(waypoints: Waypoint[], t: number): { x: number; y: number } {
    const first = waypoints[0];
    const last = waypoints[waypoints.length - 1];
    if (!first || !last) return { x: 0, y: 0 };
    const tremor = tremorAt(t);
    const at = (point: Waypoint) => ({ x: point.x + tremor.x, y: point.y + tremor.y });
    if (t <= first.t) return at(first);
    if (t >= last.t) return at(last);
    for (let i = 1; i < waypoints.length; i += 1) {
      const from = waypoints[i - 1];
      const to = waypoints[i];
      if (!from || !to || t > to.t) continue;
      const span = to.t - from.t;
      const p = span <= 0 ? 1 : (t - from.t) / span;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) return at(to);
      // A fast flick lands a touch long and is corrected; a slow, careful move goes straight in. The overshoot
      // peaks shortly before the waypoint and is gone by the time the click fires.
      const speed = dist / Math.max(span, 1);
      const overshoot = (Math.min(dist * 0.035, 12) * Math.min(1, speed / 0.45)) / dist;
      const approach = 0.8;
      const progress =
        p < approach
          ? minJerk(p / approach) * (1 + overshoot)
          : 1 + overshoot * (1 - smoothstep((p - approach) / (1 - approach)));
      // Hands bow rather than track a straight line; the bow is zero at both ends.
      const bow = (noise(i * 7.3 + from.t * 0.011 + to.t * 0.003) * 2 - 1) * Math.min(dist * 0.03, 9);
      const sway = bow * Math.sin(Math.PI * p);
      return {
        x: from.x + dx * progress - (dy / dist) * sway + tremor.x,
        y: from.y + dy * progress + (dx / dist) * sway + tremor.y,
      };
    }
    return at(last);
  }

  /** The slug a real create would take from an address: the last path segment, or the host's first label. */
  function slugFrom(value: string): string {
    const clean = value.trim().replace(/^https?:\/\//i, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
    const parts = clean.split('/').filter(Boolean);
    const tail = parts.length > 1 ? (parts[parts.length - 1] ?? '') : (parts[0] ?? 'code').split('.').filter(Boolean)[0];
    return (tail ?? 'code').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'code';
  }

  function titleFrom(value: string): string {
    const words = slugFrom(value).replace(/-/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  const qrStyle = withQrStyleDefaults(presetStyleById(DEFAULT_QR_PRESET_ID));

  let sectionEl: HTMLElement | undefined = $state();
  let windowEl: HTMLElement | undefined = $state();
  let fieldEl: HTMLElement | undefined = $state();
  let createEl: HTMLElement | undefined = $state();
  let pencilEl: HTMLElement | undefined = $state();
  /** The pencil's last measured centre: the button gives way to the edit input while the demo types. */
  let pencilAnchor: { x: number; y: number } | undefined;
  /** The rest spot, kept for the current width so a row landing or leaving does not make the pointer hop. */
  let restAnchor: { x: number; y: number } | undefined;
  let restWidth = -1;

  let destination = $state('');
  let links = $state<DemoLink[]>([]);
  let query = $state('');
  let editingCode = $state<string | null>(null);
  let editValue = $state('');
  let openQr = $state<string | null>(null);
  let focusField = $state(false);
  let pressing = $state('');
  let ripple = $state(0);
  let copiedCode = $state<string | null>(null);
  let demo = $state(true);
  let live = $state(false);
  let motionOk = $state(false);
  let phaseT = $state(0);
  let waypoints = $state<Waypoint[]>([]);
  /** Plain, not reactive: only the frame it drives should re-render. */
  let clock = 0;
  let fired = new Set<number>();

  const cursor = $derived(cursorAt(waypoints, phaseT));
  const showing = $derived(demo && live);
  const needle = $derived(query.trim().toLowerCase());
  const visible = $derived(
    needle
      ? links.filter((link) =>
          [link.title, link.code, link.destination].some((field) => field.toLowerCase().includes(needle)),
        )
      : links,
  );
  const totalScans = $derived(links.reduce((sum, link) => sum + link.scans, 0));
  const aggregatePoints = $derived(
    links.length === 0 ? [] : SCAN_POINTS.map((_, hour) => links.reduce((sum, link) => sum + (link.points[hour] ?? 0), 0)),
  );
  const firstScans = $derived(links[0]?.scans ?? 0);

  function createLink() {
    const value = destination.trim();
    if (!value) return;
    const code = slugFrom(value);
    links = [
      { code, title: titleFrom(value), destination: value, scans: 0, points: [0, 0, 0, 0, 0, 0] },
      ...links.filter((link) => link.code !== code),
    ];
    destination = '';
    openQr = null;
  }

  function startEdit(code: string) {
    const link = links.find((row) => row.code === code);
    if (!link) return;
    editingCode = code;
    editValue = link.destination;
  }

  function saveEdit() {
    const link = links.find((row) => row.code === editingCode);
    if (link && editValue.trim()) link.destination = editValue.trim();
    editingCode = null;
  }

  function deleteLink(code: string) {
    links = links.filter((row) => row.code !== code);
    if (openQr === code) openQr = null;
  }

  function press(what: string) {
    pressing = what;
    ripple += 1;
    setTimeout(() => {
      if (pressing === what) pressing = '';
    }, 200);
  }

  function takeOver() {
    demo = false;
    focusField = false;
  }

  function replay() {
    destination = '';
    links = [];
    editingCode = null;
    editValue = '';
    openQr = null;
    query = '';
    focusField = false;
    clock = 0;
    phaseT = 0;
    fired = new Set();
    demo = true;
  }

  /** The scripted pass: it drives the same state the visitor's own clicks do. */
  function runScript(t: number, wrapped: boolean) {
    if (wrapped) {
      destination = '';
      links = [];
      editingCode = null;
      editValue = '';
      openQr = null;
      focusField = false;
      fired = new Set();
    }
    if (t >= FIELD_CLICK && t < TYPED) {
      focusField = true;
      const chars = Math.round(((t - FIELD_CLICK) / (TYPED - FIELD_CLICK)) * DESTINATION.length);
      destination = DESTINATION.slice(0, Math.max(1, chars));
    }
    if (editingCode && t >= EDIT_CLICK && t < EDITED_AT) {
      const chars = Math.round(((t - EDIT_CLICK) / (EDITED_AT - EDIT_CLICK)) * EDITED.length);
      editValue = EDITED.slice(0, Math.max(1, chars));
    }
    const link = links[0];
    if (link && t >= ROW_IN && t < SCANS_DONE) {
      const p = (t - ROW_IN) / (SCANS_DONE - ROW_IN);
      link.scans = Math.round(SCAN_TOTAL * (1 - (1 - p) ** 3));
      if (p > 0.3) link.points = SCAN_POINTS;
    }
    for (const step of SCRIPT) {
      if (t >= step.at && !fired.has(step.at)) {
        fired.add(step.at);
        step.run();
      }
    }
  }

  const SCRIPT: { at: number; run: () => void }[] = [
    {
      at: FIELD_CLICK,
      run: () => {
        focusField = true;
        press('field');
      },
    },
    {
      at: CREATE_CLICK,
      run: () => {
        focusField = false;
        press('create');
        createLink();
      },
    },
    {
      at: EDIT_CLICK,
      run: () => {
        press('edit');
        startEdit(links[0]?.code ?? '');
      },
    },
    {
      at: SAVE_CLICK,
      run: () => {
        press('save');
        saveEdit();
      },
    },
  ];

  function measure() {
    const base = windowEl?.getBoundingClientRect();
    if (!base || !fieldEl || !createEl) return;
    const center = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left - base.left + rect.width / 2, y: rect.top - base.top + rect.height / 2 };
    };
    // Rest sits a fixed distance above the bottom edge and stays put for a given width: the empty state is taller
    // than a row, and the pointer should not hop when the window grows or shrinks.
    if (!restAnchor || Math.abs(base.width - restWidth) > 0.5) {
      restWidth = base.width;
      restAnchor = { x: base.width * 0.86, y: base.height - 30 };
    } else {
      restAnchor = { x: restAnchor.x, y: Math.min(restAnchor.y, base.height - 30) };
    }
    const rest = restAnchor;
    const field = center(fieldEl);
    const create = center(createEl);
    // The pencil only exists once the demo's row does, and not while the edit input replaces it; keep the last
    // place it was measured so the pointer does not jump while the demo types.
    if (pencilEl) pencilAnchor = center(pencilEl);
    const pencil = pencilAnchor ?? create;
    waypoints = [
      { t: 0, ...rest },
      { t: REST_UNTIL, ...rest },
      { t: AT_FIELD, ...field },
      { t: TYPED, ...field },
      { t: FIELD_BEAT, ...field },
      { t: AT_CREATE, ...create },
      { t: AT_EDIT_FROM, ...create },
      { t: AT_EDIT, ...pencil },
      { t: LEAVE_AT, ...pencil },
      { t: LEAVES, ...rest },
    ];
  }

  $effect(() => {
    // Re-measure when a row appears or leaves and when a bound element is swapped (the pencil gives way to the
    // edit input). `measure` must only read the element refs and write `waypoints` — reading what it writes
    // would make this effect re-run on its own output.
    links;
    editingCode;
    measure();
  });

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // No pointer, no script: the window shows one finished link.
      demo = false;
      destination = '';
      links = [
        { code: 'spring-menu', title: 'Spring menu', destination: EDITED, scans: SCAN_TOTAL, points: SCAN_POINTS },
      ];
      return;
    }
    motionOk = true;
    measure();
    const observer = new ResizeObserver(measure);
    if (windowEl) observer.observe(windowEl);
    if (typeof IntersectionObserver !== 'undefined' && sectionEl) {
      const onScreen = new IntersectionObserver(
        (entries) => {
          live = entries.some((entry) => entry.isIntersecting);
        },
        { rootMargin: '0px 0px -12% 0px' },
      );
      onScreen.observe(sectionEl);
      return () => {
        observer.disconnect();
        onScreen.disconnect();
      };
    }
    live = true;
    return () => observer.disconnect();
  });

  $effect(() => {
    if (!live || !motionOk || !demo) return;
    let last = performance.now();
    let t = clock;
    let frame = requestAnimationFrame(function tick(now) {
      const prev = t;
      t = (t + (now - last)) % CYCLE;
      last = now;
      clock = t;
      phaseT = t;
      runScript(t, t < prev);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  });
</script>

<section
  bind:this={sectionEl}
  id="dashboard-preview"
  class="dp-section"
  data-testid="dashboard-preview"
>
  <div class="dp-container">
    <div class="dp-intro">
      <h2 class="qq-section-title">Create a code in seconds</h2>
      <p class="dp-intro-p">
        This is the dashboard. Type where the code should point, press Create, and it is live. Then change the
        destination whenever you like, because what you printed stays the same.
      </p>
    </div>

    <div class="dp-window" bind:this={windowEl}>
      <Card class="dp-main-card">
        <div class="dp-sidebar-grid">
          <aside class="dp-aside">
            <div class="dp-aside-header">
              <Logo wordmark={false} markClass="dp-logo-mark" />
              <span class="dp-logo-text">
                quickqr<span class="dp-sub-muted">.app</span>
              </span>
            </div>
            <p class="dp-workspace-label">
              Workspace
            </p>
            <nav class="dp-nav">
              <span class="dp-nav-item-active">
                <Link2 class="dp-icon" />Dynamic links
              </span>
              <span class="dp-nav-item">
                <UtensilsCrossed class="dp-icon-inactive" />Menus
              </span>
              <span class="dp-nav-item">
                <Files class="dp-icon-inactive" />Link pages
              </span>
            </nav>
            <div class="dp-plan-box">
              <div class="dp-plan-title">Free plan</div>
              <div class="dp-plan-desc">
                Codes never expire. A short sponsor screen keeps them free.
              </div>
            </div>
          </aside>

          <div class="dp-content">
            <div class="dp-header">
              <span class="dp-header-title">Dynamic links</span>
              <span class="dp-header-btn">
                <ScanLine class="dp-icon-header" />Scan
              </span>
              <span class="dp-header-btn">
                <Plus class="dp-icon-header" />Create code
              </span>
              <span class="dp-avatar-btn">
                <Moon class="dp-icon-header" />
              </span>
              <span class="dp-avatar">A</span>
            </div>

            <div class="dp-main-area">
              <div class="dp-header-row">
                <div>
                  <div class="dp-title">Dynamic links</div>
                  <p class="dp-subtitle">
                    Change the destination anytime. The printed code stays the same.
                  </p>
                </div>
                <span
                  class="dp-create-btn {pressing === 'create' ? 'dp-scale-95' : ''}"
                >
                  + Create code
                </span>
              </div>

              <div class="dp-cards-grid">
                <Card class="dp-stat-card">
                  <div class="dp-stat-label">Dynamic scans</div>
                  <div class="dp-stat-value-big">
                    <div class="dp-stat-num" data-testid="demo-total-scans">
                      {totalScans.toLocaleString()}
                    </div>
                    <span class="dp-stat-punch">
                      <Sparkline points={aggregatePoints} class="dp-spark-lg" label="Scan trend for all dynamic links" />
                    </span>
                  </div>
                  <p class="dp-stat-change {firstScans > 0 ? 'dp-stat-punch' : 'dp-stat-white65'}">
                    {firstScans > 0 ? '+100% vs last hour' : '0% vs last hour'}
                  </p>
                </Card>
                <Card class="dp-simple-card">
                  <div class="dp-simple-label">Dynamic links</div>
                  <div class="dp-simple-value">{links.length}</div>
                </Card>
                <Card class="dp-simple-card">
                  <div class="dp-simple-label">Menus</div>
                  <div class="dp-simple-value">0</div>
                </Card>
                <Card class="dp-simple-card">
                  <div class="dp-simple-label">Link pages</div>
                  <div class="dp-simple-value">0</div>
                </Card>
              </div>

              <div class="dp-search-wrap">
                <Search class="dp-search-icon" />
                <Input
                  type="text"
                  bind:value={query}
                  oninput={takeOver}
                  placeholder="Search links..."
                  aria-label="Search links in the demo"
                  class="dp-search-input"
                />
              </div>

              <div class="dp-url-bar">
                <span class="demo-focus-ring dp-focus-ring {focusField ? 'dp-opacity-100' : 'dp-opacity-0'}"></span>
                <span class="dp-url-label">
                  Destination URL
                </span>
                <span class="dp-field-wrap" bind:this={fieldEl}>
                  <Input
                    bind:value={destination}
                    oninput={takeOver}
                    placeholder="https://yoursite.com/menu"
                    aria-label="Destination URL in the demo"
                    class="dp-url-input font-mono"
                  />
                </span>
                {#if showing && focusField}
                  <span class="demo-caret dp-caret"></span>
                {/if}
                <span class="dp-create-wrap" bind:this={createEl}>
                  <Button
                    type="button"
                    size="sm"
                    class="dp-create-button {pressing === 'create' ? 'dp-scale-95' : ''}"
                    onclick={() => {
                      takeOver();
                      createLink();
                    }}
                  >
                    Create
                    <ArrowRight class="dp-icon-sm" />
                  </Button>
                </span>
              </div>

              <Card class="dp-table-card">
                <table class="dp-table">
                  <thead>
                    <tr class="dp-thead-row">
                      <th class="dp-th-title">Title &amp; Code</th>
                      <th class="dp-th-url">Destination URL</th>
                      <th class="dp-th-scans">Scans</th>
                      <th class="dp-th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#if visible.length === 0}
                      <tr>
                        <td colspan="4" class="dp-empty">
                          No dynamic links found.
                        </td>
                      </tr>
                    {/if}
                    {#each visible as link (link.code)}
                      <tr class="dp-row" data-testid="demo-row">
                        <td class="dp-cell-title">
                          <div class="dp-link-title">{link.title}</div>
                          <div class="dp-link-code font-mono">/r/{link.code}</div>
                        </td>
                        <td class="dp-cell-url">
                          {#if editingCode === link.code}
                            <div class="dp-edit-wrap">
                              <Input
                                bind:value={editValue}
                                oninput={takeOver}
                                aria-label="Edit destination URL"
                                class="dp-edit-input font-mono"
                              />
                              <button
                                type="button"
                                onclick={() => {
                                  takeOver();
                                  saveEdit();
                                }}
                                title="Save"
                                aria-label="Save destination"
                                class="dp-save-btn"
                              >
                                <Check class="dp-icon-check" />
                              </button>
                              <button
                                type="button"
                                onclick={() => {
                                  takeOver();
                                  editingCode = null;
                                }}
                                class="dp-cancel-btn"
                              >
                                Cancel
                              </button>
                            </div>
                          {:else}
                            <div class="dp-dest-group">
                              <span
                                class="dp-dest-span font-mono"
                                data-testid="demo-destination"
                              >
                                {link.destination}
                              </span>
                              <button
                                type="button"
                                onclick={() => {
                                  takeOver();
                                  startEdit(link.code);
                                }}
                                title="Edit destination URL"
                                aria-label="Edit destination URL"
                                class="dp-pencil-btn {showing ? 'dp-opacity-0' : 'dp-opacity-100'}"
                                bind:this={pencilEl}
                              >
                                <Edit2 class="dp-icon-edit" />
                              </button>
                            </div>
                          {/if}
                        </td>
                        <td class="dp-cell-scans">
                          <div class="dp-scans-wrap">
                            <span class="dp-scans-num font-mono" data-testid="demo-scans">
                              {link.scans.toLocaleString()}
                            </span>
                            <span class="dp-emerald">
                              <Sparkline points={link.points} class="dp-spark-sm" label="Scan trend over the last six hours" />
                            </span>
                          </div>
                          {#if link.scans > 0}
                            <span class="dp-delta">
                              +100% vs last hour
                            </span>
                          {/if}
                        </td>
                        <td class="dp-cell-actions">
                          <div class="dp-actions-wrap">
                            <button
                              type="button"
                              data-testid="demo-show-qr"
                              aria-label="Show QR Code"
                              aria-expanded={openQr === link.code}
                              title="Show QR Code"
                              onclick={() => {
                                takeOver();
                                openQr = openQr === link.code ? null : link.code;
                              }}
                              class="dp-qr-btn {openQr === link.code
                                ? 'dp-qr-active'
                                : 'dp-qr-inactive'}"
                            >
                              <QrCode class="dp-icon-qr" />
                            </button>
                            <LinkRowMenu
                              code={link.code}
                              copied={copiedCode === link.code}
                              onCopy={() => {
                                takeOver();
                                navigator.clipboard?.writeText(`https://quickqr.app/r/${link.code}`).then(
                                  () => {
                                    copiedCode = link.code;
                                    setTimeout(() => {
                                      if (copiedCode === link.code) copiedCode = null;
                                    }, 1500);
                                  },
                                  () => {},
                                );
                              }}
                              onEdit={() => {
                                takeOver();
                                startEdit(link.code);
                              }}
                              onOpenLink={() => window.open(link.destination, '_blank', 'noopener')}
                              onDelete={() => {
                                takeOver();
                                deleteLink(link.code);
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                      {#if openQr === link.code}
                        <tr class="dp-row" data-testid="demo-qr-panel">
                          <td colspan="4" class="dp-qr-panel-cell">
                            <div class="dp-qr-box">
                              <div class="dp-qr-canvas-wrap">
                                <QRCanvas
                                  value={`https://quickqr.app/r/${link.code}`}
                                  style={qrStyle}
                                  label={`${link.title} QR code`}
                                  size={112}
                                  inline
                                />
                              </div>
                              <div class="dp-qr-info">
                                <div class="dp-qr-url font-mono">https://quickqr.app/r/{link.code}</div>
                                <p class="dp-qr-desc">
                                  This code never changes. Edit its destination any time from the dashboard.
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      {/if}
                    {/each}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        </div>
      </Card>

      {#if showing}
        <div
          class="demo-pointer dp-pointer"
          style="transform: translate3d({cursor.x}px, {cursor.y}px, 0)"
        >
          {#key ripple}
            <span class="demo-click dp-click"></span>
          {/key}
          <svg viewBox="0 0 14 20" class="dp-pointer-svg">
            <path d="M1 1v14.6l3.6-3.4 2.3 5.4 2.3-1-2.3-5.3h4.6z" fill="var(--foreground)" stroke="var(--card)" stroke-width="1.2" />
          </svg>
        </div>
      {/if}
    </div>

    <div class="dp-footer">
      <p class="dp-footer-p">
        Sign in to make a real code, or
        <a class="dp-footer-link" href="/dashboard">open your dashboard</a>.
      </p>
      {#if !demo && motionOk}
        <Button type="button" variant="outline" size="sm" onclick={replay}>
          <RotateCcw class="dp-icon-replay" />
          Watch it again
        </Button>
      {/if}
    </div>
  </div>
</section>

<style>
  .demo-caret {
    animation: demo-blink 1s steps(1, end) infinite;
  }

  .demo-click {
    animation: demo-ripple 420ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }

  .demo-focus-ring {
    transition: opacity 200ms ease;
  }

  @keyframes demo-blink {
    0%,
    49% {
      opacity: 1;
    }
    50%,
    100% {
      opacity: 0;
    }
  }

  @keyframes demo-ripple {
    from {
      opacity: 0.55;
      transform: scale(0.4);
    }
    to {
      opacity: 0;
      transform: scale(1.9);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .demo-caret,
    .demo-click {
      animation: none;
    }
  }
  @layer components {
    .dp-section {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
      padding-top: 4rem;
      padding-bottom: 4rem;
    }

    .dp-container {
      margin-inline: auto;
      max-width: 1120px;
    }

    .dp-intro {
      margin-inline: auto;
      margin-bottom: 2.5rem;
      max-width: 32rem;
      text-align: center;
    }

    .dp-intro-p {
      margin-top: 0.75rem;
      font-size: 1rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .dp-window {
      position: relative;
    }

    :global(.dp-main-card) {
      padding: 0;
    }

    .dp-sidebar-grid {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .dp-aside {
      display: none;
      border-right: 1px solid var(--border);
      background-color: color-mix(in oklab, var(--muted) 40%, transparent);
      padding: 0.75rem;
    }

    .dp-aside-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-left: 0.375rem;
      padding-right: 0.375rem;
      padding-bottom: 0.75rem;
    }

    .dp-logo-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: -0.03em;
    }

    .dp-sub-muted {
      color: var(--muted-foreground);
    }

    .dp-workspace-label {
      padding-left: 0.625rem;
      padding-right: 0.625rem;
      padding-bottom: 0.5rem;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
    }

    .dp-nav {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .dp-nav-item-active {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: var(--radius);
      background-color: var(--card);
      padding-left: 0.625rem;
      padding-right: 0.625rem;
      padding-top: 0.375rem;
      padding-bottom: 0.375rem;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 0 0 1px rgb(0 0 0 / 0.05);
    }

    .dp-nav-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: var(--radius);
      padding-left: 0.625rem;
      padding-right: 0.625rem;
      padding-top: 0.375rem;
      padding-bottom: 0.375rem;
      font-size: 12px;
      color: var(--muted-foreground);
    }

    :global(.dp-icon) {
      width: 0.875rem;
      height: 0.875rem;
      color: var(--muted-foreground);
    }

    :global(.dp-icon-inactive) {
      width: 0.875rem;
      height: 0.875rem;
    }

    .dp-plan-box {
      margin-top: 1rem;
      border-radius: calc(var(--radius) * 1.4);
      background-color: color-mix(in oklab, var(--muted) 60%, transparent);
      padding: 0.75rem;
    }

    .dp-plan-title {
      font-size: 11px;
      font-weight: 500;
      color: var(--foreground);
    }

    .dp-plan-desc {
      margin-top: 0.125rem;
      font-size: 10px;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .dp-content {
      min-width: 0;
    }

    .dp-header {
      display: flex;
      height: 3rem;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border);
      padding-left: 0.75rem;
      padding-right: 0.75rem;
    }

    .dp-header-title {
      min-width: 0;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: -0.02em;
    }

    .dp-header-btn {
      display: none;
      height: 1.75rem;
      align-items: center;
      gap: 0.375rem;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background-color: var(--card);
      padding-left: 0.5rem;
      padding-right: 0.5rem;
      font-size: 12px;
      color: var(--muted-foreground);
    }

    :global(.dp-icon-header) {
      width: 0.875rem;
      height: 0.875rem;
    }

    .dp-avatar-btn {
      display: grid;
      width: 1.75rem;
      height: 1.75rem;
      place-items: center;
      border-radius: var(--radius);
      color: var(--muted-foreground);
    }

    .dp-avatar {
      display: grid;
      width: 1.5rem;
      height: 1.5rem;
      flex-shrink: 0;
      place-items: center;
      border-radius: 9999px;
      background-color: var(--muted);
      font-size: 10px;
      font-weight: 600;
    }

    .dp-main-area {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }

    .dp-header-row {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .dp-title {
      font-size: 1.125rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--foreground);
    }

    .dp-subtitle {
      margin-top: 0.25rem;
      font-size: 13px;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .dp-create-btn {
      display: inline-flex;
      height: 2.25rem;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      border-radius: var(--radius);
      background-color: var(--punch);
      padding-left: 0.75rem;
      padding-right: 0.75rem;
      font-size: 13px;
      font-weight: 500;
      color: var(--ink);
      transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .dp-scale-95 {
      transform: scale(0.95);
    }

    .dp-cards-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    :global(.dp-stat-card) {
      border: 0;
      background-color: var(--ink);
      padding: 0.875rem;
      color: var(--primary-foreground);
      box-shadow: none;
    }

    .dp-stat-label {
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: rgb(255 255 255 / 0.55);
    }

    .dp-stat-value-big {
      margin-top: 0.375rem;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .dp-stat-num {
      font-size: 1.25rem;
      font-weight: 500;
      letter-spacing: -0.04em;
      color: var(--punch);
    }

    .dp-stat-change {
      margin-top: 0.25rem;
      font-size: 10px;
      font-weight: 500;
    }

    .dp-stat-punch {
      color: var(--punch);
    }

    .dp-stat-white65 {
      color: rgb(255 255 255 / 0.65);
    }

    :global(.dp-simple-card) {
      padding: 0.875rem;
    }

    .dp-simple-label {
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted-foreground);
    }

    .dp-simple-value {
      margin-top: 0.375rem;
      font-size: 1.25rem;
      font-weight: 500;
      letter-spacing: -0.04em;
      color: var(--foreground);
    }

    .dp-search-wrap {
      position: relative;
    }

    :global(.dp-search-icon) {
      pointer-events: none;
      position: absolute;
      top: 50%;
      left: 0.75rem;
      width: 0.875rem;
      height: 0.875rem;
      transform: translateY(-50%);
      color: var(--muted-foreground);
    }

    :global(.dp-search-input) {
      height: 2.25rem;
      padding-left: 2.25rem;
      font-size: 0.875rem;
    }

    .dp-url-bar {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.625rem;
      border-radius: calc(var(--radius) * 1.4);
      border: 1px solid var(--border);
      background-color: var(--background);
      padding-left: 0.75rem;
      padding-right: 0.75rem;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
    }

    .dp-focus-ring {
      pointer-events: none;
      position: absolute;
      inset: 0;
      border-radius: calc(var(--radius) * 1.4);
      box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
    }

    .dp-url-label {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
    }

    .dp-field-wrap {
      position: relative;
      min-width: 0;
      flex: 1;
    }

    :global(.dp-url-input) {
      height: 1.75rem;
      width: 100%;
      border: 0;
      background-color: transparent;
      padding-left: 0;
      padding-right: 0;
      font-size: 11px;
      box-shadow: none;
    }

    .dp-caret {
      display: inline-block;
      height: 0.75rem;
      width: 1px;
      background-color: var(--foreground);
    }

    .dp-create-wrap {
      flex-shrink: 0;
    }

    :global(.dp-create-button) {
      height: 1.75rem;
      background-color: var(--punch);
      color: var(--ink);
      transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    :global(.dp-icon-sm) {
      width: 0.875rem;
      height: 0.875rem;
    }

    :global(.dp-table-card) {
      overflow: hidden;
      padding-top: 0;
      padding-bottom: 0;
    }

    .dp-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.75rem;
    }

    .dp-thead-row {
      border-bottom: 1px solid var(--border);
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
    }

    .dp-th-title {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.75rem;
    }

    .dp-th-url {
      display: none;
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.5rem;
    }

    .dp-th-scans {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.5rem;
      text-align: right;
    }

    .dp-th-actions {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 0.75rem;
      padding-left: 0.5rem;
      text-align: right;
    }

    .dp-empty {
      padding: 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .dp-row {
      border-bottom: 1px solid var(--border);
    }

    .dp-cell-title {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.75rem;
      vertical-align: top;
    }

    .dp-link-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--foreground);
    }

    .dp-link-code {
      font-size: 11px;
      color: var(--muted-foreground);
    }

    .dp-cell-url {
      display: none;
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.5rem;
      vertical-align: top;
    }

    .dp-edit-wrap {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    :global(.dp-edit-input) {
      height: 1.75rem;
      width: 220px;
      font-size: 11px;
    }

    .dp-save-btn {
      display: grid;
      width: 1.5rem;
      height: 1.5rem;
      cursor: pointer;
      place-items: center;
      border-radius: var(--radius);
      background-color: var(--primary);
      color: var(--primary-foreground);
    }

    .dp-save-btn:hover {
      background-color: color-mix(in oklab, var(--primary) 88%, transparent);
    }

    :global(.dp-icon-check) {
      width: 0.875rem;
      height: 0.875rem;
    }

    .dp-cancel-btn {
      cursor: pointer;
      padding-left: 0.25rem;
      padding-right: 0.25rem;
      font-size: 11px;
      color: var(--muted-foreground);
    }

    .dp-dest-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dp-dest-span {
      max-width: 240px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: inherit;
      font-size: 11px;
      color: var(--muted-foreground);
    }

    .dp-pencil-btn {
      cursor: pointer;
      padding: 0.25rem;
      color: var(--muted-foreground);
      transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    :global(.dp-icon-edit) {
      width: 0.75rem;
      height: 0.75rem;
    }

    .dp-cell-scans {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 1rem;
      padding-left: 0.5rem;
      text-align: right;
      vertical-align: top;
    }

    .dp-scans-wrap {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .dp-scans-num {
      font-size: 13px;
      font-weight: 600;
      color: var(--foreground);
    }

    .dp-emerald {
      color: oklch(0.596 0.145 163.225);
    }

    :global(.dp-spark-lg) {
      height: 1.25rem;
      width: 4rem;
    }

    :global(.dp-spark-sm) {
      height: 1rem;
      width: 3.5rem;
    }

    .dp-delta {
      font-size: 10px;
      font-weight: 500;
      color: oklch(0.596 0.145 163.225);
    }

    .dp-cell-actions {
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
      padding-right: 0.75rem;
      padding-left: 0.5rem;
      text-align: right;
      vertical-align: top;
    }

    .dp-actions-wrap {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.375rem;
    }

    .dp-qr-btn {
      display: grid;
      width: 1.75rem;
      height: 1.75rem;
      cursor: pointer;
      place-items: center;
      border-radius: var(--radius);
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .dp-qr-active {
      background-color: var(--ink);
      color: var(--punch);
    }

    .dp-qr-inactive {
      color: var(--muted-foreground);
    }

    :global(.dp-icon-qr) {
      width: 1rem;
      height: 1rem;
    }

    .dp-qr-panel-cell {
      background-color: color-mix(in oklab, var(--muted) 40%, transparent);
      padding-left: 1rem;
      padding-right: 1rem;
      padding-top: 1rem;
      padding-bottom: 1rem;
    }

    .dp-qr-box {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .dp-qr-canvas-wrap {
      border-radius: calc(var(--radius) * 1.4);
      background-color: #ffffff;
      padding: 0.5rem;
    }

    .dp-qr-info {
      min-width: 0;
    }

    .dp-qr-url {
      font-size: 11px;
      color: var(--foreground);
    }

    .dp-qr-desc {
      margin-top: 0.25rem;
      font-size: 11px;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .dp-footer {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .dp-footer-p {
      font-size: 13px;
      color: var(--muted-foreground);
    }

    .dp-footer-link {
      font-weight: 500;
      color: var(--foreground);
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    :global(.dp-icon-replay) {
      width: 0.875rem;
      height: 0.875rem;
    }

    .dp-pointer {
      pointer-events: none;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 20;
    }

    .dp-click {
      position: absolute;
      top: -0.5rem;
      left: -0.5rem;
      display: block;
      width: 1rem;
      height: 1rem;
      border-radius: 9999px;
      box-shadow: 0 0 0 2px color-mix(in oklab, var(--foreground) 40%, transparent);
    }

    .dp-pointer-svg {
      position: relative;
      height: 1rem;
      width: 0.75rem;
    }

    .dp-opacity-0 {
      opacity: 0;
    }

    .dp-opacity-100 {
      opacity: 1;
    }
  }

  :global(.dp-create-button:hover) {
    background-color: color-mix(in oklab, var(--punch) 80%, transparent);
  }

  .dp-pencil-btn:hover {
    color: var(--foreground);
  }

  .dp-dest-group:hover .dp-pencil-btn {
    opacity: 1;
  }

  .dp-qr-inactive:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }

  .dp-cancel-btn:hover {
    color: var(--foreground);
  }

  :global(.dark) .dp-nav-item-active {
    box-shadow: 0 0 0 1px rgb(255 255 255 / 0.1);
  }

  :global(.dark) .dp-thead-row {
    color: var(--muted-foreground);
  }

  :global(.dark) .dp-emerald,
  :global(.dark) .dp-delta {
    color: oklch(76.5% 0.177 163.223);
  }

  @media (min-width: 40rem) {
    .dp-section {
      padding-top: 5rem;
      padding-bottom: 5rem;
    }

    .dp-header-btn {
      display: inline-flex;
    }

    .dp-th-url {
      display: table-cell;
    }

    .dp-cell-url {
      display: table-cell;
    }

    .dp-footer {
      flex-direction: row;
      justify-content: space-between;
    }
  }

  @media (min-width: 48rem) {
    .dp-section {
      padding-left: 2.5rem;
      padding-right: 2.5rem;
    }

    .dp-intro {
      text-align: left;
    }

    .dp-aside {
      display: block;
    }

    .dp-sidebar-grid {
      grid-template-columns: 188px 1fr;
    }

    .dp-header {
      padding-left: 1rem;
      padding-right: 1rem;
    }

    .dp-main-area {
      padding: 1.25rem;
    }

    .dp-header-row {
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
    }

    .dp-cards-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  :global(.dp-search-input:focus-visible),
  :global(.dp-url-input:focus-visible),
  :global(.dp-edit-input:focus-visible) {
    box-shadow: none;
  }

  :global(.dp-logo-mark) {
    width: 1.25rem;
    height: 1.25rem;
  }
</style>
