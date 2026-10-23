<script lang="ts">
  import Label from '@/lib/components/ui/label.svelte';
  import { cn } from '@/lib/utils';
  import type {
    QrDotShape,
    QrFrameStyle,
    QrLogoMode,
    QrModuleColorMode,
    QrStyleResult,
  } from '@/lib/qrStylePresets';
  import { LOGO_SCALE_MAX, LOGO_SCALE_MIN, QR_MUTABLE_GUIDE } from '@/lib/qrSymbolSchema';
  import { withQrStyleDefaults } from '@/lib/qrStylePresets';

  type Props = {
    style: QrStyleResult;
    onChange: (patch: Partial<QrStyleResult>) => void;
    class?: string;
  };

  let { style, onChange, class: className = '' }: Props = $props();


  const resolved = $derived(withQrStyleDefaults(style));

  const moduleModes: { value: QrModuleColorMode; label: string; hint: string }[] = [
    { value: 'uniform', label: 'One color', hint: 'All dark modules use Modules color' },
    {
      value: 'finder_accent',
      label: 'Finder accent',
      hint: 'Corner squares use Accent; data modules use Modules',
    },
    {
      value: 'gradient',
      label: 'Gradient',
      hint: 'Data modules blend Modules → Accent; finders use Accent',
    },
  ];

  const dotShapes: { value: QrDotShape; label: string }[] = [
    { value: 'square', label: 'Square' },
    { value: 'rounded', label: 'Rounded' },
    { value: 'circle', label: 'Dots' },
  ];

  const frames: { value: QrFrameStyle; label: string }[] = [
    { value: 'plain', label: 'Plain' },
    { value: 'soft', label: 'Soft card' },
    { value: 'ring', label: 'Ring' },
  ];
</script>

