import type { Fetch } from '../http';
import { clipBytes } from '../text';

const MAX_BODY = 256 << 10;
const MAX_NOTE = 4000;
const MAX_VISIBLE = 700;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 2;

/** Why a site could not be read. The message is shown to whoever asked. */
export class ContextError extends Error {}

/** IPv4 special-use blocks that are not private, loopback or link-local but are still not the public internet: [network, prefix length]. */
const NON_PUBLIC_V4: [string, number][] = [
  ['0.0.0.0', 8], ['100.64.0.0', 10], ['192.0.0.0', 24], ['192.0.2.0', 24], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['240.0.0.0', 4],
];

const v4Number = (text: string): number => text.split('.').reduce((n, part) => n * 256 + Number(part), 0);

function inV4(address: number, [network, bits]: [string, number]): boolean {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return ((address & mask) >>> 0) === ((v4Number(network) & mask) >>> 0);
}

function isPublicV4(text: string): boolean {
  const address = v4Number(text);
  const blocked: [string, number][] = [['127.0.0.0', 8], ['10.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16], ['169.254.0.0', 16], ['224.0.0.0', 4], ['255.255.255.255', 32], ...NON_PUBLIC_V4];
  return !blocked.some((block) => inV4(address, block));
}

/** Eight 16-bit groups of an IPv6 address as the URL parser writes it (`::1`, `2001:db8::1`, `::ffff:7f00:1`). */
function groupsV6(text: string): number[] | null {
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const parse = (part: string): number[] | null => {
    if (part === '') return [];
    const groups = part.split(':').map((g) => (/^[0-9a-f]{1,4}$/i.test(g) ? parseInt(g, 16) : NaN));
    return groups.some(Number.isNaN) ? null : groups;
  };
  const head = parse(halves[0] ?? '');
  const tail = halves.length === 2 ? parse(halves[1] ?? '') : [];
  if (!head || !tail) return null;
  if (halves.length === 1) return head.length === 8 ? head : null;
  const fill = 8 - head.length - tail.length;
  return fill < 1 ? null : [...head, ...new Array<number>(fill).fill(0), ...tail];
}

function isPublicV6(text: string): boolean {
  const g = groupsV6(text);
  if (!g) return false;
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return isPublicV4(`${(g[6] ?? 0) >> 8}.${(g[6] ?? 0) & 255}.${(g[7] ?? 0) >> 8}.${(g[7] ?? 0) & 255}`);
  if (g.every((x) => x === 0) || (g.slice(0, 7).every((x) => x === 0) && g[7] === 1)) return false; // unspecified, loopback
  const first = g[0] ?? 0;
  if ((first & 0xfe00) === 0xfc00) return false; // unique local
  if ((first & 0xffc0) === 0xfe80) return false; // link-local
  if ((first & 0xff00) === 0xff00) return false; // multicast
  if (first === 0x64 && g[1] === 0xff9b) return false; // 64:ff9b::/96 and 64:ff9b:1::/48
  if (first === 0x100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return false; // 100::/64
  if (first === 0x2001 && ((g[1] ?? 0) & 0xfe00) === 0) return false; // 2001::/23
  if (first === 0x2001 && g[1] === 0xdb8) return false; // documentation
  if (first === 0x2002) return false; // 6to4
  return true;
}

/** A parsed site address, or ContextError: only http(s), never a local name, never an address that is not on the public internet. */
export function publicSiteUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ContextError('Give a public http(s) site');
  }
  if (url.hostname === '' || (url.protocol !== 'http:' && url.protocol !== 'https:')) throw new ContextError('Give a public http(s) site');
  const host = url.hostname.toLowerCase();
  const notPublic = new ContextError('That address is not a public site');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw notPublic;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && !isPublicV4(host)) throw notPublic;
  if (host.startsWith('[') && !isPublicV6(host.slice(1, -1))) throw notPublic;
  return url;
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', middot: '·', bull: '•', euro: '€', pound: '£', yen: '¥', cent: '¢',
  times: '×', deg: '°', eacute: 'é', egrave: 'è', agrave: 'à', aacute: 'á', uuml: 'ü', ouml: 'ö', auml: 'ä', ntilde: 'ñ', ccedil: 'ç',
};

