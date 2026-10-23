<script lang="ts">
  import Alert from '@/lib/components/ui/alert.svelte';
  import AlertDescription from '@/lib/components/ui/alert-description.svelte';
  import Badge from '@/lib/components/ui/badge.svelte';
  import Button from '@/lib/components/ui/button.svelte';
  import Card from '@/lib/components/ui/card.svelte';
  import Input from '@/lib/components/ui/input.svelte';
  import Label from '@/lib/components/ui/label.svelte';
  import { NativeSelect, NativeSelectOption } from '@/lib/components/ui/native-select';
  import { createGift, fetchGifts, revokeGift } from '../lib/api';
  import { formatDay } from '../lib/plan';
  import { PLANS } from '../lib/pricing';
  import type { Gift, GiftCreated, GiftPlan, GiftStatus, NewGift } from '../types/gift';

  /** Mirrors GIFT_LIMITS in edge/gifts.ts. The server checks every field again; these only keep the form honest. */
  const LIMITS = {
    days: { min: 1, max: 366 },
    uses: { min: 1, max: 1000 },
    linkDays: { default: 30, max: 365 },
    noteMax: 120,
  } as const;

  const givable = PLANS.filter((plan) => plan.id !== 'free');
  const nameOf = (id: GiftPlan): string => PLANS.find((plan) => plan.id === id)?.name ?? id;
  const STATUS: Record<GiftStatus, string> = { active: 'Active', 'used up': 'Used up', expired: 'Expired', revoked: 'Revoked' };

  /** What a gift gives, who can claim it, and when its link stops, as one plain line. */
  function terms(gift: Pick<Gift, 'plan' | 'days' | 'redeem_by'>, who: string): string {
    const parts = [`${nameOf(gift.plan)} for ${gift.days} days`, who];
    if (gift.redeem_by) parts.push(`link works until ${formatDay(gift.redeem_by)}`);
    return parts.join(' · ');
  }

  // The number inputs hold text: a value bound through the Input component is a string, and an empty box is a real answer.
  let plan = $state<GiftPlan>('plus');
  let days = $state('30');
  let uses = $state('1');
  let linkDays = $state(String(LIMITS.linkDays.default));
  let note = $state('');
  let making = $state(false);
  let error = $state('');
  /** The gift just made. It is the only place its link exists: a reload, or the next gift, drops it. */
  let created = $state<GiftCreated | null>(null);
  let copied = $state(false);

  let gifts = $state<Gift[]>([]);
  let loading = $state(true);
  let listError = $state('');

  async function refresh(): Promise<void> {
    try {
      gifts = await fetchGifts();
      listError = '';
    } catch (err: unknown) {
      listError = err instanceof Error ? err.message : 'Failed to load gifts';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void refresh();
  });

  async function make(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (making) return;
    making = true;
    error = '';
    const body: NewGift = { plan, days: Number(days) };
    if (uses.trim()) body.uses = Number(uses);
    if (linkDays.trim()) body.link_days = Number(linkDays);
    if (note.trim()) body.note = note.trim();
    try {
      created = await createGift(body);
      copied = false;
      note = '';
      await refresh();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to make the gift';
    } finally {
      making = false;
    }
  }

  async function copy(): Promise<void> {
    if (!created) return;
    await navigator.clipboard.writeText(created.link);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  async function revoke(gift: Gift): Promise<void> {
    if (!window.confirm(`Revoke ${gift.note || gift.id}? Nobody else can claim it. Plans already given stay until they end.`)) return;
    try {
      const updated = await revokeGift(gift.id);
      gifts = gifts.map((each) => (each.id === updated.id ? updated : each));
    } catch (err: unknown) {
      listError = err instanceof Error ? err.message : 'Failed to revoke the gift';
    }
  }
</script>

<section data-testid="gifts-section" class="gifts-section">
  <div>
    <h1 class="gifts-title">Gifts</h1>
    <p class="gifts-lede">
      Give someone a plan for a while. The link holds only a random token: the plan, the days, and who can use it stay on the server.
    </p>
  </div>

  <Card class="gifts-form-card">
    <form data-testid="gift-form" onsubmit={make} class="gifts-form">
      <div class="gifts-grid">
        <div class="gifts-field">
          <Label for="gift-plan">Plan</Label>
          <NativeSelect id="gift-plan" class="gifts-select-full" bind:value={plan}>
            {#each givable as option (option.id)}
              <NativeSelectOption value={option.id}>{option.name}</NativeSelectOption>
            {/each}
          </NativeSelect>
        </div>
        <div class="gifts-field">
          <Label for="gift-days">Plan lasts (days)</Label>
          <Input id="gift-days" type="number" inputmode="numeric" required min={LIMITS.days.min} max={LIMITS.days.max} step="1" bind:value={days} />
        </div>
        <div class="gifts-field">
          <Label for="gift-uses">People who can claim it</Label>
          <Input id="gift-uses" type="number" inputmode="numeric" min={LIMITS.uses.min} max={LIMITS.uses.max} step="1" bind:value={uses} />
        </div>
        <div class="gifts-field">
          <Label for="gift-link-days">Link works for (days)</Label>
          <Input id="gift-link-days" type="number" inputmode="numeric" min="1" max={LIMITS.linkDays.max} step="1" bind:value={linkDays} />
        </div>
      </div>

      <div class="gifts-field">
        <Label for="gift-note">Note</Label>
        <Input id="gift-note" maxlength={LIMITS.noteMax} placeholder="For Sam" autocomplete="off" bind:value={note} />
        <p class="gifts-note-desc">
          Only administrators see it. A plan’s days start when someone claims it; the link itself stops working after its own days, used or not.
        </p>
      </div>

      {#if error}
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      {/if}

      <Button type="submit" data-testid="gift-make" disabled={making} class="gifts-submit-btn">{making ? 'Making…' : 'Make gift link'}</Button>
    </form>

    {#if created}
      <div data-testid="gift-created" role="status" class="gifts-created">
        <p class="gifts-subhead">
          The link is ready. Copy it now: the server keeps only a hash of it and cannot show it again.
        </p>
        <div class="gifts-link-row">
          <Input
            data-testid="gift-link"
            readonly
            aria-label="Gift link"
            value={created.link}
            class="font-mono gifts-link-input"
            onfocus={(event) => event.currentTarget.select()}
          />
          <Button type="button" variant="outline" data-testid="gift-copy" onclick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
        </div>
        <p class="gifts-muted-xs">
          {terms(created, `${created.max_uses} ${created.max_uses === 1 ? 'person' : 'people'} can claim it`)}
        </p>
      </div>
    {/if}
  </Card>

  <Card class="gifts-list-card">
    <div class="gifts-list-header">
      <h2 class="gifts-subhead">Gifts made</h2>
    </div>
    {#if loading}
      <p class="gifts-status-msg">Loading gifts…</p>
    {:else}
      {#if listError}
        <div class="gifts-error-wrap">
          <Alert variant="destructive">
            <AlertDescription>{listError}</AlertDescription>
          </Alert>
        </div>
      {/if}
      {#if gifts.length === 0}
        {#if !listError}
          <p class="gifts-status-msg">No gifts yet.</p>
        {/if}
      {:else}
        <ul data-testid="gift-list" class="gifts-list">
          {#each gifts as gift (gift.id)}
            <li
              data-testid="gift-row"
              data-gift-id={gift.id}
              class="gifts-list-item"
            >
              <div class="gifts-item-body">
                <p class="gifts-item-head">
                  <span class="gifts-item-note">{gift.note || 'No note'}</span>
                  <Badge data-testid="gift-status" variant={gift.status === 'active' ? 'secondary' : 'outline'}>
                    {STATUS[gift.status]}
                  </Badge>
                </p>
                <p class="gifts-item-meta">
                  {terms(gift, `${gift.uses} of ${gift.max_uses} claimed`)} · <span class="font-mono gifts-id">{gift.id}</span> · by {gift.created_by}
                </p>
              </div>
              {#if gift.status === 'active'}
                <Button variant="outline" size="sm" data-testid="gift-revoke" class="gifts-revoke-btn" onclick={() => revoke(gift)}>
                  Revoke
                </Button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </Card>
</section>

<style>
  @layer components {
    .gifts-section > * + * {
      margin-top: 1.5rem;
    }

    .gifts-title {
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--foreground);
    }

    .gifts-lede {
      margin-top: 0.375rem;
      max-width: 32rem;
      font-size: 0.875rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .gifts-form > * + * {
      margin-top: 1.25rem;
    }

    .gifts-grid {
      display: grid;
      gap: 1rem;
    }

    .gifts-field {
      /* field wrapper for rhythm (space rule below) */
      display: contents;
    }
    :global(.gifts-field > * + *) {
      margin-top: 0.375rem;
    }

    :global(.gifts-select-full) {
      width: 100%;
    }

    .gifts-note-desc {
      font-size: 0.75rem;
      line-height: 1rem;
      color: var(--muted-foreground);
    }

    .gifts-created > * + * {
      margin-top: 0.5rem;
    }

    .gifts-created {
      border-top: 1px solid var(--border);
      padding-top: 1.25rem;
    }

    .gifts-subhead {
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 500;
      color: var(--foreground);
    }

    .gifts-link-row {
      display: flex;
      gap: 0.5rem;
    }

    :global(.gifts-link-input) {
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .gifts-muted-xs {
      font-size: 0.75rem;
      line-height: 1rem;
      color: var(--muted-foreground);
    }

    .gifts-list-header {
      border-bottom: 1px solid var(--border);
      padding-left: 1.25rem;
      padding-right: 1.25rem;
      padding-top: 0.75rem;
      padding-bottom: 0.75rem;
    }

    .gifts-status-msg {
      padding: 2rem;
      text-align: center;
      font-size: 0.75rem;
      line-height: 1rem;
      color: var(--muted-foreground);
    }

    .gifts-error-wrap {
      padding: 1.25rem;
    }

    .gifts-list > * + * {
      border-top: 1px solid var(--border);
    }

    .gifts-list-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-left: 1.25rem;
      padding-right: 1.25rem;
      padding-top: 0.875rem;
      padding-bottom: 0.875rem;
    }

    .gifts-item-body {
      min-width: 0;
    }

    .gifts-item-head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 13px;
      font-weight: 500;
      color: var(--foreground);
    }

    .gifts-item-note {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .gifts-item-meta {
      margin-top: 0.25rem;
      font-size: 0.75rem;
      line-height: 1.625;
      color: var(--muted-foreground);
    }

    .gifts-id {
      word-break: break-all;
    }

    :global(.gifts-form-card) {
      gap: 1.25rem;
      padding: 1.25rem;
    }

    :global(.gifts-list-card) {
      gap: 0;
      padding-top: 0;
      padding-bottom: 0;
    }

    :global(.gifts-submit-btn) {
      width: 100%;
    }

    :global(.gifts-revoke-btn) {
      align-self: flex-start;
    }
  }

  @media (width < 40rem) {
    :global(.gifts-submit-btn) {
      height: 2.5rem;
    }

    :global(.gifts-revoke-btn) {
      height: 2.25rem;
      padding-left: 0.75rem;
      padding-right: 0.75rem;
    }
  }

  @media (min-width: 40rem) {
    .gifts-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .gifts-list-item {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }


    :global(.gifts-submit-btn) {
      width: auto;
    }
    :global(.gifts-revoke-btn) {
      align-self: center;
    }
  }

  @media (min-width: 64rem) {
    .gifts-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
</style>
