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
  import type { Link } from '../types';

  type Props = {
    open?: boolean;
    onCreated: (site: Link) => void;
  };

  let { open = $bindable(false), onCreated }: Props = $props();

  let title = $state('');
  let chosen = $state<File[]>([]);
  let created = $state<Link | null>(null);
  let busy = $state(false);
  let progress = $state('');
  let error = $state('');
  let fileInput: HTMLInputElement | undefined = $state();
  let folderInput: HTMLInputElement | undefined = $state();

  const inspected = $derived(inspectSiteSelection(chosen));
  const problems = $derived(inspected.problems);
  const hasIndex = $derived(hasRootIndex(inspected.files));
  const fileCount = $derived(inspected.files.length);

  $effect(() => {
    if (!open && !busy) reset();
  });

  function reset(): void {
    title = '';
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

  function problemText(): string {
    if (problems.length) return problems.join(' ');
    if (chosen.length === 0) return 'Choose the files for this site first.';
    if (!hasIndex) return 'Add an index.html at the site root.';
    return '';
  }

  async function uploadAll(): Promise<void> {
    if (!created) return;
    const files = inspected.files;
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
        <p>
          Choose the folder that holds your site. The dashboard uploads its files and gives you a URL behind a
          QR code.
        </p>
      </header>

      <div class="site-create-field">
        <Label for="site-create-name">Site name</Label>
        <Input
          id="site-create-name"
          bind:value={title}
          placeholder="Spring menu"
          disabled={busy || created !== null}
          maxlength={120}
        />
      </div>

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

      {#if error}
        <p class="site-create-error" role="alert" data-testid="site-create-error">{error}</p>
      {/if}

      {#if progress}
        <p class="site-create-progress" aria-live="polite">{progress}</p>
      {/if}

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
    outline-style: none;
  }

  :global(.site-create-dialog) {
    max-width: min(520px, calc(100% - 2rem));
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

  .site-create-field {
    display: grid;
    gap: 0.4rem;
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
  }

  :global(.site-create-icon) {
    width: 14px;
    height: 14px;
  }
</style>