<div class={cn('qr-style-editor', className)}>
  <div>
    <details class="qr-style-details">
      <summary class="qr-style-summary">What you can change</summary>
      <ul class="qr-style-guide">
        {#each QR_MUTABLE_GUIDE.safeToStyle as line (line)}
          <li>{line}</li>
        {/each}
      </ul>
      <p class="qr-style-guide-title">Encode-time only</p>
      <ul class="qr-style-guide">
        {#each QR_MUTABLE_GUIDE.encodeTimeOnly as line (line)}
          <li>{line}</li>
        {/each}
      </ul>
    </details>
  </div>

  <div class="qr-style-colors">
    <div class="qr-style-color-field">
      <Label>Modules</Label>
      <div class="qr-style-color-swatch">
        <input
          type="color"
          value={resolved.fgColor}
          oninput={(e) => onChange({ fgColor: e.currentTarget.value })}
          class="qr-style-color-input"
        />
        <span class="font-mono qr-style-color-value">{resolved.fgColor}</span>
      </div>
    </div>
    <div class="qr-style-color-field">
      <Label>Background</Label>
      <div class="qr-style-color-swatch">
        <input
          type="color"
          value={resolved.bgColor}
          oninput={(e) => onChange({ bgColor: e.currentTarget.value })}
          class="qr-style-color-input"
        />
        <span class="font-mono qr-style-color-value">{resolved.bgColor}</span>
      </div>
    </div>
    <div class="qr-style-color-field">
      <Label>Accent</Label>
      <div class="qr-style-color-swatch">
        <input
          type="color"
          value={resolved.accentColor}
          oninput={(e) => onChange({ accentColor: e.currentTarget.value })}
          class="qr-style-color-input"
        />
        <span class="font-mono qr-style-color-value">{resolved.accentColor}</span>
      </div>
    </div>
  </div>

  <div class="qr-style-field">
    <Label for="module-mode">Module colors</Label>
    <select
      id="module-mode"
      value={resolved.moduleColorMode}
      onchange={(e) =>
        onChange({ moduleColorMode: e.currentTarget.value as QrModuleColorMode })}
      class="qr-style-select"
    >
      {#each moduleModes as mode (mode.value)}
        <option value={mode.value}>{mode.label}</option>
      {/each}
    </select>
    <p class="qr-style-hint">
      {moduleModes.find((m) => m.value === resolved.moduleColorMode)?.hint}
    </p>
  </div>

  <div class="qr-style-grid-2">
    <div class="qr-style-field">
      <Label for="dot-shape">Dot shape</Label>
      <select
        id="dot-shape"
        value={resolved.dotShape}
        onchange={(e) => onChange({ dotShape: e.currentTarget.value as QrDotShape })}
        class="qr-style-select"
      >
        {#each dotShapes as shape (shape.value)}
          <option value={shape.value}>{shape.label}</option>
        {/each}
      </select>
    </div>
    <div class="qr-style-field">
      <Label for="recovery">Error recovery</Label>
      <select
        id="recovery"
        value={resolved.errorLevel}
        onchange={(e) => onChange({ errorLevel: e.currentTarget.value as QrStyleResult['errorLevel'] })}
        class="qr-style-select"
      >
        <option value="L">L (7%)</option>
        <option value="M">M (15%)</option>
        <option value="Q">Q (25%)</option>
        <option value="H">H (30%)</option>
      </select>
    </div>
  </div>

  <div class="qr-style-grid-2">
    <div class="qr-style-field">
      <Label for="frame-style">Frame</Label>
      <select
        id="frame-style"
        value={resolved.frame}
        onchange={(e) => onChange({ frame: e.currentTarget.value as QrFrameStyle })}
        class="qr-style-select"
      >
        {#each frames as f (f.value)}
          <option value={f.value}>{f.label}</option>
        {/each}
      </select>
    </div>
    <div class="qr-style-field">
      <Label for="margin">Quiet zone (margin)</Label>
      <input
        id="margin"
        type="range"
        min="0"
        max="8"
        step="1"
        value={resolved.margin}
        oninput={(e) => onChange({ margin: Number(e.currentTarget.value) })}
        class="qr-style-range"
      />
      <p class="qr-style-range-value font-mono">{resolved.margin} modules</p>
    </div>
  </div>

  <div class="qr-style-logo-box">
    <p class="qr-style-logo-title">Center logo</p>
    <p class="qr-style-logo-desc">
      Small mark in the middle. Recovery switches to H so the code still scans.
    </p>
    <div class="qr-style-logo-modes">
      {#each [
        ['none', 'None'],
        ['brand', 'quickqr'],
        ['custom', 'Upload'],
      ] as [mode, label] (mode)}
        <button
          type="button"
          class={cn(
            'qr-style-logo-mode',
            resolved.logoMode === mode ? 'qr-style-logo-mode--active' : 'qr-style-logo-mode--idle'
          )}
          onclick={() =>
            onChange({
              logoMode: mode as QrLogoMode,
              ...(mode !== 'custom' ? { logoDataUrl: null } : {}),
            })}
        >
          {label}
        </button>
      {/each}
    </div>
    {#if resolved.logoMode === 'custom'}
      <div class="qr-style-field">
        <Label for="logo-upload">Image (PNG/JPG/SVG)</Label>
        <input
          id="logo-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          class="qr-style-file"
          onchange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = typeof reader.result === 'string' ? reader.result : null;
              if (dataUrl) onChange({ logoMode: 'custom', logoDataUrl: dataUrl });
            };
            reader.readAsDataURL(file);
          }}
        />
      </div>
    {/if}
    {#if resolved.logoMode !== 'none'}
      <div class="qr-style-field">
        <Label for="logo-scale">Logo size ({Math.round(resolved.logoScale * 100)}% of symbol)</Label>
        <input
          id="logo-scale"
          type="range"
          min={LOGO_SCALE_MIN}
          max={LOGO_SCALE_MAX}
          step="0.02"
          value={resolved.logoScale}
          oninput={(e) => onChange({ logoScale: Number(e.currentTarget.value) })}
          class="qr-style-range"
        />
      </div>
    {/if}
  </div>
</div>

<style>
  @layer components {
    .qr-style-editor {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .qr-style-details {
      font-size: 13px;
      color: var(--muted-foreground);
    }

    .qr-style-summary {
      cursor: pointer;
    }

    .qr-style-guide {
      margin-top: 0.5rem;
      list-style: disc;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding-left: 1rem;
    }

    .qr-style-guide-title {
      margin-top: 0.5rem;
      font-weight: 500;
      color: var(--foreground);
    }

    .qr-style-colors {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    @media (min-width: 40rem) {
      .qr-style-colors {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    .qr-style-color-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .qr-style-color-swatch {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: var(--radius);
      border: 1px solid var(--input);
      padding: 0.375rem;
    }

    .qr-style-color-input {
      width: 1.25rem;
      height: 1.25rem;
      cursor: pointer;
      border: 0;
      background: transparent;
    }

    .qr-style-color-value {
      font-size: 10px;
      color: var(--muted-foreground);
    }

    .qr-style-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .qr-style-select {
      height: 2.25rem;
      width: 100%;
      border-radius: var(--radius);
      border: 1px solid var(--input);
      background: transparent;
      padding-inline: 0.5rem;
      font-size: 0.875rem;
      outline-style: none;
    }

    .qr-style-select:focus-visible {
      border-color: var(--ring);
      box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
    }

    .qr-style-hint {
      font-size: 10px;
      color: var(--muted-foreground);
    }

    .qr-style-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .qr-style-range {
      width: 100%;
      accent-color: var(--primary);
    }

    .qr-style-range-value {
      text-align: center;
      font-size: 10px;
      color: var(--muted-foreground);
    }

    .qr-style-logo-box {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background-color: color-mix(in oklab, var(--muted) 30%, transparent);
      padding: 0.75rem;
    }

    .qr-style-logo-title {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--foreground);
    }

    .qr-style-logo-desc {
      font-size: 11px;
      color: var(--muted-foreground);
    }

    .qr-style-logo-modes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .qr-style-logo-mode {
      border-radius: 9999px;
      border: 1px solid var(--border);
      padding-inline: 0.75rem;
      padding-block: 0.25rem;
      font-size: 11px;
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), border-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .qr-style-logo-mode--active {
      border-color: var(--primary);
      background-color: color-mix(in oklab, var(--primary) 10%, transparent);
      color: var(--foreground);
    }

    .qr-style-logo-mode--idle {
      color: var(--muted-foreground);
    }

    .qr-style-file {
      display: block;
      width: 100%;
      font-size: 11px;
    }

    .qr-style-file::file-selector-button {
      margin-right: 0.5rem;
      border-radius: calc(var(--radius) * 0.8);
      border: 0;
      background-color: var(--primary);
      padding-inline: 0.5rem;
      padding-block: 0.25rem;
      color: var(--primary-foreground);
    }
  }

  .qr-style-logo-mode--idle:hover {
    border-color: color-mix(in oklab, var(--primary) 40%, transparent);
  }

  .qr-style-range {
    margin-top: 0.5rem;
  }
</style>

