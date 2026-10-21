import {
  CLASS_COUNT,
  COUNTS,
  ID_SETS,
  LITERALS,
  Model,
  START,
  blendRow,
  classOf,
  countIndex,
  packSparse,
  unpackSparse,
} from './model';
import type { TableData } from './model';

describe('count quantisation', () => {
  test('counts climb by about a fifth per step, one at a time at the start', () => {
    expect(COUNTS.slice(0, 12)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14]);
    expect(COUNTS.length).toBe(64);
    expect(COUNTS[63]).toBe(152323);
    expect(COUNTS.every((c, i) => i === 0 || c > COUNTS[i - 1]!)).toBe(true);
  });

  test('a count maps to the nearest step by ratio, not by difference', () => {
    expect(countIndex(1)).toBe(0);
    expect(countIndex(7)).toBe(6);
    // 1000 sits between 926 and 1111; it is 8% above one and 11% below the other
    expect(COUNTS[countIndex(1000)]).toBe(926);
    expect(countIndex(10 ** 9)).toBe(63);
  });

  test('sparse rows survive packing, to within the quantisation step', () => {
    const packed = packSparse([
      ['a', 7],
      ['~', 1000],
      ['"', 1],
    ]);
    expect(packed.length).toBe(6);
    expect([...unpackSparse(packed)]).toEqual([
      ['a', 7],
      ['~', 926],
      ['"', 1],
    ]);
  });

  test('a damaged sparse row is refused rather than half-read', () => {
    expect(() => unpackSparse('abc')).toThrow();
    expect(() => unpackSparse('a!')).toThrow();
  });
});

describe('what comes before a character', () => {
  test('previous characters fall into the classes the type table is conditioned on', () => {
    const classes = [START, 'a', 'Z', '7', '/', '?', '&', '=', '#', '-', '_', '.', '+', '%', '~', '!'].map(classOf);
    expect(classes).toEqual([0, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 13]);
    expect(CLASS_COUNT).toBe(14);
  });
});

describe('blending a row with the row it falls back to', () => {
  test('counts weigh against the prior in proportion to the weight', () => {
    // raw = [3 * 16 + 3 * 2, 0 * 16 + 1 * 2] = [54, 2]; floors at 16 slots are [15, 0 -> 1]
    expect(blendRow([3, 0], [3, 1], 2, 4)).toEqual([15, 1]);
  });

  test('with no counts at all it is just the prior', () => {
    expect(blendRow([0, 0], [12, 4], 5, 4)).toEqual([12, 4]);
  });
});

function tinyData(literals: Pick<TableData, 'lit0' | 'lit1' | 'lit2'>): TableData {
  return {
    logT: { type: 4, lit: 12, word: 4, id: 4, flag: 2 },
    types: Array.from({ length: CLASS_COUNT }, () => [6, 4, 2, 2, 2]),
    idSets: [3, 3, 3, 3, 2, 2],
    flags: { port: [3, 1], www: [2, 2], https: [1, 3], sld: [2, 2], sub: [3, 1] },
    words: 'the and',
    wordRuns: [[4, 2]],
    ...literals,
  };
}

const index = (c: string) => LITERALS.indexOf(c);

