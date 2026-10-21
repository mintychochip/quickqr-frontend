/** Helpers for writing payloads: query strings, vCard and iCalendar text, and how big a payload is. */

/**
 * `?a=1&b=2` from the pairs that have a value, each value percent-encoded. Empty when no pair has one. Half of a
 * surrogate pair (a cut-off emoji) cannot be encoded, so it becomes the replacement character instead of an error.
 */
export function query(pairs: ReadonlyArray<readonly [key: string, value: string]>): string {
  const parts = pairs.filter(([, value]) => value !== '').map(([key, value]) => `${key}=${encodeURIComponent(value.toWellFormed())}`);
  return parts.length === 0 ? '' : `?${parts.join('&')}`;
}

/**
 * Text as a vCard or iCalendar value: backslash, semicolon and comma are separators there, so each gets a
 * backslash, and a line break becomes the two characters `\n`.
 */
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Bytes a payload takes in a QR code, which stores UTF-8. */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
