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
        class="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-ink data-[state=open]:text-punch {className}"
      >
        <MoreHorizontal class="size-4" />
      </button>
    {/snippet}
  </DropdownMenuTrigger>

  <DropdownMenuContent align="end" class="w-44 text-[13px]">
    <DropdownMenuItem onclick={onCopy}>
      {#if copied}
        <Check class="size-4" />
      {:else}
        <Copy class="size-4" />
      {/if}
      {copied ? 'Copied' : 'Copy link'}
    </DropdownMenuItem>
    <DropdownMenuItem onclick={onEdit}>
      <Pencil class="size-4" />
      Edit destination
    </DropdownMenuItem>
    <DropdownMenuItem aria-label="Open /r/{code} in a new tab" onclick={onOpenLink}>
      <ExternalLink class="size-4" />
      Open in new tab
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onclick={onDelete}>
      <Trash2 class="size-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
