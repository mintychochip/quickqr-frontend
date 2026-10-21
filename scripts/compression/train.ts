/**
 * Trains the v1 probability tables.
 *
 *   bun scripts/compression/train.ts <urls.txt> --out <tables.json> [--holdout]
 *
 * The URLs are one per line. The shipped src/lib/compression/v1.json was trained on the ada-url/url-dataset `out.txt`
 * (100,025 URLs, https://github.com/ada-url/url-dataset, sha256
 * b11a9be08fc3065413e60b1bcddcb2b50ee0eb4923158d1a1a9e251cf89970d3) with the defaults below. With `--holdout`
 * only the training hosts are used, so `evaluate.ts` can measure on hosts the model never saw.
 *
 * THE SHIPPED FILE IS A FORMAT. Printed codes only decode with the exact tables they were made with, so
 * src/lib/compression/v1.json must never change (a test pins its hash). Experiments write elsewhere, which is why
 * `--out` has no default. A better model is a v2: new tables, a new version number, and v1 keeps decoding with
 * its own file.
 *
 * How it works: every URL body is cut into tokens by the same shortest-path search the encoder uses, priced by
 * the model so far. The tokens are counted, the counts become the next model (quantised exactly as they will be
 * shipped, so training optimises the real thing), and the cycle repeats.
 */
import { writeFile } from 'node:fs/promises';
import { CLASS_COUNT, ID_SETS, Model, START, TYPE, TYPE_COUNT, classOf, countIndex, packSparse } from '../../src/lib/compression/model';
import type { FlagName, TableData } from '../../src/lib/compression/model';
import { normalize } from '../../src/lib/compression/rans';
import { parse } from '../../src/lib/compression/tokenize';
import { modelCosts, splitHost } from '../../src/lib/compression/v1';
import { loadSamples } from './data';
import type { Sample } from './data';

export type Options = {
  /** log2 of the slot total of each family of tables; more slots resolve smaller probabilities. */
  logT: TableData['logT'];
  dictionarySize: number;
  /** A word must appear on this many different hosts, so no single site writes the dictionary. */
  minHostsPerWord: number;
  iterations: number;
  /** Words the parse uses fewer times than this are dropped; they would only cost table space. */
  pruneBelow: number;
  order1MinCount: number;
  order2MinCount: number;
};

export const DEFAULTS: Options = {
  logT: { type: 12, lit: 14, word: 16, id: 8, flag: 8 },
  dictionarySize: 8192,
  minHostsPerWord: 2,
  iterations: 4,
  pruneBelow: 2,
  order1MinCount: 5,
  order2MinCount: 20,
};

/**
 * Header flags the corpus cannot speak for. Crawled pages are nearly all https on port 443; the addresses people
 * print are a little less tidy (a LAN device, a dev server), so these are set by hand: ports are rare but real.
 */
const PORT_PRIOR: readonly [number, number] = [31, 1];
const HTTPS_PRIOR: readonly [number, number] = [7, 93];

type Tally = {
  types: number[][];
  words: number[];
  ids: number[];
  lit0: Map<string, number>;
  lit1: Map<string, Map<string, number>>;
  lit2: Map<string, Map<string, number>>;
  bits: number;
};

function bump(map: Map<string, Map<string, number>>, key: string, char: string) {
  let row = map.get(key);
  if (!row) map.set(key, (row = new Map()));
  row.set(char, (row.get(char) ?? 0) + 1);
}

function tally(bodies: readonly string[], model: Model): Tally {
  const costs = modelCosts(model);
  const t: Tally = {
    types: Array.from({ length: CLASS_COUNT }, () => new Array<number>(TYPE_COUNT).fill(0)),
    words: new Array<number>(model.words.length).fill(0),
    ids: new Array<number>(ID_SETS.length).fill(0),
    lit0: new Map(),
    lit1: new Map(),
    lit2: new Map(),
    bits: 0,
  };
  for (const body of bodies) {
    const { tokens, bits } = parse(body, model, costs);
    t.bits += bits;
    let at = 0;
    for (const token of tokens) {
      const p1 = at > 0 ? body[at - 1]! : START;
      const p2 = at > 1 ? body[at - 2]! : START;
      t.types[classOf(p1)]![TYPE[token.kind]]!++;
      if (token.kind === 'lit') {
        t.lit0.set(token.text, (t.lit0.get(token.text) ?? 0) + 1);
        bump(t.lit1, p1, token.text);
        bump(t.lit2, p2 + p1, token.text);
      } else if (token.kind === 'id') {
        t.ids[token.index]!++;
      } else {
        t.words[token.index]!++;
      }
      at += token.text.length;
    }
    t.types[classOf(at > 0 ? body[at - 1]! : START)]![TYPE.end]!++;
  }
  return t;
}

