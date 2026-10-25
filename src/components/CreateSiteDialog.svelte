<script lang="ts">
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import Upload from '@lucide/svelte/icons/upload';
  import Button from '@/lib/components/ui/button.svelte';
  import Dialog from '@/lib/components/ui/dialog.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import Label from '@/lib/components/ui/label.svelte';
  import { createSite, uploadSiteFile } from '../lib/api';
  import { trapFocus } from '../lib/focusTrap';
  import { formatBytes, hasRootIndex, inspectSiteSelection } from '../lib/siteFiles';
  import { SITE_TEMPLATES, templateById } from '../lib/siteTemplates';
  import type { Link } from '../types';

  type Props = {
    open?: boolean;
    onCreated: (site: Link) => void;
  };

  let { open = $bindable(false), onCreated }: Props = $props();

  let title = $state('');
  let selectedId = $state('blank');
  let chosen = $state<File[]>([]);
  let created = $state<Link | null>(null);
  let busy = $state(false);
  let progress = $state('');
  let error = $state('');
  let fileInput: HTMLInputElement | undefined = $state();
  let folderInput: HTMLInputElement | undefined = $state();

  const selected = $derived(templateById(selectedId) ?? SITE_TEMPLATES[0]);
  const isBlank = $derived(selectedId === 'blank');
  const inspected = $derived(inspectSiteSelection(chosen));
  const problems = $derived(inspected.problems);
  const hasIndex = $derived(hasRootIndex(inspected.files));
  const fileCount = $derived(inspected.files.length);

  type UploadEntry = { path: string; file: Blob };
  const uploadEntries = $derived<UploadEntry[]>(
    isBlank
      ? inspected.files.map((entry) => ({ path: entry.path, file: entry.file }))
      : (selected?.files ?? []).map((file) => ({
          path: file.path,
          file: new Blob([file.body], { type: file.type }),
        })),
  );

  $effect(() => {
    if (!open && !busy) reset();
  });

  function reset(): void {
    title = '';
    selectedId = 'blank';
    chosen = [];
    created = null;
    busy = false;
    progress = '';
    error = '';
  }

  function pick(input: HTMLInputElement | undefined): void {
    input?.click();
  }

  function onFiles(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    chosen = Array.from(input.files ?? []);
    input.value = '';
    error = '';
  }

  function chooseTemplate(id: string): void {
    if (busy || created) return;
    selectedId = id;
    chosen = [];
    error = '';
  }

  function problemText(): string {
    if (!isBlank) return '';
    if (problems.length) return problems.join(' ');
    if (chosen.length === 0) return 'Choose the files for this site first.';
    if (!hasIndex) return 'Add an index.html at the site root.';
    return '';
  }

  async function uploadAll(): Promise<void> {
    if (!created) return;
    const files = uploadEntries;
    busy = true;
    error = '';
    try {
      for (const [index, entry] of files.entries()) {
        progress = `Uploading ${index + 1} of ${files.length}: ${entry.path}`;
        await uploadSiteFile(created.code, entry.path, entry.file);
      }
      progress = '';
      open = false;
    } catch (err) {
      progress = '';
      error = err instanceof Error ? err.message : 'A file could not be uploaded. Try again.';
    } finally {
      busy = false;
    }
  }

  async function submit(): Promise<void> {
    if (busy) return;
    error = '';
    if (created) {
      const problem = problemText();
      if (problem) {
        error = problem;
        return;
      }
      await uploadAll();
      return;
    }
    if (!title.trim()) {
      error = 'Give the site a name.';
      return;
    }
    const problem = problemText();
    if (problem) {
      error = problem;
      return;
    }

    busy = true;
    try {
      const site = await createSite(title.trim());
      created = site;
      onCreated(site);
      await uploadAll();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not create the site. Try again.';
      busy = false;
    }
  }
</script>

