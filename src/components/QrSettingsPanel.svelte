<script lang="ts">
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import X from '@lucide/svelte/icons/x';
  import Button from '@/lib/components/ui/button.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import { fetchQrSettings, fetchSiteContext, patchQrSettings, type QrSettingsDocument } from '../lib/api';
  import {
    parseQrStylePrompt,
    resolveQrStyleContext,
    resolveQrStylePrompt,
    STYLE_PROMPT_CHIPS,
    type StyleContextImage,
    type StyleContextNote,
  } from '../lib/qrStyleAssistant';
  import { withQrStyleDefaults, type QrStyleResult } from '../lib/qrStylePresets';
  import { parseSettingsQuery } from '../lib/settingsQuery';
  import type { Link, QRStyle } from '../types';

  type Props = {
    code: string;
    onSaved: (link: Pick<Link, 'code' | 'title' | 'destination_url' | 'ad_style' | 'style'>) => void;
  };

  type ContextMaterial = {
    id: string;
    name: string;
    kind: 'image' | 'note';
    mediaType?: string;
    dataBase64?: string;
    preview?: string;
    text?: string;
  };

  let { code, onSaved }: Props = $props();

  const maxMaterials = 4;
  const maxImageBytes = 1_200_000;

  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let saved = $state(false);
  let query = $state('');
  let materials = $state<ContextMaterial[]>([]);
  let fileInput = $state<HTMLInputElement | null>(null);
  let appliedSummary = $state('');
  let doc = $state<QrSettingsDocument | null>(null);
  let loadedCode = '';
  let fgColor = $state('#111113');
  let bgColor = $state('#ffffff');
  let frame = $state<'plain' | 'soft' | 'ring'>('plain');
  let errorLevel = $state<'L' | 'M' | 'Q' | 'H'>('M');

  function editable(name: string): boolean {
    return doc?.fields.find((field) => field.name === name)?.editable ?? false;
  }

  function currentStyle(): QrStyleResult {
    return withQrStyleDefaults({
      fgColor,
      bgColor,
      accentColor: fgColor,
      errorLevel,
      frame,
      summary: appliedSummary,
    });
  }

  function stylePayload(result: QrStyleResult): QRStyle {
    const resolved = withQrStyleDefaults(result);
    return {
      fgColor: resolved.fgColor,
      bgColor: resolved.bgColor,
      accentColor: resolved.accentColor,
      errorLevel: resolved.errorLevel,
      frame: resolved.frame,
      moduleColorMode: resolved.moduleColorMode,
      dotShape: resolved.dotShape,
      summary: resolved.summary,
    };
  }

  function remember(next: QrSettingsDocument) {
    doc = next;
    fgColor = next.settings.style?.fgColor ?? fgColor;
    bgColor = next.settings.style?.bgColor ?? bgColor;
    frame = next.settings.style?.frame ?? frame;
    errorLevel = next.settings.style?.errorLevel ?? errorLevel;
    appliedSummary = next.settings.style?.summary ?? appliedSummary;
  }

  $effect(() => {
    const current = code;
    // `code` is read from the dashboard link. Saving replaces that link, which
    // would rerun this effect and wipe the confirmation. Load once per code.
    if (loadedCode === current) return;
    loadedCode = current;
    loading = true;
    error = '';
    saved = false;
    fetchQrSettings(current)
      .then((next) => {
        if (current !== code) return;
        doc = next;
        fgColor = next.settings.style?.fgColor ?? '#111113';
        bgColor = next.settings.style?.bgColor ?? '#ffffff';
        frame = next.settings.style?.frame ?? 'plain';
        errorLevel = next.settings.style?.errorLevel ?? 'M';
      })
      .catch((err: unknown) => {
        error = err instanceof Error ? err.message : 'Failed to load settings';
      })
      .finally(() => {
        if (current === code) loading = false;
      });
  });

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result ?? '');
        const comma = value.indexOf(',');
        resolve(comma >= 0 ? value.slice(comma + 1) : value);
      };
      reader.onerror = () => reject(new Error('Could not read that file'));
      reader.readAsDataURL(file);
    });
  }

  async function addContextFiles(list: FileList | null) {
    error = '';
    if (!list || list.length === 0) return;
    const next = [...materials];
    for (const file of list) {
      if (next.length >= maxMaterials) {
        error = 'Attach up to 4 photos or docs';
        break;
      }
      const lower = file.name.toLowerCase();
      const textFile = file.type.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.md');
      if (textFile) {
        const text = (await file.text()).slice(0, 4000);
        next.push({ id: crypto.randomUUID(), name: file.name, kind: 'note', text });
        continue;
      }
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        error = 'Use a PNG, JPEG, GIF, or text doc';
        continue;
      }
      if (file.size > maxImageBytes) {
        error = `${file.name} is larger than 1.2MB`;
        continue;
      }
      const dataBase64 = await fileToBase64(file);
      next.push({
        id: crypto.randomUUID(),
        name: file.name,
        kind: 'image',
        mediaType: file.type,
        dataBase64,
        preview: `data:${file.type};base64,${dataBase64}`,
      });
    }
    materials = next;
    if (fileInput) fileInput.value = '';
  }

  async function applyQuery(text = query) {
    const parsed = parseSettingsQuery(text);
    const images: StyleContextImage[] = materials.flatMap((item) =>
      item.kind === 'image' && item.dataBase64 && item.mediaType
        ? [{ name: item.name, mediaType: item.mediaType, dataBase64: item.dataBase64 }]
        : [],
    );
    const notes: StyleContextNote[] = materials.flatMap((item) =>
      item.kind === 'note' && item.text ? [{ name: item.name, text: item.text }] : [],
    );
    const hasField = parsed.title != null || parsed.destination_url != null || parsed.ad_style != null;
    if (!parsed.stylePrompt && !hasField && images.length === 0 && notes.length === 0 && parsed.siteUrls.length === 0) {
      return;
    }
    if (parsed.destination_url && !editable('destination_url')) {
      error = 'This code keeps its address.';
      return;
    }
    if (parsed.ad_style && !editable('ad_style')) {
      error = 'This code does not use an ad format.';
      return;
    }

    saving = true;
    error = '';
    saved = false;
    try {
      for (const url of parsed.siteUrls.slice(0, 2)) {
        const site = await fetchSiteContext(url);
        notes.push({ name: site.name, text: site.text });
      }
      const hasContext = images.length > 0 || notes.length > 0;
      let style: QRStyle | undefined;
      if (hasContext || parsed.stylePrompt) {
        let result: QrStyleResult;
        if (hasContext) {
          const brief = parsed.stylePrompt || 'Style this code from the attached context';
          result = (await resolveQrStyleContext(brief, images, notes, currentStyle())).result;
        } else {
          try {
            result = (await resolveQrStylePrompt(parsed.stylePrompt, currentStyle())).result;
          } catch {
            result = parseQrStylePrompt(parsed.stylePrompt, currentStyle());
          }
        }
        style = stylePayload(result);
      }
      const next = await patchQrSettings(code, {
        ...(parsed.title != null ? { title: parsed.title } : {}),
        ...(parsed.destination_url ? { destination_url: parsed.destination_url } : {}),
        ...(parsed.ad_style ? { ad_style: parsed.ad_style } : {}),
        ...(style ? { style } : {}),
      });
      remember(next);
      saved = true;
      query = '';
      materials = [];
      onSaved({
        code: next.code,
        title: next.settings.title,
        destination_url: next.settings.destination_url,
        ad_style: next.settings.ad_style,
        style: next.settings.style,
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save settings';
    } finally {
      saving = false;
    }
  }
</script>

<div data-testid="qr-settings" class="space-y-3">
  <p class="font-mono text-[11px] text-muted-foreground">PATCH /api/qr/{code}/settings</p>

  {#if loading}
    <p class="text-sm text-muted-foreground">Loading settings…</p>
  {:else}
    {#if materials.length > 0}
      <ul data-testid="settings-context-list" class="flex gap-1.5 overflow-x-auto">
        {#each materials as item (item.id)}
          <li class="flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted py-0.5 pr-1 pl-1 text-[11px] text-foreground">
            {#if item.preview}
              <img src={item.preview} alt="" class="size-5 rounded-full object-cover" />
            {/if}
            <span class="max-w-[8rem] truncate">{item.name}</span>
            <button
              type="button"
              class="cursor-pointer rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${item.name}`}
              onclick={() => (materials = materials.filter((entry) => entry.id !== item.id))}
            >
              <X class="size-3" />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    <form
      class="flex gap-2"
      onsubmit={(event) => {
        event.preventDefault();
        void applyQuery();
      }}
    >
      <input
        bind:this={fileInput}
        type="file"
        class="sr-only"
        accept="image/png,image/jpeg,image/gif,.txt,.md,text/plain"
        multiple
        data-testid="settings-context-file"
        onchange={(event) => void addContextFiles(event.currentTarget.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="shrink-0"
        aria-label="Attach photo or campaign doc"
        disabled={saving}
        onclick={() => fileInput?.click()}
      >
        <Paperclip class="size-4" />
      </Button>
      <Input
        bind:value={query}
        placeholder="Paste your site, or describe the campaign"
        aria-label="Style context"
        data-testid="settings-query"
        disabled={saving}
      />
      <Button type="submit" disabled={saving || (!query.trim() && materials.length === 0)}>
        {saving ? 'Applying…' : 'Apply'}
      </Button>
    </form>

    <div class="flex flex-wrap gap-1.5">
      {#each STYLE_PROMPT_CHIPS as chip (chip)}
        <button
          type="button"
          disabled={saving}
          onclick={() => void applyQuery(chip)}
          class="cursor-pointer rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
        >
          {chip}
        </button>
      {/each}
    </div>

    {#if saved}
      <p class="text-sm text-muted-foreground">
        Saved on this code.{#if appliedSummary}
          <span class="font-medium text-foreground">{appliedSummary}</span>
        {/if}
      </p>
    {/if}
    {#if error}
      <p class="text-sm text-destructive">{error}</p>
    {/if}
  {/if}
</div>
