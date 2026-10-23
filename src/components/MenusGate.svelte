<script lang="ts">
  import Badge from '@/lib/components/ui/badge.svelte';
  import Button from '@/lib/components/ui/button.svelte';
  import Card from '@/lib/components/ui/card.svelte';
</script>

<section data-testid="menus-gate" class="menus-gate">
  <Card class="menus-gate-card">
    <Badge variant="outline" class="menus-gate-badge">Pro</Badge>
    <h1 class="menus-gate-title">Menus are a Pro feature</h1>
    <p class="menus-gate-copy">
      Build a hosted menu behind a printed code and change it whenever you like—the code on the table stays the same.
    </p>
    <p class="menus-gate-note">
      Pro isn't on sale yet. A menu you already made keeps working.
    </p>
    <Button href="/#pricing" class="menus-gate-cta">See the plans</Button>
  </Card>
</section>

<style>
  @layer components {
    .menus-gate {
      display: flex;
      justify-content: flex-start;
    }

    :global(.menus-gate-card) {
      display: flex;
      width: 100%;
      max-width: 34rem;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1.5rem;
    }

    :global(.menus-gate-badge) {
      height: 1.25rem;
      border-color: var(--border);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted-foreground);
    }

    .menus-gate-title {
      font-size: 1.375rem;
      line-height: 1.9rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--foreground);
    }

    .menus-gate-copy {
      max-width: 30rem;
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--muted-foreground);
    }

    .menus-gate-note {
      font-size: 13px;
      line-height: 1.5;
      color: var(--muted-foreground);
    }

    :global(.menus-gate-cta) {
      margin-top: 0.25rem;
    }
  }
</style>