describe('literal rows', () => {
  // lit0: one 'a' seen once. raw = 5 * n + 1 -> a: 6, others 1 (total 99). Floors at 4096: a 248, others 41,
  // leaving 35 slots for the most likely symbol.
  const order0 = tinyData({ lit0: packSparse([['a', 1]]), lit1: {}, lit2: {} });

  test('with only order-0 data every context uses the order-0 row', () => {
    const m = new Model(order0);
    const row = m.literals(START, START).freq;
    expect(row[index('a')]).toBe(283);
    expect(row[index('b')]).toBe(41);
    expect(row.reduce((a, b) => a + b, 0)).toBe(4096);
    expect(m.literals('x', 'y').freq).toEqual(row);
  });

  // lit1 for the start: 'b' seen 3 times. raw = n * 4096 + f0 * 141 and the total is (3 + 141) * 4096, so a
  // symbol's floor is raw / 144: a 277, b 125, others 40, leaving 14 slots for 'a'.
  const order1 = tinyData({ lit0: packSparse([['a', 1]]), lit1: { [START]: packSparse([['b', 3]]) }, lit2: {} });

  test('an order-1 row mixes its own counts into the order-0 row', () => {
    const m = new Model(order1);
    const row = m.literals('q', START).freq;
    expect(row[index('a')]).toBe(291);
    expect(row[index('b')]).toBe(125);
    expect(row[index('c')]).toBe(40);
    expect(row.reduce((a, b) => a + b, 0)).toBe(4096);
  });

  // lit2 for (start, start): 'c' seen twice. raw = n * 4096 + f1 * 8 and the total is (2 + 8) * 4096, so a
  // floor is raw / 10: c 851, a 232, b 100, others 32, leaving 1 slot for 'c'.
  const order2 = tinyData({
    lit0: packSparse([['a', 1]]),
    lit1: { [START]: packSparse([['b', 3]]) },
    lit2: { [START + START]: packSparse([['c', 2]]) },
  });

  test('an order-2 row mixes its own counts into the order-1 row of the last character', () => {
    const m = new Model(order2);
    const row = m.literals(START, START).freq;
    expect(row[index('c')]).toBe(852);
    expect(row[index('a')]).toBe(232);
    expect(row[index('b')]).toBe(100);
    expect(row[index('d')]).toBe(32);
    expect(row.reduce((a, b) => a + b, 0)).toBe(4096);
  });

  test('a context with no order-2 row falls back to the order-1 row of its last character', () => {
    const m = new Model(order2);
    expect(m.literals('x', START).freq).toEqual(new Model(order1).literals('x', START).freq);
  });

  test('rows are built once and reused', () => {
    const m = new Model(order2);
    expect(m.literals(START, START)).toBe(m.literals(START, START));
  });
});

describe('words and ids', () => {
  test('words are looked up by spelling and share the run frequency', () => {
    const m = new Model(tinyData({ lit0: packSparse([['a', 1]]), lit1: {}, lit2: {} }));
    expect(m.words).toEqual(['the', 'and']);
    expect(m.wordIndex.get('and')).toBe(1);
    expect(m.wordTable.freq).toEqual([8, 8]);
    expect(m.maxWordLength).toBe(3);
  });

  test('the id sets go from digits only up to base 64, and each digit is its own character', () => {
    expect(ID_SETS.map((s) => s.length)).toEqual([10, 16, 36, 36, 62, 64]);
    for (const set of ID_SETS) expect(new Set(set).size).toBe(set.length);
  });

  test('the literal alphabet is every printable ASCII character a URL can hold, and no space', () => {
    expect(LITERALS.length).toBe(94);
    expect(LITERALS[0]).toBe('!');
    expect(LITERALS[93]).toBe('~');
    expect(LITERALS.includes(' ')).toBe(false);
  });
});

describe('malformed table data', () => {
  test('wrong number of type rows is refused', () => {
    const data = tinyData({ lit0: packSparse([['a', 1]]), lit1: {}, lit2: {} });
    expect(() => new Model({ ...data, types: data.types.slice(1) })).toThrow();
  });

  test('word runs that do not cover the word list are refused', () => {
    const data = tinyData({ lit0: packSparse([['a', 1]]), lit1: {}, lit2: {} });
    expect(() => new Model({ ...data, wordRuns: [[4, 1]] })).toThrow();
  });

  test('type rows that do not add up to 2^logT are refused', () => {
    const data = tinyData({ lit0: packSparse([['a', 1]]), lit1: {}, lit2: {} });
    expect(() => new Model({ ...data, types: data.types.map(() => [6, 4, 2, 2, 1]) })).toThrow();
  });
});
