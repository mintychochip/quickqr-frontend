/**
 * The v1 probability model: what turns the trained numbers in `v1.json` into the tables the coder uses.
 *
 * Everything here is integer arithmetic on purpose. The Go decoder (`backend/internal/compression`) repeats it, and
 * both must land on the same slots for every row, or a payload decodes to something else. The numbers below
 * (count steps, mixing weights, the literal alphabet, the id sets) are part of the format and never change.
 */
import { makeTable, normalize } from './rans';
import type { Table } from './rans';

/** Stands in for the character before the first one. It is not in the literal alphabet, so it cannot collide. */
export const START = ' ';

/** Every character a normalised URL path, query or fragment can contain: printable ASCII except the space. */
export const LITERALS = Array.from({ length: 94 }, (_, i) => String.fromCharCode(0x21 + i)).join('');

/** What the next token is. `end` closes the body. */
export const TYPE = { lit: 0, word: 1, cap: 2, id: 3, end: 4 } as const;
export const TYPE_COUNT = 5;

/** Alphabets for runs of random-looking characters, smallest first. A digit is its index plus one; zero ends the run. */
export const ID_SETS: readonly string[] = [
  '0123456789',
  '0123456789abcdef',
  '0123456789abcdefghijklmnopqrstuvwxyz',
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-',
];

/** Shortest run worth coding as an id; the encoder chooses, the decoder accepts any length. */
export const MIN_ID_LENGTH = 5;

/** The type table is chosen by what the previous character was: start, letter, digit, or one of ten separators. */
export const CLASS_COUNT = 14;
const SEPARATOR_CLASSES = '/?&=#-_.+%';

export function classOf(previous: string): number {
  if (previous === START) return 0;
  if ((previous >= 'a' && previous <= 'z') || (previous >= 'A' && previous <= 'Z')) return 1;
  if (previous >= '0' && previous <= '9') return 2;
  const at = SEPARATOR_CLASSES.indexOf(previous);
  return at < 0 ? 13 : 3 + at;
}

/**
 * Counts in `v1.json` are stored as an index into this ladder: one at a time at first, then a fifth more each
 * step. One character per count, and rows stay small.
 */
export const COUNTS: readonly number[] = (() => {
  const steps = [1];
  while (steps.length < 64) {
    const last = steps[steps.length - 1]!;
    steps.push(Math.max(last + 1, Math.floor((last * 6) / 5)));
  }
  return steps;
})();

const COUNT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** The nearest rung of the ladder to `n`, measured by ratio. */
export function countIndex(n: number): number {
  if (n <= 1) return 0;
  if (n >= COUNTS[63]!) return 63;
  let below = 0;
  while (COUNTS[below + 1]! <= n) below++;
  return n * n <= COUNTS[below]! * COUNTS[below + 1]! ? below : below + 1;
}

/** `[symbol, count]` pairs as a string of symbol, count-character pairs. */
export function packSparse(entries: ReadonlyArray<readonly [string, number]>): string {
  return entries.map(([symbol, count]) => symbol + COUNT_CHARS[countIndex(count)]!).join('');
}

export function unpackSparse(packed: string): Map<string, number> {
  if (packed.length % 2 !== 0) throw new RangeError('sparse row has an odd length');
  const out = new Map<string, number>();
  for (let i = 0; i < packed.length; i += 2) {
    const at = COUNT_CHARS.indexOf(packed[i + 1]!);
    if (at < 0) throw new RangeError(`unknown count character ${JSON.stringify(packed[i + 1])}`);
    out.set(packed[i]!, COUNTS[at]!);
  }
  return out;
}

/**
 * A row for a context that has its own counts, blended with the row of the shorter context it falls back to:
 * `counts * 2^logT + prior * priorWeight`. The prior's total is `2^logT`, so `priorWeight` is the number of
 * observations the prior is worth.
 */
export function blendRow(counts: readonly number[], prior: readonly number[], priorWeight: number, logT: number): number[] {
  const scale = 2 ** logT;
  return normalize(
    counts.map((n, i) => n * scale + prior[i]! * priorWeight),
    logT,
  );
}

/** How much a shorter context is worth when blended into a longer one. Part of the format. */
const ORDER0_UNSEEN = 1;
const ORDER0_COUNT_WEIGHT = 5;
const ORDER1_PRIOR_WEIGHT = 141;
const ORDER2_PRIOR_WEIGHT = 8;

export type FlagName = 'port' | 'www' | 'https' | 'sld' | 'sub';
const FLAG_NAMES: readonly FlagName[] = ['port', 'www', 'https', 'sld', 'sub'];