/** The common HTML entities (named and numeric). A name outside the list is left as written. */
function unescapeHtml(text: string): string {
  return text.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body.startsWith('#')) {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '\ufffd';
    }
    return ENTITIES[body] ?? whole;
  });
}

const cleanSiteText = (value: string): string => unescapeHtml(value).split(/\s+/).filter(Boolean).join(' ');

function metaContent(raw: string, key: string): string {
  for (const tag of (raw.match(/<meta\s+[^>]*>/gis) ?? []).slice(0, 40)) {
    const lower = tag.toLowerCase();
    if (!lower.includes(`"${key}"`) && !lower.includes(`'${key}'`)) continue;
    const content = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
    if (content) return cleanSiteText(content[1] || content[2] || '');
  }
  return '';
}

/** A short note about a page for the style agent: its title and description, its theme colors, and the start of its text. */
export function extractSiteContext(host: string, raw: string): { name: string; text: string } {
  const title = cleanSiteText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw)?.[1] ?? '');
  const description = metaContent(raw, 'description') || metaContent(raw, 'og:description');
  let theme = metaContent(raw, 'theme-color');
  if (!/#[0-9a-f]{6}\b/i.test(theme)) theme = '';
  const background = /background(?:-color)?\s*:\s*(#[0-9a-f]{6})/i.exec(raw)?.[1]?.toLowerCase() ?? '';

  let note = `Site ${host}\n`;
  if (title) note += `Title: ${title}\n`;
  if (description) note += `${description}\n`;
  if (theme) note += `theme-color: ${theme.toLowerCase()}\n`;
  if (background) note += `background: ${background}\n`;
  const visible = clipBytes(cleanSiteText(raw.replace(/<[^>]+>/g, ' ')), MAX_VISIBLE);
  if (visible) note += visible;

  // The note always starts with the host, so it is never empty.
  return { name: title || host, text: clipBytes(note.trim(), MAX_NOTE) };
}

/** Reads at most MAX_BODY bytes of a response body. */
async function readCapped(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BODY) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => undefined);
  const bytes = new Uint8Array(Math.min(total, MAX_BODY));
  let at = 0;
  for (const chunk of chunks) {
    const piece = chunk.subarray(0, bytes.length - at);
    bytes.set(piece, at);
    at += piece.length;
    if (at >= bytes.length) break;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Reads a public site into a short note. Redirects are followed by hand, at most twice, and every address along the way
 * is held to the same rule as the first, so a public page cannot bounce this server toward an internal one.
 */
export async function fetchPublicSiteContext(fetchFn: Fetch, raw: string): Promise<{ name: string; text: string }> {
  let page = publicSiteUrl(raw);
  const host = page.hostname;
  let res: Response;
  for (let redirects = 0; ; redirects++) {
    try {
      res = await fetchFn(page.toString(), {
        redirect: 'manual',
        headers: { 'User-Agent': 'quickqr-context', Accept: 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new ContextError('Could not reach that site');
    }
    const next = res.status >= 300 && res.status < 400 ? res.headers.get('Location') : null;
    if (!next) break;
    await res.body?.cancel().catch(() => undefined);
    if (redirects >= MAX_REDIRECTS) throw new ContextError('That site redirected too many times');
    try {
      page = publicSiteUrl(new URL(next, page).toString());
    } catch (err) {
      throw err instanceof ContextError ? err : new ContextError('Could not read that site');
    }
  }
  if (res.status < 200 || res.status >= 300) throw new ContextError(`That site returned ${res.status}`);
  let body: string;
  try {
    body = await readCapped(res);
  } catch {
    throw new ContextError('Could not read that site');
  }
  return extractSiteContext(host, body);
}
