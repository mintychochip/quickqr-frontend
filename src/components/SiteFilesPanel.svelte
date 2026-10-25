<script lang="ts">
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Upload from '@lucide/svelte/icons/upload';
  import Button from '@/lib/components/ui/button.svelte';
  import { deleteSiteFile, fetchSite, uploadSiteFile } from '../lib/api';
  import { formatBytes, inspectSiteSelection } from '../lib/siteFiles';
  import type { Link, SiteFile } from '../types';

  type Props = { site: Link; canManage: boolean };
  let { site, canManage }: Props = $props();

  let files = $state<SiteFile[]>([]);
  let loading = $state(true);
  let loadError = $state('');
  let chosen = $state<File[]>([]);
  let busy = $state(false);
  let progress = $state('');
  let error = $state('');
  let fileInput: HTMLInputElement | undefined = $state();
  let folderInput: HTMLInputElement | undefined = $state();
  let loadSeq = 0;

  const totalBytes = $derived(files.reduce((sum, file) => sum + file.size, 0));
  const inspected = $derived(
    inspectSiteSelection(chosen, {
      existingPaths: files.map((file) => file.path),
      existingBytes: totalBytes,
    }),
  );
  const problems = $derived(inspected.problems);
  const missingIndex = $derived(!loading && !loadError && !files.some((file) => file.path === 'index.html'));

  async function load(code = site.code): Promise<void> {
    const seq = ++loadSeq;
    loading = true;
    loadError = '';
    try {
      const answer = await fetchSite(code);
      if (seq === loadSeq) files = answer.files;
    } catch (err) {
      if (seq === loadSeq) loadError = err instanceof Error ? err.message : 'Could not load this site’s files.';
    } finally {
      if (seq === loadSeq) loading = false;
    }
  }

  $effect(() => {
    const code = site.code;
    void load(code);
  });

  function pick(input: HTMLInputElement | undefined): void {
    input?.click();
  }

  function onFiles(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    chosen = Array.from(input.files ?? []);
    input.value = '';
    error = '';
  }

  async function upload(): Promise<void> {
    if (!canManage || busy) return;
    if (chosen.length === 0) {
      error = 'Choose the files to add first.';
      return;
    }
    if (problems.length) {
      error = problems.join(' ');
      return;
    }
    busy = true;
    error = '';
    try {
      const entries = inspected.files;
      for (const [index, entry] of entries.entries()) {
        progress = `Uploading ${index + 1} of ${entries.length}: ${entry.path}`;
        await uploadSiteFile(site.code, entry.path, entry.file);
      }
      chosen = [];
      await load();
    } catch (err) {
      error = err instanceof Error ? err.message : 'A file could not be uploaded. Try again.';
      await load();
    } finally {
      busy = false;
      progress = '';
    }
  }

  async function remove(file: SiteFile): Promise<void> {
    if (!canManage || busy) return;
    if (!window.confirm(`Delete ${file.path} from this site?`)) return;
    busy = true;
    error = '';
    try {
      await deleteSiteFile(site.code, file.path);
      files = files.filter((entry) => entry.path !== file.path);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not delete that file.';
    } finally {
      busy = false;
    }
  }
</script>

