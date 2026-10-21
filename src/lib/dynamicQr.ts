import { outputAlphabetQR } from './alphabets';
import { compress, decompress } from './compression';

const compressedAlphabet = /^[$*+./:0-9A-Z-]+$/;
const directCodeAlphabet = /^[A-Z0-9-]+$/;

/**
 * Canonical dynamic short link. The code stays the editable redirect.
 */
export function dynamicShortLink(origin: string, code: string): string {
  const base = new URL(origin);
  const protocol = base.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${base.host}/r/${code}`;
}

/**
 * QR payload: the shortest alphanumeric representation of the short link.
 * Short codes use the direct /R/:code form; longer or underscore-bearing codes
 * use the compressed payload. Both still resolve to /r/:code.
 */
export function dynamicQrValue(origin: string, code: string): string {
  const short = dynamicShortLink(origin, code);
  const base = new URL(origin);
  const scheme = base.protocol === 'https:' ? 'HTTPS' : 'HTTP';
  const host = base.host.toUpperCase();
  const upperCode = code.toUpperCase();
  const direct = `${scheme}://${host}/R/${upperCode}`;

  if (directCodeAlphabet.test(upperCode)) {
    const compressed = `${scheme}://${host}/${compress(short, outputAlphabetQR)}`;
    if (direct.length <= compressed.length) return direct;
    return compressed;
  }

  return `${scheme}://${host}/${compress(short, outputAlphabetQR)}`;
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

  // One slash separates the host from the payload; a payload may itself start with `/`.
  let compressed = url.pathname.replace(/^\//, '');
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

  let compressed = url.pathname.replace(/^\//, '');
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
