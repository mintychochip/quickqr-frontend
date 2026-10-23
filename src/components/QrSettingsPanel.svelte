<script lang="ts">
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import X from '@lucide/svelte/icons/x';
  import { fileToBase64, readImageForAgent } from '@/lib/agentImage';
  import Button from '@/lib/components/ui/button.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import { cn } from '@/lib/utils';
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
    class?: string;
  };

  let { code, onSaved, class: className = '' }: Props = $props();


  type ContextMaterial = {
    id: string;
    name: string;
    kind: 'image' | 'note';
    mediaType?: string;
    dataBase64?: string;
    preview?: string;
    text?: string;
  };

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
      // The thumbnail keeps the photo as it is; what the agent is sent is shrunk to fit.
      const sent = await readImageForAgent(file);
      next.push({
        id: crypto.randomUUID(),
        name: file.name,
        kind: 'image',
        mediaType: sent.mediaType,
        dataBase64: sent.dataBase64,
        preview: `data:${file.type};base64,${await fileToBase64(file)}`,
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

<div data-testid="qr-settings" class={cn('qr-settings', className)}>
  <p class="font-mono qr-settings-patch">PATCH /api/qr/{code}/settings</p>

  {#if loading}
    <p class="qr-settings-loading">Loading settings…</p>
  {:else}
    {#if materials.length > 0}
      <ul data-testid="settings-context-list" class="qr-settings-materials">
        {#each materials as item (item.id)}
          <li class="qr-settings-material">
            {#if item.preview}
              <img src={item.preview} alt="" class="qr-settings-material-preview" />
            {/if}
            <span class="qr-settings-material-name">{item.name}</span>
            <button
              type="button"
              class="qr-settings-remove-btn"
              aria-label={`Remove ${item.name}`}
              onclick={() => (materials = materials.filter((entry) => entry.id !== item.id))}
            >
              <X class="qr-settings-x-icon" />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    <form
      class="qr-settings-form"
      onsubmit={(event) => {
        event.preventDefault();
        void applyQuery();
      }}
    >
      <input
        bind:this={fileInput}
        type="file"
        class="qr-settings-file"
        accept="image/png,image/jpeg,image/gif,.txt,.md,text/plain"
        multiple
        data-testid="settings-context-file"
        onchange={(event) => void addContextFiles(event.currentTarget.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="qr-settings-attach-btn"
        aria-label="Attach photo or campaign doc"
        disabled={saving}
        onclick={() => fileInput?.click()}
      >
        <Paperclip class="qr-settings-paperclip-icon" />
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

    <div class="qr-settings-chips">
      {#each STYLE_PROMPT_CHIPS as chip (chip)}
        <button
          type="button"
          disabled={saving}
          onclick={() => void applyQuery(chip)}
          class="qr-settings-chip"
        >
          {chip}
        </button>
      {/each}
    </div>

    {#if saved}
      <p class="qr-settings-saved">
        Saved on this code.{#if appliedSummary}
          <span class="qr-settings-applied">{appliedSummary}</span>
        {/if}
      </p>
    {/if}
    {#if error}
      <p class="qr-settings-error">{error}</p>
    {/if}
  {/if}
</div>

<style>
  @layer components {
    .qr-settings {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .qr-settings-patch {
      font-size: 11px;
      color: var(--muted-foreground);
    }


    .qr-settings-loading,
    .qr-settings-saved,
    .qr-settings-error {
      font-size: 0.875rem;
      line-height: 1.25rem;
      color: var(--muted-foreground);
    }

    .qr-settings-error {
      color: var(--destructive);
    }

    .qr-settings-materials {
      display: flex;
      gap: 0.375rem;
      overflow-x: auto;
    }

    .qr-settings-material {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: 0.25rem;
      border-radius: 9999px;
      border: 1px solid var(--border);
      background-color: var(--muted);
      padding-block: 0.125rem;
      padding-left: 0.25rem;
      padding-right: 0.25rem;
      font-size: 11px;
      color: var(--foreground);
    }

    .qr-settings-material-preview {
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 9999px;
      object-fit: cover;
    }

    .qr-settings-material-name {
      max-width: 8rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .qr-settings-remove-btn {
      cursor: pointer;
      border-radius: 9999px;
      padding: 0.125rem;
      color: var(--muted-foreground);
    }

    .qr-settings-form {
      display: flex;
      gap: 0.5rem;
    }

    .qr-settings-file {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    :global(.qr-settings-attach-btn) {
      flex-shrink: 0;
    }

    .qr-settings-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .qr-settings-chip {
      cursor: pointer;
      border-radius: 9999px;
      border: 1px solid var(--border);
      background-color: var(--background);
      padding-inline: 0.625rem;
      padding-block: 0.25rem;
      font-size: 11px;
      color: var(--muted-foreground);
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), border-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .qr-settings-applied {
      font-weight: 500;
      color: var(--foreground);
    }
  }

  .qr-settings-remove-btn:hover {
    color: var(--foreground);
  }

  .qr-settings-chip:hover {
    border-color: color-mix(in oklab, var(--primary) 40%, transparent);
    color: var(--foreground);
  }

  .qr-settings-chip:disabled {
    opacity: 0.5;
  }

  :global(.qr-settings-x-icon) {
    width: 0.75rem;
    height: 0.75rem;
  }

  :global(.qr-settings-paperclip-icon) {
    width: 1rem;
    height: 1rem;
  }
</style>

