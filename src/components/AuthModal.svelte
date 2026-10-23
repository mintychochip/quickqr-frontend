<script lang="ts">
  import Dialog from '@/lib/components/ui/dialog.svelte';
  import { trapFocus } from '@/lib/focusTrap';
  import AuthSignInPanel from './AuthSignInPanel.svelte';

  type Props = {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** What the modal says it is for. The panel's own title when left out. */
    headline?: string;
    externalError?: string | null;
    /** Runs when a provider is chosen, just before the browser leaves for it. */
    onBeforeOAuth?: () => void;
  };

  let {
    open = $bindable(false),
    onOpenChange,
    headline,
    externalError = null,
    onBeforeOAuth,
  }: Props = $props();
</script>

<Dialog
  bind:open
  {onOpenChange}
  labelledby="auth-dialog-title"
  class="auth-modal-dialog"
>
  {#snippet children({ close })}
    <div use:trapFocus tabindex="-1" class="auth-modal-trap">
      <AuthSignInPanel {headline} {externalError} {onBeforeOAuth} onCancel={close} />
    </div>
  {/snippet}
</Dialog>

<style>
  @layer components {
    :global(.auth-modal-dialog) {
      max-width: min(440px, calc(100% - 2rem));
      gap: 0;
      overflow: hidden;
      padding: 0;
    }

    .auth-modal-trap {
      outline-style: none;
    }
  }
</style>
