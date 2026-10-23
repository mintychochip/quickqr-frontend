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

<span class={cn('logo', className)}>
  <svg
    viewBox="0 0 32 32"
    class={cn('logo-mark', markClass)}
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
      class={cn('logo-wordmark', wordmarkClass)}
    >
      quickqr<span class="logo-domain">.app</span>
    </span>
  {/if}
</span>

<style>
  /*
   * In `@layer components` so a caller's utility (`size-5`, `text-[18px]`, `mb-4`) wins: the
   * utilities layer is ordered after components. An unlayered rule here would beat every utility
   * and ignore `markClass` / `wordmarkClass`.
   */
  @layer components {
    .logo {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 0.5rem;
    }

    .logo-mark {
      width: 1.75rem;
      height: 1.75rem;
      flex-shrink: 0;
    }

    .logo-wordmark {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 17px;
      line-height: calc(1.5 / 1);
      font-weight: 500;
      letter-spacing: -0.045em;
      color: var(--foreground);
    }

    .logo-domain {
      color: var(--muted-foreground);
    }
  }
</style>
