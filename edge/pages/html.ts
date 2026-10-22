/** Go's html.EscapeString: the five characters that matter in text and in quoted attributes. */
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&#34;', "'": '&#39;' })[c] ?? c);

/**
 * JSON that is safe to put inside an inline <script>: `<`, `>` and `&` are written as escapes so a value can never
 * contain `</script>` or `<!--`, and U+2028/U+2029 (line terminators in older JavaScript) are escaped too. This is what
 * Go's json.Marshal does by default and JSON.stringify does not.
 */
export function inlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}