const total = (row: ReadonlyMap<string, number>) => [...row.values()].reduce((a, b) => a + b, 0);
const byChar = (a: readonly [string, number], b: readonly [string, number]) => (a[0] < b[0] ? -1 : 1);

function sparseRows(rows: ReadonlyMap<string, ReadonlyMap<string, number>>, minCount: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of [...rows.keys()].sort()) {
    const row = rows.get(key)!;
    if (total(row) >= minCount) out[key] = packSparse([...row].sort(byChar));
  }
  return out;
}

/** Counts become tables. Adding half a count to everything keeps unseen events possible without a model of them. */
function buildData(t: Tally, dictionary: readonly string[], flags: Record<FlagName, readonly [number, number]>, prune: number, o: Options): TableData {
  const ranked = dictionary
    .map((word, i) => ({ word, i, n: t.words[i]! }))
    .filter((w) => w.n >= prune)
    .map((w) => ({ ...w, step: countIndex(Math.max(1, w.n)) }))
    .sort((a, b) => b.step - a.step || a.i - b.i);
  const wordRuns: number[][] = [];
  for (const w of ranked) {
    const last = wordRuns.at(-1);
    if (last && last[0] === w.step) last[1]!++;
    else wordRuns.push([w.step, 1]);
  }
  const half = (counts: readonly number[]) => counts.map((n) => 2 * n + 1);
  return {
    logT: { ...o.logT },
    types: t.types.map((row) => normalize(half(row), o.logT.type)),
    idSets: normalize(half(t.ids), o.logT.id),
    flags: Object.fromEntries(Object.entries(flags).map(([name, pair]) => [name, normalize(pair, o.logT.flag)])) as Record<FlagName, number[]>,
    words: ranked.map((w) => w.word).join(' '),
    wordRuns,
    lit0: packSparse([...t.lit0].sort(byChar)),
    lit1: sparseRows(t.lit1, o.order1MinCount),
    lit2: sparseRows(t.lit2, o.order2MinCount),
  };
}

/** One host can vouch for a word this many times. Without it, a site that embeds another site's pages wins slots by volume. */
const USES_PER_HOST = 3;

function pickDictionary(samples: readonly Sample[], o: Options): string[] {
  const perHost = new Map<string, Map<string, number>>();
  for (const s of samples) {
    // `%2Fwww` is an escape followed by a word (and `%252Fwww` the same, encoded twice); without this the hex
    // digit would glue itself to the letters.
    for (const m of s.body.replace(/%(?:25)*[0-9A-Fa-f]{2}/g, ' ').matchAll(/[A-Za-z]+/g)) {
      const text = m[0];
      const word = /^[a-z]{3,24}$/.test(text) ? text : /^[A-Z][a-z]{2,23}$/.test(text) ? text.toLowerCase() : null;
      if (!word) continue;
      const hosts = perHost.get(word) ?? new Map<string, number>();
      hosts.set(s.host, (hosts.get(s.host) ?? 0) + 1);
      perHost.set(word, hosts);
    }
  }
  // A word saves roughly what its letters would have cost as literals, less what it costs to name it.
  return [...perHost]
    .filter(([, hosts]) => hosts.size >= o.minHostsPerWord)
    .map(([word, hosts]) => {
      const uses = [...hosts.values()].reduce((sum, n) => sum + Math.min(n, USES_PER_HOST), 0);
      return [word, uses * (4.4 * word.length - 11)] as const;
    })
    .filter(([, saving]) => saving > 0)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, o.dictionarySize)
    .map(([word]) => word);
}