/** Shape of `v1.json`. */
export type TableData = {
  logT: { type: number; lit: number; word: number; id: number; flag: number };
  /** One row per character class, each over {@link TYPE}. */
  types: ReadonlyArray<readonly number[]>;
  idSets: readonly number[];
  /** Two slots each: absent, present. */
  flags: Record<FlagName, readonly number[]>;
  /** Dictionary words, most common first, separated by spaces. */
  words: string;
  /** `[count index, how many words]`, in the order of `words`. */
  wordRuns: ReadonlyArray<readonly number[]>;
  lit0: string;
  lit1: Readonly<Record<string, string>>;
  lit2: Readonly<Record<string, string>>;
};

export class Model {
  readonly types: readonly Table[];
  readonly idSets: Table;
  readonly flags: Readonly<Record<FlagName, Table>>;
  readonly words: readonly string[];
  readonly wordIndex: ReadonlyMap<string, number>;
  readonly wordTable: Table;
  readonly maxWordLength: number;

  private readonly data: TableData;
  private order0: Table | undefined;
  private readonly order1 = new Map<string, Table>();
  private readonly order2 = new Map<string, Table>();

  constructor(data: TableData) {
    this.data = data;
    const { logT } = data;

    if (data.types.length !== CLASS_COUNT) throw new RangeError(`expected ${CLASS_COUNT} type rows, got ${data.types.length}`);
    this.types = data.types.map((row) => {
      if (row.length !== TYPE_COUNT) throw new RangeError(`a type row needs ${TYPE_COUNT} slots`);
      return makeTable(row, logT.type);
    });

    if (data.idSets.length !== ID_SETS.length) throw new RangeError(`expected ${ID_SETS.length} id sets`);
    this.idSets = makeTable(data.idSets, logT.id);

    const flags = {} as Record<FlagName, Table>;
    for (const name of FLAG_NAMES) {
      if (data.flags[name].length !== 2) throw new RangeError(`flag ${name} needs two slots`);
      flags[name] = makeTable(data.flags[name], logT.flag);
    }
    this.flags = flags;

    this.words = data.words === '' ? [] : data.words.split(' ');
    const seen = new Map<string, number>();
    this.words.forEach((word, i) => {
      if (!/^[a-z]{2,}$/.test(word)) throw new RangeError(`dictionary word ${JSON.stringify(word)} is not lowercase letters`);
      if (seen.has(word)) throw new RangeError(`dictionary word ${word} appears twice`);
      seen.set(word, i);
    });
    this.wordIndex = seen;
    this.maxWordLength = this.words.reduce((m, w) => Math.max(m, w.length), 0);

    const raw: number[] = [];
    for (const run of data.wordRuns) {
      const [step, length] = run;
      if (run.length !== 2 || step === undefined || length === undefined || !(step in COUNTS) || !Number.isInteger(length) || length < 1) {
        throw new RangeError('malformed word run');
      }
      for (let i = 0; i < length; i++) raw.push(COUNTS[step]!);
    }
    if (raw.length !== this.words.length) throw new RangeError(`word runs cover ${raw.length} words, the list has ${this.words.length}`);
    this.wordTable = makeTable(normalize(raw, logT.word), logT.word);
  }

  /** Probabilities of the next literal character, given the two before it. */
  literals(p2: string, p1: string): Table {
    const key = p2 + p1;
    let table = this.order2.get(key);
    if (table) return table;
    const packed = this.data.lit2[key];
    const prior = this.order1Row(p1);
    table = packed === undefined ? prior : this.blendCounts(unpackSparse(packed), prior, ORDER2_PRIOR_WEIGHT);
    this.order2.set(key, table);
    return table;
  }

  private order0Row(): Table {
    if (!this.order0) {
      const counts = unpackSparse(this.data.lit0);
      const raw = Array.from(LITERALS, (c) => (counts.get(c) ?? 0) * ORDER0_COUNT_WEIGHT + ORDER0_UNSEEN);
      this.order0 = makeTable(normalize(raw, this.data.logT.lit), this.data.logT.lit);
    }
    return this.order0;
  }

  private order1Row(p1: string): Table {
    let table = this.order1.get(p1);
    if (table) return table;
    const packed = this.data.lit1[p1];
    const prior = this.order0Row();
    table = packed === undefined ? prior : this.blendCounts(unpackSparse(packed), prior, ORDER1_PRIOR_WEIGHT);
    this.order1.set(p1, table);
    return table;
  }

  private blendCounts(counts: ReadonlyMap<string, number>, prior: Table, priorWeight: number): Table {
    const { lit } = this.data.logT;
    const row = blendRow(
      Array.from(LITERALS, (c) => counts.get(c) ?? 0),
      prior.freq,
      priorWeight,
      lit,
    );
    return makeTable(row, lit);
  }
}
