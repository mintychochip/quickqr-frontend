/**
 * The kinds of code the studio can make. A type says what its bar and extra fields are called and how what was
 * typed becomes the text a QR code carries. Nothing here knows about the page.
 */

export type TypeId =
  | 'link'
  | 'text'
  | 'phone'
  | 'sms'
  | 'email'
  | 'whatsapp'
  | 'location'
  | 'directions'
  | 'event'
  | 'wifi'
  | 'contact'
  | 'social'
  | 'review'
  | 'payment'
  | 'crypto'
  | 'sepa'
  | 'upi';

export type GroupId = 'everyday' | 'places' | 'connect' | 'pay';

/** What was typed in the fields under the bar, by field key. The bar itself is passed to `build` on its own. */
export type Values = Readonly<Record<string, string>>;

/** What was typed under the bar, kept for each type so that switching back finds it and one type's values never reach another. */
export type FieldValues = Partial<Record<TypeId, Values>>;

export type InputMode = 'text' | 'tel' | 'email' | 'url' | 'decimal' | 'numeric';

export type Option = { value: string; label: string };

type FieldBase = {
  /** Key in `Values`. Unique within a type. */
  key: string;
  label: string;
  /** The field is shown, and its value read, only while this returns true. */
  when?: (values: Values) => boolean;
};

export type Field =
  | (FieldBase & { control: 'text'; placeholder?: string; inputMode?: InputMode })
  /** The first option is the default. */
  | (FieldBase & { control: 'select'; options: readonly [Option, ...Option[]] })
  /** Holds 'true' when ticked, '' when not. */
  | (FieldBase & { control: 'checkbox' })
  /** Holds 'YYYY-MM-DD', or '' when empty. */
  | (FieldBase & { control: 'date' })
  /** Holds 'YYYY-MM-DDTHH:mm' (the value of a datetime-local input), or '' when empty. */
  | (FieldBase & { control: 'datetime' });

/** The text the code carries, or what to change so that it can be made. The reason is for the person typing. */
export type Built = { payload: string } | { problem: string };

export type QrType = {
  id: TypeId;
  /** Name in the menu and in the hint under the bar. */
  label: string;
  group: GroupId;
  /** What the bar holds for this type. */
  bar: { label: string; placeholder: string; inputMode?: InputMode };
  /** Fields under the bar, in the order they are shown. */
  fields: readonly Field[];
  /** A short line shown under the fields, for what is costly to get wrong once printed. */
  note?: string;
  /**
   * The text the code carries, or why it cannot be made. Never throws.
   *
   * `bar` is trimmed and not empty. `values` has an entry for every field key, already cleaned up:
   * - text: trimmed, '' when untouched
   * - select: one of the option values, the first when untouched
   * - checkbox: 'true' or ''
   * - date and datetime: '' or a well-formed value, never anything else
   * - a field whose `when` is false: ''
   * Anything beyond that (is the amount a number, is the address an address) is for `build` to check.
   */
  build(bar: string, values: Values): Built;
};
