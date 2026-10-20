<script lang="ts">
  import Mic from '@lucide/svelte/icons/mic';
  import MicOff from '@lucide/svelte/icons/mic-off';
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import X from '@lucide/svelte/icons/x';
  import Button from '@/lib/components/ui/button.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import { extractPdfText } from '@/lib/pdfContext';
  import {
    decideQrStyle,
    parseQrStylePrompt,
    resolveQrStyleContext,
    resolveQrStylePrompt,
    STYLE_PROMPT_CHIPS,
    type QrStyleResult,
  } from '@/lib/qrStyleAssistant';

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
  const maxPdfBytes = 8 * 1024 * 1024;

  type SpeechRecognitionCtor = new () => {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: ((event: {
      results: { [index: number]: { [index: number]: { transcript: string } } };
    }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
  };

  type Props = {
    currentStyle: QrStyleResult;
    onApplyStyle: (result: QrStyleResult) => void;
    lastSummary?: string;
    /** Light controls for the dark bottom style bar. */
    dock?: boolean;
  };

  let { currentStyle, onApplyStyle, lastSummary = '', dock = false }: Props = $props();

  let prompt = $state('');
  let promptFocused = $state(false);
  let prompted = $state(false);
  let materials = $state<ContextMaterial[]>([]);
  let fileInput = $state<HTMLInputElement | null>(null);
  let listening = $state(false);
  let parsing = $state(false);
  let engineLabel = $state<'decision' | 'jev' | 'llm' | 'agent'>('decision');
  let voiceError = $state('');
  let recognitionRef = $state<InstanceType<SpeechRecognitionCtor> | null>(null);

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
    voiceError = '';
    if (!list || list.length === 0) return;
    const next = [...materials];
    for (const file of list) {
      if (next.length >= maxMaterials) {
        voiceError = 'Attach up to 4 photos, notes, or PDFs';
        break;
      }
      const lower = file.name.toLowerCase();
      const textFile =
        file.type.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.md');
      if (textFile) {
        const text = (await file.text()).slice(0, 4000);
        next.push({ id: crypto.randomUUID(), name: file.name, kind: 'note', text });
        continue;
      }
      if (file.type === 'application/pdf' || lower.endsWith('.pdf')) {
        if (file.size > maxPdfBytes) {
          voiceError = `${file.name} is larger than 8MB`;
          continue;
        }
        try {
          const text = await extractPdfText(file);
          next.push({ id: crypto.randomUUID(), name: file.name, kind: 'note', text });
        } catch (err) {
          voiceError = err instanceof Error ? err.message : 'Could not read that PDF';
        }
        continue;
      }
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        voiceError = 'Use a PNG, JPEG, GIF, PDF, or text note';
        continue;
      }
      if (file.size > maxImageBytes) {
        voiceError = `${file.name} is larger than 1.2MB`;
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

  async function applyPrompt(text: string) {
    const trimmed = text.trim();
    const images = materials.flatMap((item) =>
      item.kind === 'image' && item.dataBase64 && item.mediaType
        ? [{ name: item.name, mediaType: item.mediaType, dataBase64: item.dataBase64 }]
        : [],
    );
    const contextNotes = materials.flatMap((item) =>
      item.kind === 'note' && item.text ? [{ name: item.name, text: item.text }] : [],
    );
    if (!trimmed && images.length === 0 && contextNotes.length === 0) return;
    parsing = true;
    voiceError = '';
    try {
      const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        const siteUrl = urlMatch[0].replace(/[),.;]+$/, '');
        try {
          const res = await fetch('/api/qr/context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: siteUrl }),
          });
          if (res.ok) {
            const site = (await res.json()) as { name?: string; text?: string };
            if (site.text) {
              contextNotes.push({ name: site.name || siteUrl, text: site.text });
            }
          } else {
            const payload = (await res.json().catch(() => null)) as { error?: string } | null;
            voiceError = payload?.error || 'Could not read that site';
          }
        } catch {
          voiceError = 'Could not read that site';
        }
      }

      if (images.length > 0) {
        const { result, meta } = await resolveQrStyleContext(trimmed, images, contextNotes, currentStyle);
        engineLabel = meta.engine;
        onApplyStyle(result);
      } else if (contextNotes.length > 0) {
        const contextText = [trimmed, ...contextNotes.map((note) => note.text)].join('\n');
        const { result } = decideQrStyle(contextText, currentStyle);
        engineLabel = 'decision';
        onApplyStyle(result);
      } else {
        const { result, meta } = await resolveQrStylePrompt(trimmed, currentStyle);
        engineLabel = meta.engine;
        onApplyStyle(result);
      }
      prompted = true;
    } catch (err) {
      if (images.length > 0 || contextNotes.length > 0) {
        voiceError = err instanceof Error ? err.message : 'Could not read that context';
      } else {
        onApplyStyle(parseQrStylePrompt(trimmed, currentStyle));
        engineLabel = 'decision';
        prompted = true;
      }
    } finally {
      parsing = false;
    }
  }

  $effect(() => {
    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    recognitionRef = rec;

    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      prompt = transcript;
      applyPrompt(transcript);
      listening = false;
    };
    rec.onerror = (event) => {
      voiceError = event.error === 'not-allowed' ? 'Microphone blocked' : 'Voice input failed';
      listening = false;
    };
    rec.onend = () => {
      listening = false;
    };

    return () => {
      rec.stop();
      recognitionRef = null;
    };
  });

  function toggleListen() {
    voiceError = '';
    const rec = recognitionRef;
    if (!rec) {
      voiceError = 'Voice not supported in this browser';
      return;
    }
    if (listening) {
      rec.stop();
      listening = false;
      return;
    }
    listening = true;
    rec.start();
  }
