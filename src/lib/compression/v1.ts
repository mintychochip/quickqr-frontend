/**
 * Compression format v1.
 *
 * v0 spends 5.5 bits per character on paths and queries because its alphabets know nothing about URLs. v1 keeps
 * v0's header and host coding (flags, TLD, known domains, spelled host) and replaces how everything after the
 * host is coded: words that really occur in URLs are one symbol, other characters are priced by the two before
 * them, and random-looking runs (ids, hashes) are packed in the smallest alphabet that holds them.
 *
 * One number, read from the low end. In decoding order:
 *
 *   1. version      unary: a 1 bit then a 0 bit (v0 is a single 0 bit, so the lowest bit tells them apart)
 *   2. body         tokens until `end`; each is a type symbol, then what the type needs
 *   3. port flag    then 16 bits when set
 *   4. TLD          v0 Huffman code
 *   5. www flag, https flag, known-domain flag (then subdomain flag when known)
 *   6. host         known: v0 domain code, then subdomain characters. Spelled: characters. IPv6: `END`, 128 bits.
 *
 * The encoder pushes in the opposite order. The host goes in first, so the body is pushed onto a state that is
 * already wide (see rans.ts), and the host ends when the number has been read down to 1, so it needs no
 * terminator. v1.md in docs/superpowers/specs has the full definition.
 */
import { ID_SETS, LITERALS, START, TYPE, classOf } from './model';
import type { Model } from './model';
import { Reader, pushSymbol, pushUniform } from './rans';
import type { Table } from './rans';
import { parse } from './tokenize';
import type { Costs, Token } from './tokenize';
import { decompressionTables, encodingTables, huffmanDecode, huffmanEncode, ipv6ToNumber, numberToIPv6, numberToString, stringToNumber } from './v0.js';
import type { CodeTable } from './v0.js';

const { tldEncode, sldEncode, domainEncode, sldList } = encodingTables();
const { tldDecode, sldDecode, domainDecode } = decompressionTables();

/** The part after the host is declined above this length; a code that long cannot be scanned anyway. */
const MAX_BODY = 4000;
/** What the decoder will build before deciding a payload is not a URL. */
const MAX_DECODED_BODY = 8192;
const MAX_TOKENS = 8192;
const MAX_HOST = 253;
const MASK_128 = (1n << 128n) - 1n;

const costCache = new WeakMap<Table, Float64Array>();

function costsOf(table: Table): Float64Array {
  let costs = costCache.get(table);
  if (!costs) {
    costs = Float64Array.from(table.freq, (f) => table.logT - Math.log2(f));
    costCache.set(table, costs);
  }
  return costs;
}

/** Prices for the tokenizer taken from a finished model. */
export function modelCosts(model: Model): Costs {
  return {
    type: (cls, type) => costsOf(model.types[cls]!)[type]!,
    literal: (p2, p1, char) => costsOf(model.literals(p2, p1))[char.charCodeAt(0) - 0x21]!,
    word: (index) => costsOf(model.wordTable)[index]!,
    idSet: (set) => costsOf(model.idSets)[set]!,
  };
}

export type Host = {
  isIPv6: boolean;
  tld: string;
  hasWWW: boolean;
  knownSLD: string;
  subdomain: string;
  /** What is spelled out: the whole name for a spelled host, the IPv6 text for an IPv6 one. */
  spelled: string;
};

/** v0's reading of a hostname, with the `www.` check made after the TLD is cut so `www.com` stays itself. */
export function splitHost(hostname: string): Host | null {
  const isIPv6 = hostname.startsWith('[') && hostname.endsWith(']');
  if (isIPv6) return { isIPv6, tld: '', hasWWW: false, knownSLD: '', subdomain: '', spelled: hostname.slice(1, -1) };

  let rest = hostname;
  let tld = '';
  const dot = rest.lastIndexOf('.');
  if (dot >= 0 && dot < rest.length - 1 && Object.hasOwn(tldEncode, rest.slice(dot + 1))) {
    tld = rest.slice(dot + 1);
    rest = rest.slice(0, dot);
  }
  const hasWWW = rest.startsWith('www.');
  if (hasWWW) rest = rest.slice(4);
  const knownSLD = sldList.find((candidate) => rest.endsWith(candidate)) ?? '';
  const subdomain = knownSLD ? rest.slice(0, rest.length - knownSLD.length) : '';
  const spelled = knownSLD ? subdomain : rest;
  if ([...spelled].some((c) => !Object.hasOwn(domainEncode, c))) return null;
  return { isIPv6, tld, hasWWW, knownSLD, subdomain, spelled };
}

