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
  class="max-w-[min(440px,calc(100%-2rem))] gap-0 overflow-hidden p-0 sm:max-w-[min(440px,calc(100%-2rem))]"
>
  {#snippet children({ close })}
    <div use:trapFocus tabindex="-1" class="outline-none">
      <AuthSignInPanel {headline} {externalError} {onBeforeOAuth} onCancel={close} />
    </div>
  {/snippet}
</Dialog>
