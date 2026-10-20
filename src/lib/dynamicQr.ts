import { outputAlphabetQR } from './alphabets';
import { compress, decompress } from './compress';

const compressedAlphabet = /^[$*+./:0-9A-Z-]+$/;

/**
 * Canonical dynamic short link. The code stays the editable redirect.
 */
export function dynamicShortLink(origin: string, code: string): string {
  const base = new URL(origin);
  const protocol = base.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${base.host}/r/${code}`;
}

/**
 * QR payload: ha.mr compression of the short link, on this host.
 * Scanning it still opens /r/:code. The scheme and host are uppercase so the
 * wrapper stays in QR alphanumeric mode, matching ha.mr.
 */
export function dynamicQrValue(origin: string, code: string): string {
  const short = dynamicShortLink(origin, code);
  const payload = compress(short, outputAlphabetQR);
  const base = new URL(origin);
  const scheme = base.protocol === 'https:' ? 'HTTPS' : 'HTTP';
  return `${scheme}://${base.host.toUpperCase()}/${payload}`;
}

/**
 * Recover the dynamic code from a plain /r/:code URL or from a compressed payload.
 * Returns the lowercase code, or null when the text is not one of ours.
 */
export function dynamicCodeFromQrPayload(payload: string): string | null {
  const trimmed = payload.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed, 'http://scan.local');
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const direct = url.pathname.match(/^\/r\/([A-Za-z0-9_-]+)\/?$/i);
  if (direct?.[1]) return direct[1].toLowerCase();

  let compressed = url.pathname.replace(/^\/+/, '');
  if (!compressed || compressed.toLowerCase().startsWith('r/')) return null;
  try {
    compressed = decodeURIComponent(compressed);
  } catch {
    return null;
  }
  if (!compressedAlphabet.test(compressed)) return null;

  try {
    const decoded = decompress(compressed, outputAlphabetQR);
    const inner = new URL(decoded);
    const match = inner.pathname.match(/^\/r\/([A-Za-z0-9_-]+)\/?$/i);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

/**
 * Static codes carry the destination itself. Decode a payload served from this
 * origin so static QRs can resolve without a third-party decoder host.
 */
export function staticDestinationFromQrPayload(payload: string): string | null {
  const trimmed = payload.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed, 'http://scan.local');
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  let compressed = url.pathname.replace(/^\/+/, '');
  if (!compressed || compressed.toLowerCase().startsWith('r/')) return null;
  try {
    compressed = decodeURIComponent(compressed);
  } catch {
    return null;
  }
  if (!compressedAlphabet.test(compressed)) return null;

  try {
    const destination = new URL(decompress(compressed, outputAlphabetQR));
    if (destination.protocol !== 'http:' && destination.protocol !== 'https:') return null;
    return destination.toString();
  } catch {
    return null;
  }
}