function pushToken(x: bigint, model: Model, token: Token, p2: string, p1: string): bigint {
  const typeRow = model.types[classOf(p1)]!;
  switch (token.kind) {
    case 'lit':
      x = pushSymbol(x, model.literals(p2, p1), token.text.charCodeAt(0) - 0x21);
      return pushSymbol(x, typeRow, TYPE.lit);
    case 'word':
    case 'cap':
      x = pushSymbol(x, model.wordTable, token.index);
      return pushSymbol(x, typeRow, token.kind === 'word' ? TYPE.word : TYPE.cap);
    case 'id': {
      const set = ID_SETS[token.index]!;
      const base = set.length + 1;
      x = pushUniform(x, base, 0);
      for (let i = token.text.length - 1; i >= 0; i--) x = pushUniform(x, base, set.indexOf(token.text[i]!) + 1);
      x = pushSymbol(x, model.idSets, token.index);
      return pushSymbol(x, typeRow, TYPE.id);
    }
  }
}

function pushBody(x: bigint, model: Model, rest: string, costs: Costs, padding: number | undefined): bigint {
  const p1 = rest.length > 0 ? rest[rest.length - 1]! : START;
  x = pushSymbol(x, model.types[classOf(p1)]!, TYPE.end);
  // An empty id run, last before the end. It decodes to nothing and leaves the context as it was, so the end
  // still reads the same type row; the number it makes is a different one.
  if (padding !== undefined) x = pushToken(x, model, { kind: 'id', text: '', index: padding }, rest.length > 1 ? rest[rest.length - 2]! : START, p1);
  const { tokens } = parse(rest, model, costs);
  let end = rest.length;
  for (let k = tokens.length - 1; k >= 0; k--) {
    const token = tokens[k]!;
    const start = end - token.text.length;
    x = pushToken(x, model, token, start > 1 ? rest[start - 2]! : START, start > 0 ? rest[start - 1]! : START);
    end = start;
  }
  return x;
}

/**
 * The part of an address after the host exactly as v1 codes it, or null when v1 cannot. A bare `/` is the same
 * address as no path at all, so it is coded as nothing. Training and encoding share this definition.
 */
export function bodyOf(url: URL): string | null {
  const rest = url.pathname + url.search + url.hash;
  if (rest === '/') return '';
  return rest.length > MAX_BODY || !/^[\x21-\x7e]*$/.test(rest) ? null : rest;
}

/**
 * The v1 payload for a web address, or null when v1 cannot represent it (a host that is not plain DNS, a body
 * that is too long). The caller has already checked that the address is http(s) and carries no credentials.
 *
 * `padding` is the index of an id set. It adds an empty id run of that set to the body: the payload gets a few
 * characters longer, decodes to the same address, and is a different number, so the first character changes. The
 * encoder uses it when the shortest payloads are ones the scanner cannot take (see `compress` in index.ts).
 */
export function compressV1(url: URL, alphabet: readonly string[], model: Model, padding?: number): string | null {
  const host = splitHost(url.hostname.toLowerCase());
  const rest = bodyOf(url);
  if (!host || rest === null) return null;

  let x = 1n;
  if (host.isIPv6) {
    x = (x << 128n) + ipv6ToNumber(host.spelled);
    x = huffmanEncode(x, domainEncode['END']!);
  } else {
    for (let i = host.spelled.length - 1; i >= 0; i--) x = huffmanEncode(x, domainEncode[host.spelled[i]!]!);
    if (host.knownSLD) x = huffmanEncode(x, sldEncode[host.knownSLD]!);
  }
  if (host.knownSLD) x = pushSymbol(x, model.flags.sub, host.subdomain ? 1 : 0);
  x = pushSymbol(x, model.flags.sld, host.knownSLD ? 1 : 0);
  x = pushSymbol(x, model.flags.https, url.protocol === 'https:' ? 1 : 0);
  x = pushSymbol(x, model.flags.www, host.hasWWW ? 1 : 0);
  x = huffmanEncode(x, tldEncode[host.tld] ?? tldEncode['']!);
  if (url.port) x = pushUniform(x, 65536, Number(url.port));
  x = pushSymbol(x, model.flags.port, url.port ? 1 : 0);

  x = pushBody(x, model, rest, modelCosts(model), padding);
  return numberToString((x << 2n) | 1n, alphabet);
}

