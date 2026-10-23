<script lang="ts">
  import {
    QR_STYLE_PRESETS,
    type QrStylePresetId,
    type QrStyleResult,
  } from '@/lib/qrStylePresets';
  import { cn } from '@/lib/utils';

  type Props = {
    activePresetId?: QrStylePresetId | null;
    onApply: (result: QrStyleResult, meta: { presetId: QrStylePresetId; label: string }) => void;
    class?: string;
  };

  let { activePresetId = null, onApply, class: className = '' }: Props = $props();
</script>

<div
  class={cn('qr-presets', className)}
  aria-label="QR styles"
>
  {#each QR_STYLE_PRESETS as preset (preset.id)}
    <button
      type="button"
      data-testid={`style-preset-${preset.id}`}
      class={cn(
        'qr-presets-btn',
        activePresetId === preset.id ? 'qr-presets-btn--active' : 'qr-presets-btn--idle'
      )}
      onclick={() => onApply({ ...preset.style }, { presetId: preset.id, label: preset.label })}
    >
      <span
        class="qr-presets-swatch"
        style:background-color={preset.style.fgColor}
        aria-hidden="true"
      ></span>
      {preset.label}
    </button>
  {/each}
</div>

<style>
  @layer components {
    .qr-presets {
      display: flex;
      gap: 0.375rem;
      overflow-x: auto;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .qr-presets-btn {
      display: inline-flex;
      height: 2.25rem;
      flex-shrink: 0;
      cursor: pointer;
      align-items: center;
      gap: 0.5rem;
      border-radius: 9999px;
      padding-inline: 0.75rem;
      font-size: 0.875rem;
      line-height: 1.25;
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .qr-presets-btn--active {
      background-color: var(--punch);
      font-weight: 500;
      color: var(--ink);
    }

    .qr-presets-btn--idle {
      background-color: #fff;
      color: var(--ink);
    }

    .qr-presets-swatch {
      width: 0.875rem;
      height: 0.875rem;
      flex-shrink: 0;
      border-radius: 9999px;
      border: 1px solid rgb(0 0 0 / 0.15);
    }
  }

  .qr-presets-btn--idle:hover {
    background-color: color-mix(in oklab, #fff 85%, transparent);
  }

  :global(.dark) .qr-presets-btn--idle {
    background-color: color-mix(in oklab, #fff 10%, transparent);
    color: #fff;
  }

  :global(.dark) .qr-presets-btn--idle:hover {
    background-color: color-mix(in oklab, #fff 15%, transparent);
  }

  .qr-presets-swatch {
    border-color: rgb(0 0 0 / 0.15);
  }

  :global(.dark) .qr-presets-swatch {
    border-color: rgb(255 255 255 / 0.25);
  }

  .qr-presets::-webkit-scrollbar {
    display: none;
  }
</style>
