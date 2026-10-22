// Same alphabet as the Go server: no 0/O or 1/l/i, so a code read off a printed card is not ambiguous.
const CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

/** A cryptographically random code of `length` characters, uniform over the alphabet (rejection sampling, no modulo bias). */
export function randomCode(length: number): string {
  if (!Number.isInteger(length) || length <= 0) throw new RangeError(`invalid random code length ${length}`);
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let out = '';
  while (out.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte >= limit) continue;
      out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (out.length === length) break;
    }
  }
  return out;
}

const hex = (bytes: ArrayBuffer): string => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256Hex(text: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

const hmacKeys = new Map<string, Promise<CryptoKey>>();

/** HMAC-SHA256 of `message` under `key`, as hex. The imported key is cached per isolate. */
export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  let imported = hmacKeys.get(key);
  if (!imported) {
    imported = crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    hmacKeys.set(key, imported);
  }
  return hex(await crypto.subtle.sign('HMAC', await imported, new TextEncoder().encode(message)));
}
