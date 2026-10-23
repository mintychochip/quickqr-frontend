<script lang="ts">
  import AtSign from '@lucide/svelte/icons/at-sign';
  import Bitcoin from '@lucide/svelte/icons/bitcoin';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Contact from '@lucide/svelte/icons/contact';
  import CreditCard from '@lucide/svelte/icons/credit-card';
  import Globe from '@lucide/svelte/icons/globe';
  import IndianRupee from '@lucide/svelte/icons/indian-rupee';
  import Landmark from '@lucide/svelte/icons/landmark';
  import Mail from '@lucide/svelte/icons/mail';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import MessageSquare from '@lucide/svelte/icons/message-square';
  import Navigation from '@lucide/svelte/icons/navigation';
  import Phone from '@lucide/svelte/icons/phone';
  import Star from '@lucide/svelte/icons/star';
  import TypeIcon from '@lucide/svelte/icons/type';
  import WandSparkles from '@lucide/svelte/icons/wand-sparkles';
  import Wifi from '@lucide/svelte/icons/wifi';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroupHeading,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/lib/components/ui/dropdown-menu';
  import Input from '@/lib/components/ui/input.svelte';
  import Label from '@/lib/components/ui/label.svelte';
  import { GROUPS, TYPES, TYPE_BY_ID, type FieldValues, type Resolved, type TypeId } from '@/lib/payload';
  import TypeFields from './TypeFields.svelte';

  type Props = {
    id: string;
    /** What is in the bar. */
    value: string;
    /** The type the person chose from the menu, or null while the bar works it out. */
    forcedType: TypeId | null;
    fieldValues: FieldValues;
    resolved: Resolved;
  };

  let {
    id,
    value = $bindable(),
    forcedType = $bindable(),
    fieldValues = $bindable(),
    resolved,
  }: Props = $props();

  const ICONS: Record<TypeId, typeof Globe> = {
    link: Globe,
    text: TypeIcon,
    phone: Phone,
    sms: MessageSquare,
    email: Mail,
    whatsapp: MessageCircle,
    location: MapPin,
    directions: Navigation,
    event: CalendarDays,
    wifi: Wifi,
    contact: Contact,
    social: AtSign,
    review: Star,
    payment: CreditCard,
    crypto: Bitcoin,
    sepa: Landmark,
    upi: IndianRupee,
  };

  let menuOpen = $state(false);

  const forced = $derived(forcedType ? TYPE_BY_ID[forcedType] : null);
  const ready = $derived(resolved.status === 'ready' ? resolved : null);
  /** What the button shows: the chosen type, else the one the bar found. */
  const shown = $derived(forced ?? ready?.type ?? null);
  const Icon = $derived(shown ? ICONS[shown.id] : WandSparkles);
  const modeLabel = $derived(forced ? forced.label : shown ? `Auto-detect, ${shown.label}` : 'Auto-detect');
  /** Echo the encoded form when it differs from what was typed, unless it spans lines (a calendar entry, a contact card): the card under the code shows it. */
  const encoded = $derived(ready && !ready.payload.includes('\n') && ready.payload !== value.trim() ? ready.payload : '');
  const unsure = $derived(!forced && (ready?.guessed ?? false));
  const refused = $derived(resolved.status === 'invalid' || resolved.status === 'too-long');

  function choose(next: string) {
    forcedType = TYPES.find((type) => type.id === next)?.id ?? null;
  }

  function setField(key: string, next: string) {
    if (!forced) return;
    fieldValues = { ...fieldValues, [forced.id]: { ...fieldValues[forced.id], [key]: next } };
  }
</script>

