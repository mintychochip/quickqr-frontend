<script lang="ts">
  import Dialog from '@/lib/components/ui/dialog.svelte';
  import AuthSignInPanel from './AuthSignInPanel.svelte';

  type Props = {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    resumeAfterOAuth?: boolean;
    externalError?: string | null;
  };

  let {
    open = $bindable(false),
    onOpenChange,
    resumeAfterOAuth = false,
    externalError = null,
  }: Props = $props();
</script>

<Dialog bind:open {onOpenChange} class="max-w-[min(440px,calc(100%-2rem))] gap-0 overflow-hidden p-0 sm:max-w-[min(440px,calc(100%-2rem))]">
  {#snippet children({ close })}
    <AuthSignInPanel
      {resumeAfterOAuth}
      {externalError}
      onCancel={close}
    />
  {/snippet}
</Dialog>