<section class="site-files" data-testid="site-files-panel" aria-label={`Files for ${site.title || 'site'}`}>
  <header class="site-files-head">
    <div>
      <h3>Files</h3>
      <p>
        {#if loading}
          Loading…
        {:else}
          {files.length} of 64 files · {formatBytes(totalBytes)} of 10 MiB
        {/if}
      </p>
    </div>
    {#if canManage}
      <div class="site-files-picker">
        <input
          bind:this={fileInput}
          class="site-file-input"
          type="file"
          multiple
          data-testid="site-files-input"
          onchange={onFiles}
          disabled={busy}
        />
        <input
          bind:this={folderInput}
          class="site-file-input"
          type="file"
          multiple
          webkitdirectory
          data-testid="site-files-folder"
          onchange={onFiles}
          disabled={busy}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onclick={() => pick(fileInput)}
          disabled={busy || loading || loadError !== ''}
        >
          <Upload class="site-files-icon" />
          Add files
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onclick={() => pick(folderInput)}
          disabled={busy || loading || loadError !== ''}
        >
          <FolderOpen class="site-files-icon" />
          Add folder
        </Button>
      </div>
    {/if}
  </header>

  {#if loadError}
    <div class="site-files-error" role="alert">
      <p>{loadError}</p>
      <Button variant="outline" size="sm" onclick={() => load()}>Try again</Button>
    </div>
  {:else if loading}
    <p class="site-files-empty">Loading files…</p>
  {:else if files.length === 0}
    <p class="site-files-empty">
      No files yet. Add a folder with an <span class="site-files-code">index.html</span> at its root.
    </p>
  {:else}
    <ul class="site-files-list">
      {#each files as file (file.path)}
        <li class="site-files-item">
          <span class="site-files-path">{file.path}</span>
          <span class="site-files-size">{formatBytes(file.size)}</span>
          {#if canManage}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${file.path}`}
              onclick={() => remove(file)}
              disabled={busy}
            >
              <Trash2 class="site-files-icon" />
            </Button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  {#if missingIndex}
    <p class="site-files-warning">
      Add an <span class="site-files-code">index.html</span> at the root; without it the site address answers 404.
    </p>
  {/if}

  {#if problems.length > 0 && chosen.length > 0}
    <p class="site-files-error" role="alert">{problems.join(' ')}</p>
  {/if}
  {#if error}
    <p class="site-files-error" role="alert" data-testid="site-files-error">{error}</p>
  {/if}
  {#if progress}
    <p class="site-files-progress" aria-live="polite">{progress}</p>
  {/if}

  {#if canManage && chosen.length > 0}
    <div class="site-files-confirm">
      <span>{chosen.length} selected, {formatBytes(inspected.totalBytes - totalBytes)} to add</span>
      <Button type="button" size="sm" onclick={upload} disabled={busy} data-testid="site-files-upload">
        {busy ? 'Uploading…' : 'Upload'}
      </Button>
    </div>
  {/if}

  {#if !canManage}
    <p class="site-files-muted">Sites are a Pro feature; the files are read-only on this plan.</p>
  {/if}
</section>

<style>
  .site-files {
    padding: 16px 18px 18px;
    border-top: 1px solid var(--border);
    font-size: 0.8rem;
  }

  .site-files-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .site-files-head h3 {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .site-files-head p {
    margin: 0.2rem 0 0;
    color: var(--muted-foreground);
  }

  .site-files-picker {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.4rem;
  }

  .site-file-input {
    display: none;
  }

  .site-files-list {
    display: grid;
    gap: 0.15rem;
    max-height: 250px;
    margin: 0.75rem 0 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  .site-files-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }

  .site-files-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.72rem;
  }

  .site-files-size {
    color: var(--muted-foreground);
    font-size: 0.72rem;
    white-space: nowrap;
  }

  .site-files-empty {
    margin: 0.75rem 0 0;
    color: var(--muted-foreground);
    line-height: 1.5;
  }

  .site-files-code {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.72rem;
  }

  .site-files-warning,
  .site-files-error {
    margin: 0.6rem 0 0;
    color: var(--destructive);
    line-height: 1.45;
  }

  .site-files-muted {
    margin: 0.6rem 0 0;
    color: var(--muted-foreground);
  }

  .site-files-progress {
    margin: 0.6rem 0 0;
    color: var(--muted-foreground);
  }

  .site-files-confirm {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 0.75rem;
    padding-top: 0.6rem;
    border-top: 1px solid var(--border);
  }

  .site-files-confirm span {
    color: var(--muted-foreground);
  }

  :global(.site-files-icon) {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 640px) {
    .site-files-head {
      flex-direction: column;
    }

    .site-files-picker {
      justify-content: flex-start;
    }
  }
</style>
