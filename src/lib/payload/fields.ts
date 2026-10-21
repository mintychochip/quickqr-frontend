import type { Field, QrType, Values } from './types';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function clean(field: Field, raw: string): string {
  switch (field.control) {
    case 'text':
      return raw.trim();
    case 'select':
      return field.options.some((option) => option.value === raw) ? raw : field.options[0].value;
    case 'checkbox':
      return raw === 'true' ? 'true' : '';
    case 'date':
      return DATE.test(raw) ? raw : '';
    case 'datetime':
      return DATETIME.test(raw) ? raw : '';
  }
}

/** Every field cleaned on its own, before any is hidden. A condition is judged on these, so a default counts. */
function cleaned(type: QrType, given: Values): Values {
  return Object.fromEntries(type.fields.map((field) => [field.key, clean(field, given[field.key] ?? '')]));
}

/** The fields that show for what is typed so far, in order. */
export function visibleFields(type: QrType, given: Values): readonly Field[] {
  const values = cleaned(type, given);
  return type.fields.filter((field) => !field.when || field.when(values));
}

/** What `build` is promised (see types.ts): an entry for every field, cleaned, and '' for those not showing. */
export function cleanValues(type: QrType, given: Values): Values {
  const values = cleaned(type, given);
  return Object.fromEntries(type.fields.map((field) => [field.key, field.when && !field.when(values) ? '' : values[field.key]!]));
}
