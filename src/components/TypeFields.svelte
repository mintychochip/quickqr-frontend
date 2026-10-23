<script lang="ts">
  import Info from '@lucide/svelte/icons/info';
  import { Checkbox } from '@/lib/components/ui/checkbox';
  import Input from '@/lib/components/ui/input.svelte';
  import Label from '@/lib/components/ui/label.svelte';
  import { NativeSelect, NativeSelectOption } from '@/lib/components/ui/native-select';
  import { visibleFields, type QrType, type Values } from '@/lib/payload';

  type Props = {
    /** Prefix for the control ids, so that two studios on a page cannot collide. */
    id: string;
    type: QrType;
    /** What was typed so far, as typed: not yet cleaned up. */
    values: Values;
    onChange: (key: string, value: string) => void;
  };

  let { id, type, values, onChange }: Props = $props();

  const fields = $derived(visibleFields(type, values));
</script>

{#if fields.length > 0 || type.note}
  <div class="type-fields" data-testid="type-fields">
    {#if fields.length > 0}
      <div class="type-grid">
        {#each fields as field (field.key)}
          {@const fieldId = `${id}-${field.key}`}
          {#if field.control === 'checkbox'}
            <div class="type-check-row">
              <Checkbox
                id={fieldId}
                checked={values[field.key] === 'true'}
                onCheckedChange={(checked) => onChange(field.key, checked ? 'true' : '')}
              />
              <Label for={fieldId} class="type-check-label">{field.label}</Label>
            </div>
          {:else}
            <div class="type-field">
              <Label for={fieldId}>{field.label}</Label>
              {#if field.control === 'select'}
                <NativeSelect
                  id={fieldId}
                  class="type-select"
                  value={values[field.key] || field.options[0].value}
                  onchange={(e) => onChange(field.key, e.currentTarget.value)}
                >
                  {#each field.options as option (option.value)}
                    <NativeSelectOption value={option.value}>{option.label}</NativeSelectOption>
                  {/each}
                </NativeSelect>
              {:else}
                <Input
                  id={fieldId}
                  type={field.control === 'date' ? 'date' : field.control === 'datetime' ? 'datetime-local' : 'text'}
                  value={values[field.key] ?? ''}
                  oninput={(e) => onChange(field.key, e.currentTarget.value)}
                  placeholder={field.control === 'text' ? field.placeholder : undefined}
                  inputmode={field.control === 'text' ? field.inputMode : undefined}
                  autocomplete="off"
                  autocapitalize="none"
                  spellcheck={false}
                  class="type-input"
                />
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
    {#if type.note}
      <p data-testid="type-note" class="type-note">
        <Info class="type-note-icon" aria-hidden="true" />
        <span>{type.note}</span>
      </p>
    {/if}
  </div>
{/if}

<style>
  @layer components {
    .type-fields {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-top: 0.5rem;
    }

    .type-grid {
      display: grid;
      column-gap: 0.75rem;
      row-gap: 0.75rem;
    }

    .type-check-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .type-field {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 0.375rem;
    }

    .type-note {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.75rem;
      line-height: 1rem;
      color: var(--muted-foreground);
    }
  }

  @media (min-width: 40rem) {
    .type-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .type-check-row {
      grid-column: span 2 / span 2;
    }
  }

  /* Handed to a child, so global and prefixed. Unlayered so it beats the primitive. */
  :global(.type-check-label) {
    cursor: pointer;
    font-weight: 400;
  }

  :global(.type-select) {
    width: 100%;
  }

  :global(.type-input) {
    font-size: 1rem;
    line-height: 1.5rem;
  }

  @media (min-width: 48rem) {
    :global(.type-input) {
      font-size: 0.875rem;
      line-height: 1.25rem;
    }
  }

  :global(.type-note-icon) {
    margin-top: 1px;
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
  }
</style>
