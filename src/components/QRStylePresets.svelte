<script lang="ts">
  import {
    QR_STYLE_PRESETS,
    type QrStylePresetId,
    type QrStyleResult,
  } from '@/lib/qrStylePresets';

  type Props = {
    activePresetId?: QrStylePresetId | null;
    onApply: (result: QrStyleResult, meta: { presetId: QrStylePresetId; label: string }) => void;
  };

  let { activePresetId = null, onApply }: Props = $props();
</script>

<div
  class="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  aria-label="QR styles"
>
  {#each QR_STYLE_PRESETS as preset (preset.id)}
    <button
      type="button"
      data-testid={`style-preset-${preset.id}`}
      class="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 text-sm transition-colors {activePresetId ===
      preset.id
        ? 'bg-punch font-medium text-ink'
        : 'bg-white text-ink hover:bg-white/85 dark:bg-white/10 dark:text-white dark:hover:bg-white/15'}"
      onclick={() => onApply({ ...preset.style }, { presetId: preset.id, label: preset.label })}
    >
      <span
        class="size-3.5 shrink-0 rounded-full border border-black/15 dark:border-white/25"
        style:background-color={preset.style.fgColor}
        aria-hidden="true"
      ></span>
      {preset.label}
    </button>
  {/each}
</div>
