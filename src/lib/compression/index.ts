/**
 * QR payload compression: the public face of the v0 and v1 formats.
 *
 * `compress` returns the shortest payload that decodes back to the address it was given. `decompress` reads
 * every format that has ever been printed.
 */
import tables from './v1.json' with { type: 'json' };
import { ID_SETS, Model } from './model';
import { compress as compressV0, decompress as decompressV0, stringToNumber } from './v0.js';
import { compressV1, decompressV1 } from './v1';

/** The most alphanumeric characters a QR code can carry. Nothing longer was ever printed, and reading it is quadratic work. */
const MAX_PAYLOAD = 4296;

let shipped: Model | undefined;
const model = () => (shipped ??= new Model(tables));

/** What a browser treats as the address: v1 drops an empty `?` or `#`, which carry nothing. */
function sameAddress(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.host === b.host && a.pathname === b.pathname && a.search === b.search && a.hash === b.hash;
}

/**
 * Whether a payload reaches the app unchanged when it is printed after the host, as `HTTPS://HOST/<payload>`.
 * Three shapes do not, and about 1 payload in 20 has one:
 * - `R/` at the start: the scanner reads that path as a plain `/r/<code>` short link, never as a payload.
 * - `//` anywhere, which a leading `/` makes too: routers collapse it (Go's mux answers 301 to the cleaned path)
 *   and the payload loses a character.
 * - a `.` or `..` segment (`A/.`, `./A`): the browser resolves it before the app sees the path.
 */
export function printable(payload: string): boolean {
  const path = `/${payload}`;
  return !payload.startsWith('R/') && !path.includes('//') && path.split('/').every((segment) => segment !== '.' && segment !== '..');
}

function reads(payload: string, alphabet: string[], address: URL, using: Model): boolean {
  try {
    return sameAddress(new URL(decompress(payload, alphabet, using)), address);
  } catch {
    return false;
  }
}

/**
 * The shortest payload for a web address. A payload is only used if it decodes back to the same address:
 * v0 lowercases percent escapes and turns `?b` into `?b=`, and a code that has been printed cannot be fixed.
 * A payload that would arrive changed once printed is not used either (see `printable`); v1 is padded to get another, so an
 * address that can be coded always gets a payload. Throws when the address is not plain http(s), carries
 * credentials, or neither format can spell its host.
 *
 * `using` is the v1 model; it is the shipped one unless a caller is measuring another (scripts/compression).
 */
export function compress(input: string, alphabet: string[], using: Model = model()): string {
  const address = new URL(input);
  if (address.protocol !== 'https:' && address.protocol !== 'http:') throw new TypeError('Only http and https addresses can be compressed.');
  if (address.username || address.password) throw new TypeError('Addresses with a username or password cannot be compressed.');

  const candidates: string[] = [];
  try {
    candidates.push(compressV0(input, alphabet));
  } catch {
    // v0 cannot spell this host; v1 cannot either, and the check below reports it.
  }
  const v1 = compressV1(address, alphabet, using);
  if (v1 !== null) candidates.push(v1);

  const usable = (payload: string) => printable(payload) && reads(payload, alphabet, address, using);

  // v1 is the short one. When it cannot be printed, an empty id run of any set makes another payload for the
  // same address, a few characters longer, and it competes with v0 below.
  if (v1 !== null && !usable(v1)) {
    for (let set = 0; set < ID_SETS.length; set++) {
      const padded = compressV1(address, alphabet, using, set);
      if (padded !== null) candidates.push(padded);
    }
  }

  let best: string | undefined;
  for (const payload of candidates) {
    if ((best === undefined || payload.length < best.length) && usable(payload)) best = payload;
  }
  if (best === undefined) throw new RangeError('This address cannot be compressed.');
  return best;
}

/** Decodes a payload of any format. Throws when it is not one. `using` is as for `compress`. */
export function decompress(input: string, alphabet: string[], using: Model = model()): string {
  if (input === '' || input.length > MAX_PAYLOAD) throw new RangeError('Not a compressed address.');
  let number: bigint;
  try {
    number = stringToNumber(input, alphabet);
  } catch (e) {
    throw new RangeError(typeof e === 'string' ? e : 'Not a compressed address.');
  }
  if ((number & 1n) === 1n) return decompressV1(input, alphabet, using);
  try {
    return decompressV0(input, alphabet);
  } catch (e) {
    throw new RangeError(typeof e === 'string' ? e : 'Not a compressed address.');
  }
}
