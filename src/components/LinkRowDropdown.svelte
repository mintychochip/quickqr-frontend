<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { slide } from 'svelte/transition';
  import type { Link } from '../types';
  import AnalyticsPanel from './AnalyticsPanel.svelte';
  import QrSettingsPanel from './QrSettingsPanel.svelte';

  type Props = {
    link: Link;
    statsOpen: boolean;
    onToggleStats: () => void;
    onSaved: (link: Pick<Link, 'code' | 'title' | 'destination_url' | 'ad_style' | 'style'>) => void;
    /** Render as divided sections inside a parent surface instead of separate cards. */
    flush?: boolean;
  };

  let { link, statsOpen, onToggleStats, onSaved, flush = false }: Props = $props();
</script>

<div class="link-drop" class:link-drop-flush={flush}>
  <div data-testid="qr-dropdown" class="link-drop-panel">
    <div class="link-drop-label">Style</div>
    <div class="link-drop-body">
      <QrSettingsPanel code={link.code} {onSaved} />
    </div>
  </div>

  <div data-testid="analytics-dropdown" class="link-drop-panel">
    <button
      type="button"
      aria-expanded={statsOpen}
      onclick={onToggleStats}
      class="link-drop-toggle link-drop-label"
    >
      <span>Statistics</span>
      <ChevronDown class="link-drop-chevron {statsOpen ? 'link-drop-chevron-open' : ''}" />
    </button>
    {#if statsOpen}
      <div class="link-drop-body" in:slide={{ duration: flush ? 180 : 0 }} out:slide={{ duration: flush ? 120 : 0 }}>
        <AnalyticsPanel {link} />
      </div>
    {/if}
  </div>
</div>

<style>
  @layer components {
    .link-drop {
      display: grid;
      gap: 0.75rem;
    }

    .link-drop-flush {
      display: block;
      border-top: 1px solid var(--border);
    }

    .link-drop-flush > .link-drop-panel + .link-drop-panel {
      border-top: 1px solid var(--border);
    }

    .link-drop:not(.link-drop-flush) > .link-drop-panel {
      border-radius: calc(var(--radius) * 1.4);
      background-color: var(--card);
      box-shadow: 0 0 0 1px rgb(0 0 0 / 0.05);
    }

    .link-drop-label {
      padding: 0.5rem 0.75rem;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
    }

    .link-drop-flush .link-drop-label {
      padding: 0.75rem 1rem;
    }

    .link-drop-body {
      border-top: 1px solid var(--border);
      padding: 0.75rem;
    }

    .link-drop-flush .link-drop-body {
      padding: 1rem;
    }

    .link-drop-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      cursor: pointer;
      text-align: left;
    }
  }

  @container (min-width: 900px) {
    .link-drop:not(.link-drop-flush) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  :global(.dark) .link-drop:not(.link-drop-flush) > .link-drop-panel {
    box-shadow: 0 0 0 1px rgb(255 255 255 / 0.1);
  }

  :global(.dark) .link-drop-label {
    color: var(--muted-foreground);
  }

  :global(.link-drop-chevron) {
    width: 0.875rem;
    height: 0.875rem;
    transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global(.link-drop-chevron-open) {
    transform: rotate(180deg);
  }
</style>
