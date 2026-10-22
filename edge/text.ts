/** The first `max` bytes of the text (as UTF-8), without cutting a character in half. */
export function clipBytes(text: string, max: number): string {
  const encoder = new TextEncoder();
  if (encoder.encode(text).length <= max) return text;
  let out = '';
  let used = 0;
  for (const ch of text) {
    used += encoder.encode(ch).length;
    if (used > max) break;
    out += ch;
  }
  return out;
}