<div class="source-field">
  <Label for={id}>{forced ? forced.bar.label : 'Link, phone, email, or text'}</Label>
  <div class="source-bar">
    <DropdownMenu bind:open={menuOpen}>
      <DropdownMenuTrigger>
        {#snippet child({ props })}
          <button
            {...props}
            type="button"
            data-testid="type-menu"
            aria-label="Code type: {modeLabel}"
            title="Choose the kind of code"
            class="source-type-button"
          >
            <Icon class="source-type-icon" />
            <ChevronDown class="source-chevron" />
          </button>
        {/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="source-type-menu" data-testid="type-menu-content">
        <DropdownMenuRadioGroup aria-label="Detection" value={forcedType ?? 'auto'} onValueChange={choose}>
          <DropdownMenuRadioItem value="auto" closeOnSelect>
            <WandSparkles />
            Auto-detect
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <!-- A heading names the radio group it sits in, so each section is its own group sharing the one value. -->
        {#each GROUPS as group (group.id)}
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={forcedType ?? 'auto'} onValueChange={choose}>
            <DropdownMenuGroupHeading>{group.label}</DropdownMenuGroupHeading>
            {#each group.types as type (type.id)}
              {@const TypeOptionIcon = ICONS[type.id]}
              <DropdownMenuRadioItem value={type.id} closeOnSelect>
                <TypeOptionIcon />
                {type.label}
              </DropdownMenuRadioItem>
            {/each}
          </DropdownMenuRadioGroup>
        {/each}
      </DropdownMenuContent>
    </DropdownMenu>
    <Input
      {id}
      type="text"
      required
      bind:value
      placeholder={forced ? forced.bar.placeholder : 'yoursite.com/menu or +1 555 123 4567'}
      inputmode={forced?.bar.inputMode}
      autocomplete="off"
      autocapitalize="none"
      spellcheck={false}
      aria-describedby="{id}-hint"
      aria-invalid={refused || undefined}
      class="source-input"
    />
  </div>
  <p id="{id}-hint" data-testid="detected-kind" class="source-hint">
    {#if resolved.status === 'too-long'}
      <span class="source-error">
        Too long for a QR code. Keep it under {resolved.limit.toLocaleString()} bytes.
      </span>
    {:else if resolved.status === 'invalid'}
      <span class="source-kind">{resolved.type.label}</span>
      <span class="source-problem">{resolved.problem}</span>
    {:else if ready}
      <span class="source-kind">{ready.type.label}</span>
      {#if encoded}
        <span class="source-encoded font-mono">{encoded}</span>
      {/if}
    {/if}
    {#if forced}
      <button
        type="button"
        data-testid="auto-detect"
        class="source-reset"
        onclick={() => (forcedType = null)}
      >
        Auto-detect
      </button>
    {:else if unsure}
      <button type="button" data-testid="not-right" class="source-reset" onclick={() => (menuOpen = true)}>
        Not right?
      </button>
    {/if}
  </p>
  {#if forced}
    <TypeFields {id} type={forced} values={fieldValues[forced.id] ?? {}} onChange={setField} />
  {/if}
</div>

<style>
  @layer components {
    .source-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .source-bar {
      position: relative;
    }

    .source-type-button {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.125rem;
      width: 3.5rem;
      cursor: pointer;
      border-top-left-radius: var(--radius);
      border-bottom-left-radius: var(--radius);
      border-right: 1px solid var(--input);
      color: var(--muted-foreground);
      outline-style: none;
      transition:
        color 150ms cubic-bezier(0.4, 0, 0.2, 1),
        background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .source-hint {
      display: flex;
      align-items: center;
      min-width: 0;
      min-height: 1.25rem;
      column-gap: 0.5rem;
      font-size: 0.75rem;
      line-height: 1rem;
      color: var(--muted-foreground);
    }

    .source-error {
      color: var(--destructive);
    }

    .source-kind {
      flex-shrink: 0;
      font-weight: 500;
      color: var(--foreground);
    }

    .source-problem {
      min-width: 0;
      color: var(--destructive);
    }

    .source-encoded {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .source-reset {
      margin-left: auto;
      flex-shrink: 0;
      cursor: pointer;
      border-radius: calc(var(--radius) * 0.6);
      text-decoration-line: underline;
      text-underline-offset: 2px;
      outline-style: none;
      transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  .source-type-button:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }

  .source-type-button:focus-visible {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
  }

  .source-reset:hover {
    color: var(--foreground);
  }

  .source-reset:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  /* Handed to a child (the icons, the menu, the input), so global and prefixed. */
  :global(.source-type-icon) {
    width: 1rem;
    height: 1rem;
  }

  :global(.source-chevron) {
    width: 0.75rem;
    height: 0.75rem;
  }

  :global(.source-type-menu) {
    width: 16rem;
  }

  /* Unlayered so it beats the input primitive's own height, padding, and the md font-size shrink. */
  :global(.source-input) {
    height: 2.75rem;
    padding-left: 4rem;
    font-size: 1rem;
    line-height: 1.5rem;
  }

  :global(.source-input[aria-invalid='true']) {
    border-color: var(--destructive);
  }

  :global(.source-input[aria-invalid='true']:focus-visible) {
    border-color: var(--destructive);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent);
  }
</style>
