<script lang="ts">
  import Label from '@/lib/components/ui/label.svelte';
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
  };

  let { style, onChange }: Props = $props();

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

<div class="space-y-4">
  <div>
    <details class="text-[13px] text-muted-foreground">
      <summary class="cursor-pointer">What you can change</summary>
      <ul class="mt-2 list-disc space-y-1 pl-4">
        {#each QR_MUTABLE_GUIDE.safeToStyle as line (line)}
          <li>{line}</li>
        {/each}
      </ul>
      <p class="mt-2 font-medium text-foreground">Encode-time only</p>
      <ul class="list-disc space-y-1 pl-4">
        {#each QR_MUTABLE_GUIDE.encodeTimeOnly as line (line)}
          <li>{line}</li>
        {/each}
      </ul>
    </details>
  </div>

  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <div class="space-y-1.5">
      <Label>Modules</Label>
      <div class="flex items-center gap-2 rounded-lg border border-input p-1.5">
        <input
          type="color"
          value={resolved.fgColor}
          oninput={(e) => onChange({ fgColor: e.currentTarget.value })}
          class="size-5 cursor-pointer border-0 bg-transparent"
        />
        <span class="font-mono text-[10px] text-muted-foreground">{resolved.fgColor}</span>
      </div>
    </div>
    <div class="space-y-1.5">
      <Label>Background</Label>
      <div class="flex items-center gap-2 rounded-lg border border-input p-1.5">
        <input
          type="color"
          value={resolved.bgColor}
          oninput={(e) => onChange({ bgColor: e.currentTarget.value })}
          class="size-5 cursor-pointer border-0 bg-transparent"
        />
        <span class="font-mono text-[10px] text-muted-foreground">{resolved.bgColor}</span>
      </div>
    </div>
    <div class="space-y-1.5">
      <Label>Accent</Label>
      <div class="flex items-center gap-2 rounded-lg border border-input p-1.5">
        <input
          type="color"
          value={resolved.accentColor}
          oninput={(e) => onChange({ accentColor: e.currentTarget.value })}
          class="size-5 cursor-pointer border-0 bg-transparent"
        />
        <span class="font-mono text-[10px] text-muted-foreground">{resolved.accentColor}</span>
      </div>
    </div>
  </div>

  <div class="space-y-1.5">
    <Label for="module-mode">Module colors</Label>
    <select
      id="module-mode"
      value={resolved.moduleColorMode}
      onchange={(e) =>
        onChange({ moduleColorMode: e.currentTarget.value as QrModuleColorMode })}
      class="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {#each moduleModes as mode (mode.value)}
        <option value={mode.value}>{mode.label}</option>
      {/each}
    </select>
    <p class="text-[10px] text-muted-foreground">
      {moduleModes.find((m) => m.value === resolved.moduleColorMode)?.hint}
    </p>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <div class="space-y-1.5">
      <Label for="dot-shape">Dot shape</Label>
      <select
        id="dot-shape"
        value={resolved.dotShape}
        onchange={(e) => onChange({ dotShape: e.currentTarget.value as QrDotShape })}
        class="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {#each dotShapes as shape (shape.value)}
          <option value={shape.value}>{shape.label}</option>
        {/each}
      </select>
    </div>
    <div class="space-y-1.5">
      <Label for="recovery">Error recovery</Label>
      <select
        id="recovery"
        value={resolved.errorLevel}
        onchange={(e) => onChange({ errorLevel: e.currentTarget.value as QrStyleResult['errorLevel'] })}
        class="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="L">L (7%)</option>
        <option value="M">M (15%)</option>
        <option value="Q">Q (25%)</option>
        <option value="H">H (30%)</option>
      </select>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <div class="space-y-1.5">
      <Label for="frame-style">Frame</Label>
      <select
        id="frame-style"
        value={resolved.frame}
        onchange={(e) => onChange({ frame: e.currentTarget.value as QrFrameStyle })}
        class="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {#each frames as f (f.value)}
          <option value={f.value}>{f.label}</option>
        {/each}
      </select>
    </div>
    <div class="space-y-1.5">
      <Label for="margin">Quiet zone (margin)</Label>
      <input
        id="margin"
        type="range"
        min="0"
        max="8"
        step="1"
        value={resolved.margin}
        oninput={(e) => onChange({ margin: Number(e.currentTarget.value) })}
        class="mt-2 w-full accent-primary"
      />
      <p class="text-center font-mono text-[10px] text-muted-foreground">{resolved.margin} modules</p>
    </div>
  </div>

  <div class="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
    <p class="text-xs font-medium text-foreground">Center logo</p>
    <p class="text-[11px] text-muted-foreground">
      Small mark in the middle. Recovery switches to H so the code still scans.
    </p>
    <div class="flex flex-wrap gap-2">
      {#each [
        ['none', 'None'],
        ['brand', 'quickqr'],
        ['custom', 'Upload'],
      ] as [mode, label] (mode)}
        <button
          type="button"
          class="rounded-full border px-3 py-1 text-[11px] transition-colors {resolved.logoMode === mode
            ? 'border-primary bg-primary/10 text-foreground'
            : 'border-border text-muted-foreground hover:border-primary/40'}"
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
      <div class="space-y-1.5">
        <Label for="logo-upload">Image (PNG/JPG/SVG)</Label>
        <input
          id="logo-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          class="block w-full text-[11px] file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-2 file:py-1 file:text-primary-foreground"
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
      <div class="space-y-1.5">
        <Label for="logo-scale">Logo size ({Math.round(resolved.logoScale * 100)}% of symbol)</Label>
        <input
          id="logo-scale"
          type="range"
          min={LOGO_SCALE_MIN}
          max={LOGO_SCALE_MAX}
          step="0.02"
          value={resolved.logoScale}
          oninput={(e) => onChange({ logoScale: Number(e.currentTarget.value) })}
          class="w-full accent-primary"
        />
      </div>
    {/if}
  </div>
</div>
