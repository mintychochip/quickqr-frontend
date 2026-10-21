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
  <div class="space-y-3 pt-2" data-testid="type-fields">
    {#if fields.length > 0}
      <div class="grid gap-x-3 gap-y-3 sm:grid-cols-2">
        {#each fields as field (field.key)}
          {@const fieldId = `${id}-${field.key}`}
          {#if field.control === 'checkbox'}
            <div class="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id={fieldId}
                checked={values[field.key] === 'true'}
                onCheckedChange={(checked) => onChange(field.key, checked ? 'true' : '')}
              />
              <Label for={fieldId} class="cursor-pointer font-normal">{field.label}</Label>
            </div>
          {:else}
            <div class="min-w-0 space-y-1.5">
              <Label for={fieldId}>{field.label}</Label>
              {#if field.control === 'select'}
                <NativeSelect
                  id={fieldId}
                  class="w-full"
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
                  class="text-base md:text-sm"
                />
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
    {#if type.note}
      <p data-testid="type-note" class="flex items-start gap-2 text-xs text-muted-foreground">
        <Info class="mt-px size-3.5 shrink-0" aria-hidden="true" />
        <span>{type.note}</span>
      </p>
    {/if}
  </div>
{/if}