</script>

<div class="w-full space-y-2">
  {#if materials.length > 0}
    <ul data-testid="style-context-list" class="flex gap-1.5 overflow-x-auto">
      {#each materials as item (item.id)}
        <li
          class={dock
            ? 'flex shrink-0 items-center gap-1 rounded-full bg-white/10 py-0.5 pr-1 pl-1 text-[11px] text-white'
            : 'flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted py-0.5 pr-1 pl-1 text-[11px] text-foreground'}
        >
          {#if item.preview}
            <img src={item.preview} alt="" class="size-5 rounded-full object-cover" />
          {/if}
          <span class="max-w-[8rem] truncate">{item.name}</span>
          <button
            type="button"
            class="cursor-pointer rounded-full p-0.5 text-white/70 hover:text-white"
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
    onsubmit={(e) => {
      e.preventDefault();
      applyPrompt(prompt);
    }}
  >
    <input
      bind:this={fileInput}
      type="file"
      class="sr-only"
      accept="image/png,image/jpeg,image/gif,application/pdf,.pdf,.txt,.md,text/plain"
      multiple
      data-testid="style-context-file"
      onchange={(event) => addContextFiles(event.currentTarget.files)}
    />
    <Button
      type="button"
      variant="outline"
      size="icon"
      class={dock ? 'size-9 shrink-0 bg-white text-ink hover:bg-white/85' : ''}
      aria-label="Attach photo, note, or PDF"
      onclick={() => fileInput?.click()}
    >
      <Paperclip class="size-4" />
    </Button>
    <Input
      bind:value={prompt}
      placeholder="Describe a look or paste a public URL"
      class={dock ? 'h-9 flex-1 bg-white text-ink placeholder:text-muted-foreground md:text-sm' : 'flex-1'}
      aria-label="QR style prompt"
      onfocus={() => (promptFocused = true)}
      onblur={() => (promptFocused = false)}
    />
    <Button
      type="button"
      variant={listening ? 'default' : 'outline'}
      size="icon"
      class={dock && listening ? 'bg-punch text-ink hover:bg-punch/80' : ''}
      onclick={toggleListen}
      aria-label={listening ? 'Stop listening' : 'Speak style'}
      aria-pressed={listening}
    >
      {#if listening}
        <MicOff class="size-4" />
      {:else}
        <Mic class="size-4" />
      {/if}
    </Button>
    <Button
      type="submit"
      disabled={parsing || (!prompt.trim() && materials.length === 0)}
      class={dock ? 'h-9 bg-punch text-ink hover:bg-punch/80' : ''}
    >
      {parsing ? 'Thinking…' : 'Apply'}
    </Button>
  </form>

  {#if voiceError}
    <p class="text-xs text-destructive">{voiceError}</p>
  {/if}
  {#if prompted && lastSummary}
    <p class={dock ? 'text-xs text-white/75' : 'text-xs text-muted-foreground'}>
      Applied ({engineLabel === 'agent'
        ? 'agent'
        : engineLabel === 'jev'
          ? 'Jev'
          : engineLabel === 'llm'
            ? 'LLM'
            : 'decision model'}):{' '}
      <span class={dock ? 'font-medium text-punch' : 'font-medium text-foreground'}>{lastSummary}</span>
    </p>
  {/if}

  {#if !dock || promptFocused || prompt.trim()}
  <div
    class={dock
      ? 'flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      : 'flex flex-wrap gap-1.5'}
  >
    {#each STYLE_PROMPT_CHIPS as chip (chip)}
      <button
        type="button"
        onmousedown={(event) => event.preventDefault()}
        onclick={() => {
          prompt = chip;
          applyPrompt(chip);
        }}
        class={dock
          ? 'shrink-0 cursor-pointer rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] text-white/85 transition-colors hover:bg-white/20 hover:text-white'
          : 'cursor-pointer rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'}
      >
        {chip}
      </button>
    {/each}
  </div>
  {/if}
</div>
