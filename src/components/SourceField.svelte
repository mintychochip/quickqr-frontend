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

<div class="space-y-2">
  <Label for={id}>{forced ? forced.bar.label : 'Link, phone, email, or text'}</Label>
  <div class="relative">
    <DropdownMenu bind:open={menuOpen}>
      <DropdownMenuTrigger>
        {#snippet child({ props })}
          <button
            {...props}
            type="button"
            data-testid="type-menu"
            aria-label="Code type: {modeLabel}"
            title="Choose the kind of code"
            class="absolute inset-y-0 left-0 z-10 flex w-14 cursor-pointer items-center justify-center gap-0.5 rounded-l-lg border-r border-input text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Icon class="size-4" />
            <ChevronDown class="size-3" />
          </button>
        {/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-64" data-testid="type-menu-content">
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
      class="h-11 pl-16 text-base aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-base"
    />
  </div>
  <p
    id="{id}-hint"
    data-testid="detected-kind"
    class="flex min-h-5 min-w-0 items-center gap-x-2 text-xs text-muted-foreground"
  >
    {#if resolved.status === 'too-long'}
      <span class="text-destructive">
        Too long for a QR code. Keep it under {resolved.limit.toLocaleString()} bytes.
      </span>
    {:else if resolved.status === 'invalid'}
      <span class="shrink-0 font-medium text-foreground">{resolved.type.label}</span>
      <span class="min-w-0 text-destructive">{resolved.problem}</span>
    {:else if ready}
      <span class="shrink-0 font-medium text-foreground">{ready.type.label}</span>
      {#if encoded}
        <span class="min-w-0 truncate font-mono">{encoded}</span>
      {/if}
    {/if}
    {#if forced}
      <button
        type="button"
        data-testid="auto-detect"
        class="ml-auto shrink-0 cursor-pointer rounded-sm underline underline-offset-2 transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        onclick={() => (forcedType = null)}
      >
        Auto-detect
      </button>
    {:else if unsure}
      <button
        type="button"
        data-testid="not-right"
        class="ml-auto shrink-0 cursor-pointer rounded-sm underline underline-offset-2 transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        onclick={() => (menuOpen = true)}
      >
        Not right?
      </button>
    {/if}
  </p>
  {#if forced}
    <TypeFields {id} type={forced} values={fieldValues[forced.id] ?? {}} onChange={setField} />
  {/if}
</div>
