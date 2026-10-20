<script lang="ts">
  import { cn } from '@/lib/utils';

  type Props = {
    class?: string;
    wordmark?: boolean;
    markClass?: string;
    wordmarkClass?: string;
  };

  let {
    class: className = '',
    wordmark = true,
    markClass = '',
    wordmarkClass = '',
  }: Props = $props();
</script>

<span class={cn('inline-flex min-w-0 items-center gap-2', className)}>
  <svg
    viewBox="0 0 32 32"
    class={cn('size-7 shrink-0', markClass)}
    aria-hidden="true"
  >
    <rect width="32" height="32" rx="9" fill="var(--punch)" />
    <rect
      x="9.5"
      y="6.25"
      width="13"
      height="13"
      rx="3.75"
      fill="none"
      stroke="var(--ink)"
      stroke-width="3.5"
    />
    <rect x="14.25" y="11" width="3.5" height="3.5" rx="0.9" fill="var(--ink)" />
    <path
      d="M22.5 14.5v11"
      stroke="var(--ink)"
      stroke-width="3.5"
      stroke-linecap="round"
    />
  </svg>
  {#if wordmark}
    <span
      class={cn(
        'truncate text-[17px] font-medium tracking-[-0.045em] text-foreground',
        wordmarkClass,
      )}
    >
      quickqr<span class="text-muted-foreground">.app</span>
    </span>
  {/if}
</span>