function headerFlags(samples: readonly Sample[]): Record<FlagName, readonly [number, number]> {
  const www = [0, 0];
  const sld = [0, 0];
  const sub = [0, 0];
  for (const s of samples) {
    const host = splitHost(new URL(s.url).hostname.toLowerCase())!;
    www[host.hasWWW ? 1 : 0]!++;
    sld[host.knownSLD ? 1 : 0]!++;
    if (host.knownSLD) sub[host.subdomain ? 1 : 0]!++;
  }
  return { port: PORT_PRIOR, https: HTTPS_PRIOR, www: [www[0]!, www[1]!], sld: [sld[0]!, sld[1]!], sub: [sub[0]!, sub[1]!] };
}

/** A model that knows nothing except the dictionary: the starting point of the first iteration. */
function untrained(words: readonly string[], o: Options): TableData {
  return {
    logT: { ...o.logT },
    types: Array.from({ length: CLASS_COUNT }, () => normalize([4, 3, 1, 1, 1], o.logT.type)),
    idSets: normalize([1, 1, 1, 1, 1, 1], o.logT.id),
    flags: {
      port: normalize(PORT_PRIOR, o.logT.flag),
      https: normalize(HTTPS_PRIOR, o.logT.flag),
      www: normalize([1, 1], o.logT.flag),
      sld: normalize([1, 1], o.logT.flag),
      sub: normalize([1, 1], o.logT.flag),
    },
    words: words.join(' '),
    wordRuns: [[10, words.length]],
    lit0: '',
    lit1: {},
    lit2: {},
  };
}

export function train(samples: readonly Sample[], o: Options = DEFAULTS, log: (line: string) => void = () => {}): TableData {
  const dictionary = pickDictionary(samples, o);
  log(`dictionary: ${dictionary.length} candidate words`);
  const flags = headerFlags(samples);
  const bodies = samples.map((s) => s.body);

  let data = untrained(dictionary, o);
  let model = new Model(data);
  for (let i = 1; i <= o.iterations; i++) {
    const t = tally(bodies, model);
    data = buildData(t, model.words, flags, i === 1 ? 0 : o.pruneBelow, o);
    model = new Model(data);
    log(`iteration ${i}: ${(t.bits / bodies.length).toFixed(1)} bits per body under the previous model, ${model.words.length} words`);
  }
  return data;
}

/** One row per line so a retrain produces a diff a person can read. */
export function serialise(data: TableData): string {
  const rows = (record: Readonly<Record<string, string>>) =>
    `{\n${Object.entries(record)
      .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
      .join(',\n')}\n}`;
  return [
    '{',
    `"logT": ${JSON.stringify(data.logT)},`,
    `"types": ${JSON.stringify(data.types)},`,
    `"idSets": ${JSON.stringify(data.idSets)},`,
    `"flags": ${JSON.stringify(data.flags)},`,
    `"wordRuns": ${JSON.stringify(data.wordRuns)},`,
    `"words": ${JSON.stringify(data.words)},`,
    `"lit0": ${JSON.stringify(data.lit0)},`,
    `"lit1": ${rows(data.lit1)},`,
    `"lit2": ${rows(data.lit2)}`,
    '}',
    '',
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const outAt = args.indexOf('--out');
  // No default: the shipped src/lib/compression/v1.json is frozen and a bare run must not be able to overwrite it.
  const out = outAt >= 0 ? args[outAt + 1] : undefined;
  const file = args.find((a, i) => !a.startsWith('--') && (outAt < 0 || i !== outAt + 1));
  if (!file || !out) throw new Error('usage: bun scripts/compression/train.ts <urls.txt> --out <tables.json> [--holdout]');
  const holdout = args.includes('--holdout');

  const all = await loadSamples(file);
  const samples = holdout ? all.filter((s) => s.split === 'train') : all;
  console.log(`${samples.length} urls from ${new Set(samples.map((s) => s.host)).size} hosts${holdout ? ' (held-out hosts excluded)' : ''}`);
  const data = train(samples, DEFAULTS, console.log);
  const text = serialise(data);
  await writeFile(out, text);
  console.log(`wrote ${out} (${text.length} bytes): ${new Model(data).words.length} words, ${Object.keys(data.lit1).length} order-1 rows, ${Object.keys(data.lit2).length} order-2 rows`);
}

if (import.meta.main) await main();
