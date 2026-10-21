/**
 * Test support: a small, valid model with flat probabilities. It exercises every token kind and every header
 * field without depending on the trained tables, so codec logic can be tested separately from model quality.
 */
import { CLASS_COUNT, Model } from './model';
import type { TableData } from './model';

const WORDS = ['menu', 'cafe', 'the', 'and', 'shop', 'blog', 'news', 'index', 'html', 'page', 'user', 'search', 'events', 'about', 'products', 'docs', 'api'];

export function syntheticData(): TableData {
  return {
    logT: { type: 12, lit: 14, word: 12, id: 8, flag: 4 },
    types: Array.from({ length: CLASS_COUNT }, () => [1800, 1200, 400, 300, 396]),
    idSets: [64, 64, 64, 32, 16, 16],
    flags: { port: [12, 4], www: [8, 8], https: [4, 12], sld: [8, 8], sub: [12, 4] },
    words: WORDS.join(' '),
    wordRuns: [[10, WORDS.length]],
    lit0: '',
    lit1: {},
    lit2: {},
  };
}

export function syntheticModel(): Model {
  return new Model(syntheticData());
}

/**
 * A fingerprint of every probability row the model derives from its tables: FNV-1a over the rows as 32-bit
 * little-endian words, in a fixed order. The Go decoder computes the same thing, so both must derive the same
 * integers from `v1.json` or the digest test in one of them fails.
 *
 * Order: the type rows by class; the id sets; the flags port, www, https, sld, sub; the word table; then the
 * literal rows, order-0 first, then every order-1 context and every order-2 context in ascending key order.
 */
export function digest(model: Model, data: TableData): number {
  let h = 2166136261;
  const feed = (n: number) => {
    for (let shift = 0; shift < 32; shift += 8) {
      h ^= (n >>> shift) & 0xff;
      h = Math.imul(h, 16777619) >>> 0;
    }
  };
  const feedAll = (xs: readonly number[]) => xs.forEach(feed);
  model.types.forEach((row) => feedAll(row.freq));
  feedAll(model.idSets.freq);
  for (const name of ['port', 'www', 'https', 'sld', 'sub'] as const) feedAll(model.flags[name].freq);
  feedAll(model.wordTable.freq);
  // \u0001 and \u0002 never occur in a context key, so these reach the order-0 and order-1 rows themselves.
  feedAll(model.literals('\u0001', '\u0002').freq);
  for (const key of Object.keys(data.lit1).sort()) feedAll(model.literals('\u0001', key).freq);
  for (const key of Object.keys(data.lit2).sort()) feedAll(model.literals(key[0]!, key[1]!).freq);
  return h;
}
