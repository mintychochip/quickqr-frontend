<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Button from '@/lib/components/ui/button.svelte';
  import Dialog from '@/lib/components/ui/dialog.svelte';
  import Logo from './Logo.svelte';

  type LegalModalType = 'ad-disclosure' | 'trademark';

  let activeModal = $state<LegalModalType | null>(null);
  let dialogOpen = $state(false);

  const year = new Date().getFullYear();

  const docsHref = import.meta.env.VITE_DOCS_URL || '/docs';

  const productLinks: { href: string; label: string }[] = [
    { href: '/#generator', label: 'Create QR' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: docsHref, label: 'Docs' },
    { href: '/#pricing', label: 'Pricing' },
  ];

  const legalPageLinks: { href: string; label: string }[] = [
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
  ];

  const legalModalLinks: { key: LegalModalType; label: string }[] = [
    { key: 'ad-disclosure', label: 'Ads' },
    { key: 'trademark', label: 'Trademark' },
  ];

  function openLegal(key: LegalModalType) {
    activeModal = key;
    dialogOpen = true;
  }

  const legalTitles: Record<LegalModalType, string> = {
    'ad-disclosure': 'Ad-subsidy disclosure',
    trademark: 'DENSO WAVE trademark notice',
  };
</script>

<footer class="footer">
  <div class="footer-shell">
    <div class="footer-top">
      <div class="footer-brand-col">
        <a href="/" class="footer-logo-link" aria-label="quickqr.app home">
          <Logo wordmarkClass="footer-wordmark-size" />
        </a>
        <p class="footer-brand-desc">
          Free dynamic QR codes. No subscription cliffs on printed links.
        </p>
        <div class="footer-status">
          <span class="footer-status-dot" aria-hidden="true"></span>
          Gateways operational
        </div>
      </div>

      <div class="footer-links-wrap">
        <div>
          <p class="footer-section-title">Product</p>
          <ul class="footer-list">
            {#each productLinks as { href, label } (href)}
              <li>
                <a href={href} class="footer-list-item-link">
                  {label}
                </a>
              </li>
            {/each}
          </ul>
        </div>

        <div>
          <p class="footer-section-title">Legal</p>
          <ul class="footer-list">
            {#each legalPageLinks as { href, label } (href)}
              <li>
                <a href={href} class="footer-list-item-link">
                  {label}
                </a>
              </li>
            {/each}
            {#each legalModalLinks as { key, label } (key)}
              <li>
                <button
                  type="button"
                  onclick={() => openLegal(key)}
                  class="footer-list-item-btn"
                >
                  {label}
                </button>
              </li>
            {/each}
          </ul>
        </div>

        <div>
          <p class="footer-section-title">Engine</p>
          <ul class="footer-list">
            <li>
              <a
                href="/healthz"
                target="_blank"
                rel="noreferrer"
                class="footer-engine-link"
              >
                Go gateway
                <ArrowUpRight class="footer-engine-icon" />
              </a>
            </li>
            <li>
              <a href="mailto:sponsor@quickqr2.app" class="footer-list-item-link">
                Sponsor a slot
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <p class="footer-trademark">
      <strong class="footer-strong">QR Code</strong> is a registered trademark of
      <strong class="footer-strong">DENSO WAVE INCORPORATED</strong>. quickqr.app is not affiliated
      with or endorsed by DENSO WAVE INCORPORATED.
    </p>

    <div class="footer-bottom">
      <p class="footer-copyright">
        <span>© {year}</span>
        <a href="/" class="footer-copyright-link">
          quickqr.app
        </a>
        <span aria-hidden="true" class="footer-sep">·</span>
        <span>Zero-paywall redirects</span>
      </p>

      <div class="footer-small-legal">
        {#each legalPageLinks as { href, label } (href)}
          <a href={href} class="footer-small-legal-btn">
            {label}
          </a>
        {/each}
      </div>
    </div>
  </div>

  <Dialog bind:open={dialogOpen} class="footer-dialog">
    {#snippet children({ close })}
      {#if activeModal}
        <h2 class="footer-modal-title">{legalTitles[activeModal]}</h2>
        <div class="footer-modal-body">
          {#if activeModal === 'ad-disclosure'}
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
        <div class="footer-modal-close">
          <Button type="button" size="sm" onclick={close}>Close</Button>
        </div>
      {/if}
    {/snippet}
  </Dialog>
</footer>

<style>

  @layer components {
    .footer {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
      padding-top: 3rem;
    }

    .footer-shell {
      margin-left: auto;
      margin-right: auto;
      max-width: 1120px;
    }

    .footer-top {
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
    }

    .footer-brand-col {
      max-width: 20rem;
    }

    .footer-logo-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      text-align: left;
      color: var(--foreground);
    }

    .footer-brand-desc {
      margin-top: 0.75rem;
      font-size: 15px;
      font-weight: 500;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .footer-status {
      margin-top: 1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 12px;
      font-weight: 500;
      color: var(--foreground);
    }

    .footer-status-dot {
      width: 0.375rem;
      height: 0.375rem;
      border-radius: 9999px;
      background-color: var(--punch);
    }

    .footer-links-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 3rem;
    }

    .footer-section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--foreground);
    }

    .footer-list {
      margin-top: 0.75rem;
      font-size: 14px;
      line-height: calc(1.5 * 14px);
    }

    .footer-list > li + li {
      margin-top: 0.5rem;
    }

    .footer-list-item-link,
    .footer-list-item-btn {
      color: var(--muted-foreground);
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .footer-engine-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 14px;
      color: var(--muted-foreground);
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .footer-trademark {
      margin-top: 2.5rem;
      max-width: 42rem;
      font-size: 12px;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .footer-strong {
      font-weight: 500;
      color: var(--foreground);
    }

    .footer-bottom {
      margin-top: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
      padding-bottom: 1.5rem;
    }

    .footer-copyright {
      font-size: 13px;
      line-height: 1.375;
      color: var(--muted-foreground);
    }

    .footer-copyright-link {
      font-weight: 500;
      color: var(--primary);
      transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .footer-sep {
      margin-left: 0.375rem;
      margin-right: 0.375rem;
    }

    .footer-small-legal {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      color: var(--muted-foreground);
    }

    .footer-small-legal-btn {
      cursor: pointer;
      font-size: 13px;
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    :global(.footer-dialog) {
      max-height: 80vh;
      overflow-y: auto;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .footer-modal-title {
      font-family: "Geist Variable", sans-serif;
      font-size: 1rem;
      line-height: 1;
      font-weight: 500;
    }

    .footer-modal-body {
      margin-top: 0.75rem;
    }

    .footer-modal-body > p + p {
      margin-top: 0.75rem;
    }

    .footer-modal-close {
      display: flex;
      justify-content: flex-end;
      padding-top: 0.5rem;
    }
  }

  /* unlayered: hover, dark if any, responsive */
  .footer-list-item-link:hover,
  .footer-list-item-btn:hover,
  .footer-engine-link:hover {
    color: var(--foreground);
  }

  .footer-copyright-link:hover {
    opacity: 0.8;
  }

  .footer-small-legal-btn:hover {
    color: var(--primary);
  }

  @media (min-width: 48rem) {
    .footer {
      padding-left: 2.5rem;
      padding-right: 2.5rem;
    }

    .footer-top {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      gap: 4rem;
    }

    .footer-links-wrap {
      gap: 4rem;
    }

    .footer-bottom {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  :global(.footer-wordmark-size) {
    font-size: 18px;
  }

  :global(.footer-engine-icon) {
    width: 0.875rem;
    height: 0.875rem;
  }
</style>
