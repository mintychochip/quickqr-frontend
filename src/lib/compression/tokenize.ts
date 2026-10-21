/**
 * Cuts the part of a URL after the host into the tokens the v1 format codes, choosing the cheapest cut.
 *
 * A token is one literal character, a dictionary word (`menu`), a capitalised dictionary word (`Menu`), or a
 * run of random-looking characters from one of the id sets. What a token costs depends only on the one or two
 * characters before it, and those are the same whichever way the earlier text was cut, so a left-to-right
 * shortest-path search finds the best cut exactly.
 *
 * The same search drives training, with costs taken from the model as it is being estimated.
 */
import { ID_SETS, MIN_ID_LENGTH, START, TYPE, classOf } from './model';

export type Vocabulary = {
  readonly wordIndex: ReadonlyMap<string, number>;
  readonly maxWordLength: number;
};

/** Prices in bits. The end of the body is not part of the parse, because it costs the same for every cut. */
export type Costs = {
  type(cls: number, type: number): number;
  literal(p2: string, p1: string, char: string): number;
  word(index: number): number;
  idSet(set: number): number;
};

export type TokenKind = 'lit' | 'word' | 'cap' | 'id';

export type Token = {
  kind: TokenKind;
  text: string;
  /** Word index for `word` and `cap`, id set for `id`, -1 for `lit`. */
  index: number;
};

export type Parse = { bits: number; tokens: Token[] };

/** Longer runs are cut into several ids; the cost of the extra end digit is far below the cost of the search. */
const MAX_ID_LENGTH = 256;

const KINDS: readonly TokenKind[] = ['lit', 'word', 'cap', 'id'];
const isLower = (code: number) => code >= 97 && code <= 122;
const isUpper = (code: number) => code >= 65 && code <= 90;

export function parse(rest: string, vocab: Vocabulary, costs: Costs): Parse {
  const n = rest.length;
  const best = new Float64Array(n + 1).fill(Infinity);
  const backFrom = new Int32Array(n + 1);
  const backKind = new Uint8Array(n + 1);
  const backIndex = new Int32Array(n + 1);
  best[0] = 0;

  const lowerRun = new Int32Array(n + 2);
  for (let i = n - 1; i >= 0; i--) lowerRun[i] = isLower(rest.charCodeAt(i)) ? lowerRun[i + 1]! + 1 : 0;

  const setRuns = ID_SETS.map((set) => {
    const run = new Int32Array(n + 1);
    for (let i = n - 1; i >= 0; i--) run[i] = set.includes(rest[i]!) ? run[i + 1]! + 1 : 0;
    return run;
  });
  const digitBits = ID_SETS.map((set) => Math.log2(set.length + 1));

  const relax = (to: number, bits: number, from: number, kind: number, index: number) => {
    if (bits < best[to]!) {
      best[to] = bits;
      backFrom[to] = from;
      backKind[to] = kind;
      backIndex[to] = index;
    }
  };

  for (let i = 0; i < n; i++) {
    const here = best[i]!;
    if (here === Infinity) continue;
    const p1 = i === 0 ? START : rest[i - 1]!;
    const p2 = i < 2 ? START : rest[i - 2]!;
    const cls = classOf(p1);

    relax(i + 1, here + costs.type(cls, TYPE.lit) + costs.literal(p2, p1, rest[i]!), i, TYPE.lit, -1);

    const code = rest.charCodeAt(i);
    if (isLower(code)) {
      const wordCost = here + costs.type(cls, TYPE.word);
      for (let length = 2; length <= Math.min(lowerRun[i]!, vocab.maxWordLength); length++) {
        const index = vocab.wordIndex.get(rest.slice(i, i + length));
        if (index !== undefined) relax(i + length, wordCost + costs.word(index), i, TYPE.word, index);
      }
    } else if (isUpper(code)) {
      const capCost = here + costs.type(cls, TYPE.cap);
      const tail = lowerRun[i + 1]!;
      for (let length = 2; length <= Math.min(tail + 1, vocab.maxWordLength); length++) {
        const index = vocab.wordIndex.get(rest[i]!.toLowerCase() + rest.slice(i + 1, i + length));
        if (index !== undefined) relax(i + length, capCost + costs.word(index), i, TYPE.cap, index);
      }
    }

    const idCost = here + costs.type(cls, TYPE.id);
    for (let set = 0; set < ID_SETS.length; set++) {
      const reach = Math.min(setRuns[set]![i]!, MAX_ID_LENGTH);
      if (reach < MIN_ID_LENGTH) continue;
      const base = idCost + costs.idSet(set);
      for (let length = MIN_ID_LENGTH; length <= reach; length++) {
        relax(i + length, base + (length + 1) * digitBits[set]!, i, TYPE.id, set);
      }
    }
  }

  const tokens: Token[] = [];
  for (let at = n; at > 0; at = backFrom[at]!) {
    tokens.push({ kind: KINDS[backKind[at]!]!, text: rest.slice(backFrom[at]!, at), index: backIndex[at]! });
  }
  tokens.reverse();
  return { bits: best[n]!, tokens };
}
