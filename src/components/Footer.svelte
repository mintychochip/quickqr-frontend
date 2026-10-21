<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Button from '@/lib/components/ui/button.svelte';
  import Dialog from '@/lib/components/ui/dialog.svelte';
  import Logo from './Logo.svelte';

  type LegalModalType = 'privacy' | 'terms' | 'ad-disclosure' | 'trademark';

  let activeModal = $state<LegalModalType | null>(null);
  let dialogOpen = $state(false);

  const year = new Date().getFullYear();

  const docsHref = import.meta.env.VITE_DOCS_URL || '/docs';

  const productLinks: { href: string; label: string }[] = [
    { href: '/#generator', label: 'Create QR' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: docsHref, label: 'Docs' },
    { href: '/#preview', label: 'Redirect preview' },
  ];

  const legalLinks: { key: LegalModalType; label: string }[] = [
    { key: 'privacy', label: 'Privacy' },
    { key: 'terms', label: 'Terms' },
    { key: 'ad-disclosure', label: 'Ads' },
    { key: 'trademark', label: 'Trademark' },
  ];

  function openLegal(key: LegalModalType) {
    activeModal = key;
    dialogOpen = true;
  }

  const legalTitles: Record<LegalModalType, string> = {
    privacy: 'Privacy Policy · Camera scanner protection',
    terms: 'Terms of Service · Link permanence',
    'ad-disclosure': 'Ad-subsidy disclosure',
    trademark: 'DENSO WAVE trademark notice',
  };
</script>

<footer class="px-6 pt-12 md:px-10">
  <div class="mx-auto max-w-[1120px]">
    <div class="flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-16">
      <div class="max-w-xs">
        <a href="/" class="inline-flex items-center gap-2 text-left text-foreground" aria-label="quickqr.app home">
          <Logo wordmarkClass="text-[18px]" />
        </a>
        <p class="mt-3 text-[15px] font-medium leading-relaxed text-muted-foreground">
          Free dynamic QR codes. No subscription cliffs on printed links.
        </p>
        <div class="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground">
          <span class="size-1.5 rounded-full bg-punch" aria-hidden="true"></span>
          Gateways operational
        </div>
      </div>

      <div class="flex flex-wrap gap-12 sm:gap-16">
        <div>
          <p class="text-[12px] font-semibold uppercase tracking-wider text-foreground">Product</p>
          <ul class="mt-3 space-y-2 text-[14px] text-muted-foreground">
            {#each productLinks as { href, label } (href)}
              <li>
                <a href={href} class="transition-colors hover:text-foreground">
                  {label}
                </a>
              </li>
            {/each}
          </ul>
        </div>

        <div>
          <p class="text-[12px] font-semibold uppercase tracking-wider text-foreground">Legal</p>
          <ul class="mt-3 space-y-2 text-[14px] text-muted-foreground">
            {#each legalLinks as { key, label } (key)}
              <li>
                <button
                  type="button"
                  onclick={() => openLegal(key)}
                  class="cursor-pointer transition-colors hover:text-foreground"
                >
                  {label}
                </button>
              </li>
            {/each}
          </ul>
        </div>

        <div>
          <p class="text-[12px] font-semibold uppercase tracking-wider text-foreground">Engine</p>
          <ul class="mt-3 space-y-2 text-[14px] text-muted-foreground">
            <li>
              <a
                href="/healthz"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                Go gateway
                <ArrowUpRight class="size-3.5" />
              </a>
            </li>
            <li>
              <a href="mailto:sponsor@quickqr2.app" class="transition-colors hover:text-foreground">
                Sponsor a slot
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <p class="mt-10 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
      <strong class="font-medium text-foreground">QR Code</strong> is a registered trademark of
      <strong class="font-medium text-foreground">DENSO WAVE INCORPORATED</strong>. quickqr.app is not affiliated
      with or endorsed by DENSO WAVE INCORPORATED.
    </p>

    <div
      class="mt-8 flex flex-col gap-5 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-[13px] leading-snug text-muted-foreground">
        <span>© {year}</span>
        <a href="/" class="font-medium text-primary transition-opacity hover:opacity-80">
          quickqr.app
        </a>
        <span aria-hidden="true" class="mx-1.5">·</span>
        <span>Zero-paywall redirects</span>
      </p>

      <div class="flex flex-wrap items-center gap-4 text-muted-foreground">
        {#each legalLinks.slice(0, 2) as { key, label } (key)}
          <button
            type="button"
            onclick={() => openLegal(key)}
            class="cursor-pointer text-[13px] transition-colors hover:text-primary"
          >
            {label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <Dialog bind:open={dialogOpen} class="max-h-[80vh] overflow-y-auto text-sm">
    {#snippet children({ close })}
      {#if activeModal}
        <h2 class="font-heading text-base leading-none font-medium">{legalTitles[activeModal]}</h2>
        <div class="space-y-3 text-muted-foreground">
          {#if activeModal === 'privacy'}
            <p>
              <strong>Zero personal data harvesting:</strong> quickqr.app does not deploy persistent cookies,
              track browsing histories, or sell user profiling dossiers when someone scans a dynamic code.
            </p>
            <p>
              <strong>Telemetry retention:</strong> Scans log anonymized IP segments, device platform, and
              user-agent category only.
            </p>
            <p>
              <strong>Static compressed codes:</strong> static mode compresses and decompresses entirely in
              the browser—no server log.
            </p>
          {:else if activeModal === 'terms'}
            <p>
              <strong>No subscription expiration:</strong> Dynamic codes are not disabled after an arbitrary
              trial period.
            </p>
            <p>
              <strong>Prohibited content:</strong> Malware, phishing, and deceptive redirects may be
              deactivated immediately.
            </p>
          {:else if activeModal === 'ad-disclosure'}
            <p>
              Commercial QR vendors charge monthly fees after you print. quickqr.app covers infrastructure with a
              brief sponsor screen on scan.
            </p>
          {:else}
            <p>
              <strong>QR Code</strong> is a registered trademark of
              <strong>DENSO WAVE INCORPORATED</strong>.
            </p>
            <p>quickqr.app is independent and unaffiliated with DENSO WAVE INCORPORATED.</p>
          {/if}
        </div>
        <div class="flex justify-end pt-2">
          <Button type="button" size="sm" onclick={close}>Close</Button>
        </div>
      {/if}
    {/snippet}
  </Dialog>
</footer>