function popHuffman(r: Reader, lookup: CodeTable): string {
  try {
    const { newNumber, digit } = huffmanDecode(r.x, lookup);
    r.x = newNumber;
    return digit;
  } catch (e) {
    throw new RangeError(typeof e === 'string' ? e : 'invalid prefix code');
  }
}

function popBody(r: Reader, model: Model): string {
  let out = '';
  let p1 = START;
  let p2 = START;
  for (let count = 0; count <= MAX_TOKENS; count++) {
    const type = r.symbol(model.types[classOf(p1)]!);
    if (type === TYPE.end) return out;
    let text: string;
    if (type === TYPE.lit) {
      text = LITERALS[r.symbol(model.literals(p2, p1))]!;
    } else if (type === TYPE.word) {
      text = model.words[r.symbol(model.wordTable)]!;
    } else if (type === TYPE.cap) {
      const word = model.words[r.symbol(model.wordTable)]!;
      text = word[0]!.toUpperCase() + word.slice(1);
    } else {
      const set = ID_SETS[r.symbol(model.idSets)]!;
      text = '';
      for (let digit = r.uniform(set.length + 1); digit !== 0; digit = r.uniform(set.length + 1)) {
        text += set[digit - 1]!;
        if (text.length > MAX_DECODED_BODY) throw new RangeError('id too long');
      }
    }
    out += text;
    if (out.length > MAX_DECODED_BODY) throw new RangeError('body too long');
    if (text) {
      p1 = out[out.length - 1]!;
      p2 = out.length > 1 ? out[out.length - 2]! : START;
    }
  }
  throw new RangeError('too many tokens');
}

function popHostCharacters(r: Reader): string {
  let name = '';
  while (r.x > 1n) {
    const symbol = popHuffman(r, domainDecode);
    if (symbol === 'END') throw new RangeError('unexpected end of host');
    name += symbol;
    if (name.length > MAX_HOST) throw new RangeError('host too long');
  }
  return name;
}

export function decompressV1(input: string, alphabet: readonly string[], model: Model): string {
  let number: bigint;
  try {
    number = stringToNumber(input, alphabet);
  } catch (e) {
    throw new RangeError(typeof e === 'string' ? e : 'invalid payload');
  }
  if ((number & 3n) !== 1n) throw new RangeError('not a v1 payload');
  const r = new Reader(number >> 2n);

  const rest = popBody(r, model);

  const port = r.symbol(model.flags.port) === 1 ? r.uniform(65536) : null;
  const tld = popHuffman(r, tldDecode);
  const hasWWW = r.symbol(model.flags.www) === 1;
  const isHTTPS = r.symbol(model.flags.https) === 1;
  const known = r.symbol(model.flags.sld) === 1;
  const hasSubdomain = known && r.symbol(model.flags.sub) === 1;

  let name: string;
  if (known) {
    name = popHuffman(r, sldDecode);
    if (hasSubdomain) name = popHostCharacters(r) + name;
  } else {
    const first = popHuffman(r, domainDecode);
    if (first === 'END') {
      name = `[${numberToIPv6(r.x & MASK_128)}]`;
      r.x >>= 128n;
    } else {
      name = first + popHostCharacters(r);
    }
  }
  if (r.x !== 1n) throw new RangeError('unexpected data after the host');

  return `${isHTTPS ? 'https' : 'http'}://${hasWWW ? 'www.' : ''}${name}${tld ? `.${tld}` : ''}${port === null ? '' : `:${port}`}${rest}`;
}
