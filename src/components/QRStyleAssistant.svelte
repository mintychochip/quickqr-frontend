<script lang="ts">
  import Mic from '@lucide/svelte/icons/mic';
  import MicOff from '@lucide/svelte/icons/mic-off';
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import X from '@lucide/svelte/icons/x';
  import { fileToBase64, readImageForAgent } from '@/lib/agentImage';
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

<div class="qrsa-root">
  {#if materials.length > 0}
    <ul data-testid="style-context-list" class="qrsa-materials">
      {#each materials as item (item.id)}
        <li
          class={dock
            ? 'qrsa-material-item qrsa-material-item-dock'
            : 'qrsa-material-item'}
        >
          {#if item.preview}
            <img src={item.preview} alt="" class="qrsa-material-thumb" />
          {/if}
          <span class="qrsa-material-name qrsa-truncate">{item.name}</span>
          <button
            type="button"
            class="qrsa-remove-btn"
            aria-label={`Remove ${item.name}`}
            onclick={() => (materials = materials.filter((entry) => entry.id !== item.id))}
          >
            <X class="qrsa-icon-remove" />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  <form
    class="qrsa-form"
    onsubmit={(e) => {
      e.preventDefault();
      applyPrompt(prompt);
    }}
  >
    <input
      bind:this={fileInput}
      type="file"
      class="qrsa-file-input"
      accept="image/png,image/jpeg,image/gif,application/pdf,.pdf,.txt,.md,text/plain"
      multiple
      data-testid="style-context-file"
      onchange={(event) => addContextFiles(event.currentTarget.files)}
    />
    <Button
      type="button"
      variant="outline"
      size="icon"
      class={dock ? 'qrsa-attach-btn' : ''}
      aria-label="Attach photo, note, or PDF"
      onclick={() => fileInput?.click()}
    >
      <Paperclip class="qrsa-icon-attach" />
    </Button>
    <Input
      bind:value={prompt}
      placeholder="Describe a look or paste a public URL"
      class={dock ? 'qrsa-prompt-input qrsa-prompt-input-dock' : 'qrsa-prompt-input'}
      aria-label="QR style prompt"
      onfocus={() => (promptFocused = true)}
      onblur={() => (promptFocused = false)}
    />
    <Button
      type="button"
      variant={listening ? 'default' : 'outline'}
      size="icon"
      class={dock && listening ? 'qrsa-mic-active' : ''}
      onclick={toggleListen}
      aria-label={listening ? 'Stop listening' : 'Speak style'}
      aria-pressed={listening}
    >
      {#if listening}
        <MicOff class="qrsa-icon-mic-off" />
      {:else}
        <Mic class="qrsa-icon-mic" />
      {/if}
    </Button>
    <Button
      type="submit"
      disabled={parsing || (!prompt.trim() && materials.length === 0)}
      class={dock ? 'qrsa-submit-btn' : ''}
    >
      {parsing ? 'Thinking…' : 'Apply'}
    </Button>
  </form>

  {#if voiceError}
    <p class="qrsa-error">{voiceError}</p>
  {/if}
  {#if prompted && lastSummary}
    <p class={dock ? 'qrsa-applied qrsa-applied-dock' : 'qrsa-applied'}>
      Applied ({engineLabel === 'agent'
        ? 'agent'
        : engineLabel === 'jev'
          ? 'Jev'
          : engineLabel === 'llm'
            ? 'LLM'
            : 'decision model'}):{' '}
      <span class={dock ? 'qrsa-applied-summary qrsa-applied-summary-dock' : 'qrsa-applied-summary'}>{lastSummary}</span>
    </p>
  {/if}

  {#if !dock || promptFocused || prompt.trim()}
  <div
    class={dock
      ? 'qrsa-chips qrsa-chips-dock'
      : 'qrsa-chips qrsa-chips-wrap'}
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
          ? 'qrsa-chip qrsa-chip-dock'
          : 'qrsa-chip'}
      >
        {chip}
      </button>
    {/each}
  </div>
  {/if}
</div>

<style>
@layer components {
	.qrsa-root {
		width: 100%;
	}

	.qrsa-root > * + * {
		margin-top: 0.5rem;
	}

	.qrsa-materials {
		display: flex;
		gap: 0.375rem;
		overflow-x: auto;
	}

	.qrsa-material-item {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.25rem;
		border-radius: 9999px;
		padding-block: 0.125rem;
		padding-inline: 0.25rem;
		font-size: 11px;
	}

	.qrsa-material-item-dock {
		background-color: rgb(255 255 255 / 0.1);
		color: white;
	}

	.qrsa-material-item:not(.qrsa-material-item-dock) {
		border: 1px solid var(--border);
		background-color: var(--muted);
		color: var(--foreground);
	}

	.qrsa-material-thumb {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 9999px;
		object-fit: cover;
	}

	.qrsa-material-name {
		max-width: 8rem;
	}

	.qrsa-truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.qrsa-form {
		display: flex;
		gap: 0.5rem;
	}

	.qrsa-file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.qrsa-error {
		font-size: 0.75rem;
		line-height: 1rem;
		color: var(--destructive);
	}

	.qrsa-applied {
		font-size: 0.75rem;
		line-height: 1rem;
	}

	.qrsa-applied-dock {
		color: rgb(255 255 255 / 0.75);
	}

	.qrsa-applied:not(.qrsa-applied-dock) {
		color: var(--muted-foreground);
	}

	.qrsa-applied-summary {
		font-weight: 500;
	}

	.qrsa-applied-summary-dock {
		color: var(--punch);
	}

	.qrsa-applied-summary:not(.qrsa-applied-summary-dock) {
		color: var(--foreground);
	}

	.qrsa-chips {
		display: flex;
		gap: 0.375rem;
	}

	.qrsa-chips-wrap {
		flex-wrap: wrap;
	}

	.qrsa-chip {
		cursor: pointer;
		border-radius: 9999px;
		padding-inline: 0.625rem;
		padding-block: 0.25rem;
		font-size: 11px;
		transition: color, background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.qrsa-chip-dock {
		flex-shrink: 0;
		border: 1px solid rgb(255 255 255 / 0.15);
		background-color: rgb(255 255 255 / 0.1);
		color: rgb(255 255 255 / 0.85);
	}

	.qrsa-chip:not(.qrsa-chip-dock) {
		border: 1px solid var(--border);
		background-color: var(--background);
		color: var(--muted-foreground);
	}
}

:global(.qrsa-prompt-input) {
	flex: 1;
}

:global(.qrsa-attach-btn) {
	width: 2.25rem;
	height: 2.25rem;
	flex-shrink: 0;
	background-color: white;
	color: var(--ink);
}

:global(.qrsa-attach-btn):hover {
	background-color: rgb(255 255 255 / 0.85);
}

:global(.qrsa-prompt-input-dock) {
	height: 2.25rem;
	background-color: white;
	color: var(--ink);
}

:global(.qrsa-prompt-input-dock)::placeholder {
	color: var(--muted-foreground);
}

@media (min-width: 48rem) {
	:global(.qrsa-prompt-input-dock) {
		font-size: 0.875rem;
		line-height: 1.25rem;
	}
}

:global(.qrsa-mic-active) {
	background-color: var(--punch);
	color: var(--ink);
}

:global(.qrsa-mic-active):hover {
	background-color: color-mix(in oklab, var(--punch) 80%, transparent);
}

:global(.qrsa-submit-btn) {
	height: 2.25rem;
	background-color: var(--punch);
	color: var(--ink);
}

:global(.qrsa-submit-btn):hover {
	background-color: color-mix(in oklab, var(--punch) 80%, transparent);
}

:global(.qrsa-icon-attach),
:global(.qrsa-icon-mic),
:global(.qrsa-icon-mic-off) {
	width: 1rem;
	height: 1rem;
}

:global(.qrsa-icon-remove) {
	width: 0.75rem;
	height: 0.75rem;
}

:global(.qrsa-chips-dock) {
	overflow-x: auto;
	-ms-overflow-style: none;
	scrollbar-width: none;
}

:global(.qrsa-chips-dock)::-webkit-scrollbar {
	display: none;
}

.qrsa-remove-btn {
	cursor: pointer;
	border-radius: 9999px;
	padding: 0.125rem;
	color: rgb(255 255 255 / 0.7);
}

.qrsa-remove-btn:hover {
	color: white;
}
</style>
