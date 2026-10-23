<script lang="ts">
  import MoreHorizontal from '@lucide/svelte/icons/ellipsis';
  import Copy from '@lucide/svelte/icons/copy';
  import Check from '@lucide/svelte/icons/check';
  import Pencil from '@lucide/svelte/icons/pencil';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/lib/components/ui/dropdown-menu';

  type Props = {
    code: string;
    copied?: boolean;
    class?: string;
    onCopy: () => void;
    onEdit: () => void;
    onOpenLink: () => void;
    onDelete: () => void;
  };

  let { code, copied = false, class: className = '', onCopy, onEdit, onOpenLink, onDelete }: Props = $props();
</script>

<DropdownMenu>
  <DropdownMenuTrigger>
    {#snippet child({ props })}
      <button
        {...props}
        type="button"
        aria-label="More actions"
        title="More actions"
        class="link-menu-trigger {className}"
      >
        <MoreHorizontal class="link-menu-icon" />
      </button>
    {/snippet}
  </DropdownMenuTrigger>

  <DropdownMenuContent align="end" class="link-menu-content">
    <DropdownMenuItem onclick={onCopy}>
      {#if copied}
        <Check class="link-menu-icon" />
      {:else}
        <Copy class="link-menu-icon" />
      {/if}
      {copied ? 'Copied' : 'Copy link'}
    </DropdownMenuItem>
    <DropdownMenuItem onclick={onEdit}>
      <Pencil class="link-menu-icon" />
      Edit destination
    </DropdownMenuItem>
    <DropdownMenuItem aria-label="Open /r/{code} in a new tab" onclick={onOpenLink}>
      <ExternalLink class="link-menu-icon" />
      Open in new tab
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onclick={onDelete}>
      <Trash2 class="link-menu-icon" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

<style>
  /* Layered so a caller's `class` utility still overrides the default look. */
  @layer components {
    .link-menu-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      cursor: pointer;
      border-radius: var(--radius);
      color: var(--muted-foreground);
      transition:
        color 150ms cubic-bezier(0.4, 0, 0.2, 1),
        background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  .link-menu-trigger:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }

  .link-menu-trigger[data-state='open'] {
    background-color: var(--ink);
    color: var(--punch);
  }

  /* Handed to a child (the icons, the menu), so global and prefixed. */
  :global(.link-menu-icon) {
    width: 1rem;
    height: 1rem;
  }

  :global(.link-menu-content) {
    width: 11rem;
    font-size: 13px;
  }
</style>