<Dialog bind:open labelledby="site-create-title" class="site-create-dialog">
  {#snippet children({ close })}
    <div use:trapFocus tabindex="-1" class="site-create-trap">
      <header class="site-create-head">
        <h2 id="site-create-title">New site</h2>
        <p>Start with a template, or bring the files you already made.</p>
      </header>

      <div class="site-create-body">
        <div class="site-create-gallery">
          <p class="site-create-eyebrow">Start from</p>
          <div class="site-template-grid" role="group" aria-label="Site starting point">
            {#each SITE_TEMPLATES as template (template.id)}
              <div class="site-template-card" class:selected={selectedId === template.id}>
                <span class="site-template-preview" aria-hidden="true">
                  {#if template.files[0]}
                    <iframe
                      title=""
                      sandbox=""
                      tabindex="-1"
                      loading="lazy"
                      srcdoc={template.files[0].body}
                    ></iframe>
                  {:else}
                    <span class="site-template-blank">+</span>
                  {/if}
                </span>
                <span class="site-template-name">{template.name}</span>
                <span class="site-template-tagline">{template.tagline}</span>
                <button
                  type="button"
                  class="site-template-hit"
                  aria-label={`Use the ${template.name} template`}
                  aria-pressed={selectedId === template.id}
                  data-testid={`site-template-${template.id}`}
                  onclick={() => chooseTemplate(template.id)}
                  disabled={busy || created !== null}
                ></button>
              </div>
            {/each}
          </div>
        </div>

        <div class="site-create-detail">
          <div class="site-create-field">
            <Label for="site-create-name">Site name</Label>
            <Input
              id="site-create-name"
              bind:value={title}
              placeholder={isBlank ? 'Spring menu' : selected?.name ?? 'My site'}
              disabled={busy || created !== null}
              maxlength={120}
            />
          </div>

          <p class="site-create-description">{selected?.description}</p>

          {#if isBlank}
            <div class="site-create-picker">
              <input
                bind:this={fileInput}
                class="site-file-input"
                type="file"
                multiple
                data-testid="site-create-files"
                onchange={onFiles}
                disabled={busy}
              />
              <input
                bind:this={folderInput}
                class="site-file-input"
                type="file"
                multiple
                webkitdirectory
                data-testid="site-create-folder"
                onchange={onFiles}
                disabled={busy}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onclick={() => pick(fileInput)}
                disabled={busy}
              >
                <Upload class="site-create-icon" />
                Choose files
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onclick={() => pick(folderInput)}
                disabled={busy}
              >
                <FolderOpen class="site-create-icon" />
                Choose folder
              </Button>
            </div>

            {#if chosen.length > 0}
              <div class="site-create-selection" data-testid="site-create-selection">
                <p>
                  <strong>{fileCount}</strong> {fileCount === 1 ? 'file' : 'files'}, {formatBytes(inspected.totalBytes)}
                  {#if hasIndex}
                    <span class="site-create-index">index.html included</span>
                  {:else}
                    <span class="site-create-index-missing">index.html missing</span>
                  {/if}
                </p>
                {#if inspected.files.length > 0}
                  <ul>
                    {#each inspected.files.slice(0, 6) as entry (entry.path)}
                      <li>{entry.path}</li>
                    {/each}
                  </ul>
                  {#if inspected.files.length > 6}
                    <p class="site-create-more">and {inspected.files.length - 6} more</p>
                  {/if}
                {/if}
              </div>
            {/if}
          {:else}
            <p class="site-create-template-note">
              Includes a ready <span class="site-create-code">index.html</span>. You can add or replace files after it
              is created.
            </p>
          {/if}

          {#if error}
            <p class="site-create-error" role="alert" data-testid="site-create-error">{error}</p>
          {/if}

          {#if progress}
            <p class="site-create-progress" aria-live="polite">{progress}</p>
          {/if}
        </div>
      </div>

      <footer class="site-create-actions">
        <Button type="button" variant="ghost" size="sm" onclick={close} disabled={busy}>Cancel</Button>
        <Button type="button" variant="punch" size="sm" onclick={submit} disabled={busy} data-testid="site-create-submit">
          {#if busy}
            Working…
          {:else if created}
            Retry upload
          {:else}
            Create site
          {/if}
        </Button>
      </footer>
    </div>
  {/snippet}
</Dialog>

<style>
  .site-create-trap {
    display: grid;
    gap: 1rem;
    max-height: min(760px, 90vh);
    overflow-y: auto;
    outline-style: none;
  }

  :global(.site-create-dialog) {
    max-width: min(860px, calc(100% - 2rem));
  }

  .site-create-head h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: -0.025em;
  }

  .site-create-head p {
    margin: 0.35rem 0 0;
    color: var(--muted-foreground);
    line-height: 1.5;
  }

  .site-create-body {
    display: grid;
    grid-template-columns: minmax(0, 1.18fr) minmax(220px, 0.82fr);
    gap: 1.4rem;
    align-items: start;
  }

  .site-create-eyebrow {
    margin: 0 0 0.55rem;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted-foreground);
  }

  .site-template-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
  }

  .site-template-card {
    position: relative;
    display: grid;
    gap: 0.3rem;
    padding: 0.35rem;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 1.15);
    background: var(--card);
    color: var(--foreground);
    text-align: left;
    transition: background-color 140ms ease;
  }

  .site-template-card:hover {
    border-color: color-mix(in oklab, var(--foreground) 28%, var(--border));
    background: var(--muted);
  }

  .site-template-card.selected {
    border-color: var(--punch);
    box-shadow: 0 0 0 1px var(--punch);
    background: color-mix(in oklab, var(--punch) 8%, var(--card));
  }

  .site-template-card:has(.site-template-hit:disabled) {
    cursor: default;
    opacity: 0.6;
  }

  .site-template-hit {
    position: absolute;
    inset: 0;
    z-index: 1;
    padding: 0;
    border: 0;
    border-radius: inherit;
    background: transparent;
    cursor: pointer;
  }

  .site-template-hit:disabled {
    cursor: default;
  }

  .site-template-hit:focus-visible {
    outline: 2px solid var(--punch);
    outline-offset: 2px;
  }

  .site-template-preview {
    position: relative;
    display: block;
    overflow: hidden;
    aspect-ratio: 3 / 2;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 0.8);
    background: #f7f7f5;
  }

  .site-template-preview iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 400%;
    height: 400%;
    border: 0;
    transform: scale(0.25);
    transform-origin: top left;
    pointer-events: none;
  }

  .site-template-blank {
    display: grid;
    height: 100%;
    place-items: center;
    color: var(--muted-foreground);
    font-size: 2rem;
    font-weight: 300;
  }

  .site-template-name {
    padding-inline: 0.15rem;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .site-template-tagline {
    padding-inline: 0.15rem;
    font-size: 0.68rem;
    color: var(--muted-foreground);
  }

  .site-create-detail {
    display: grid;
    gap: 0.8rem;
    align-content: start;
  }

  .site-create-field {
    display: grid;
    gap: 0.4rem;
  }

  .site-create-description {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 0.82rem;
    line-height: 1.5;
  }

  .site-create-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .site-file-input {
    display: none;
  }

  .site-create-selection {
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--muted);
    font-size: 0.8rem;
  }

  .site-create-selection p {
    margin: 0;
  }

  .site-create-selection ul {
    display: grid;
    gap: 0.15rem;
    margin: 0.45rem 0 0;
    padding: 0;
    list-style: none;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.72rem;
    color: var(--muted-foreground);
  }

  .site-create-selection li {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .site-create-index {
    margin-left: 0.35rem;
    color: oklch(0.55 0.15 149);
  }

  .site-create-index-missing {
    margin-left: 0.35rem;
    color: var(--destructive);
  }

  .site-create-more {
    margin-top: 0.35rem;
    color: var(--muted-foreground);
  }

  .site-create-template-note {
    margin: 0;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--muted);
    color: var(--muted-foreground);
    font-size: 0.78rem;
    line-height: 1.5;
  }

  .site-create-code {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.72rem;
  }

  .site-create-error {
    margin: 0;
    color: var(--destructive);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .site-create-progress {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 0.8rem;
  }

  .site-create-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.2rem;
    border-top: 1px solid var(--border);
  }

  :global(.site-create-icon) {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 720px) {
    .site-create-body {
      grid-template-columns: minmax(0, 1fr);
    }

    .site-create-detail {
      border-top: 1px solid var(--border);
      padding-top: 0.9rem;
    }
  }

  @media (max-width: 480px) {
    .site-template-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .site-template-grid {
      gap: 0.75rem;
    }
  }
</style>
