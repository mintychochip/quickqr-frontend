import { Reader, makeTable, normalize, pushSymbol, pushUniform, symbolCost } from './rans';
import type { Table } from './rans';

/** Deterministic PRNG so a failing sequence can be replayed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomTable(rand: () => number, size: number, logT: number): Table {
  const raw = Array.from({ length: size }, () => Math.floor(rand() ** 3 * 1000));
  raw[0] = (raw[0] ?? 0) + 1;
  return makeTable(normalize(raw, logT), logT);
}

function pick(rand: () => number, t: Table): number {
  const slot = Math.floor(rand() * 2 ** t.logT);
  return t.cum.findLastIndex((c, i) => i < t.freq.length && c <= slot);
}

const bitLength = (x: bigint) => x.toString(2).length;

describe('normalize', () => {
  test('scales counts to exactly 2^logT and keeps every symbol codable', () => {
    // floors are [4079, 1, 12, 1, 4] = 4097, one over, so the most likely symbol gives a slot back
    expect(normalize([1000, 0, 3, 0, 1], 12)).toEqual([4078, 1, 12, 1, 4]);
  });

  test('stays proportional to the counts it was given', () => {
    const f = normalize([3, 1], 8);
    expect(f).toEqual([192, 64]);
  });

  test('hands the rounding remainder to the most likely symbol, lowest index on a tie', () => {
    // floor(16/3) = 5 each, one slot left over
    expect(normalize([1, 1, 1], 4)).toEqual([6, 5, 5]);
    // floors [7, 7, 1], one slot left over, tie between the first two
    expect(normalize([5, 5, 1], 4)).toEqual([8, 7, 1]);
  });

  test('refuses an all-zero row, which has no distribution', () => {
    expect(() => normalize([0, 0, 0], 8)).toThrow();
  });
});

describe('makeTable', () => {
  test('rejects frequencies that do not add up to 2^logT', () => {
    expect(() => makeTable([100, 100], 8)).toThrow();
  });

  test('rejects a symbol with no slot, which could never be coded', () => {
    expect(() => makeTable([256, 0], 8)).toThrow();
  });
});

describe('coding symbols', () => {
  test('symbols come back in the order they were written, and the state returns to 1', () => {
    const rand = rng(7);
    for (let round = 0; round < 200; round++) {
      const t = randomTable(rand, 2 + Math.floor(rand() * 60), 8 + Math.floor(rand() * 10));
      const seq = Array.from({ length: 1 + Math.floor(rand() * 80) }, () => pick(rand, t));
      let x = 1n;
      for (let i = seq.length - 1; i >= 0; i--) x = pushSymbol(x, t, seq[i]!);
      const r = new Reader(x);
      const got = seq.map(() => r.symbol(t));
      expect(got).toEqual(seq);
      expect(r.x).toBe(1n);
    }
  });

  test('uniform digits and table symbols can share one stream', () => {
    const rand = rng(11);
    const t = randomTable(rand, 20, 12);
    const ops = Array.from({ length: 120 }, () => (rand() < 0.5 ? { m: 0, v: pick(rand, t) } : { m: 2 + Math.floor(rand() * 63), v: -1 }));
    for (const op of ops) if (op.m) op.v = Math.floor(rand() * op.m);
    let x = 1n;
    for (let i = ops.length - 1; i >= 0; i--) {
      const op = ops[i]!;
      x = op.m ? pushUniform(x, op.m, op.v) : pushSymbol(x, t, op.v);
    }
    const r = new Reader(x);
    const got = ops.map((op) => ({ m: op.m, v: op.m ? r.uniform(op.m) : r.symbol(t) }));
    expect(got).toEqual(ops);
    expect(r.x).toBe(1n);
  });

  test('a stream costs what the model says it should: within one bit of the sum of -log2 p', () => {
    // The body is always pushed on top of the header, so measure from a state that is already wide.
    const header = 1n << 48n;
    const rand = rng(23);
    for (let round = 0; round < 40; round++) {
      const t = randomTable(rand, 30, 14);
      const seq = Array.from({ length: 400 }, () => pick(rand, t));
      let x = header;
      let ideal = 0;
      for (let i = seq.length - 1; i >= 0; i--) {
        x = pushSymbol(x, t, seq[i]!);
        ideal += symbolCost(t, seq[i]!);
      }
      const grown = bitLength(x) - bitLength(header);
      expect(Math.abs(grown - ideal) < 1.1).toBe(true);
    }
  });

  test('a symbol that owns the whole table costs nothing', () => {
    const t = makeTable([256], 8);
    expect(pushSymbol(12345n, t, 0)).toBe(12345n);
    expect(symbolCost(t, 0)).toBe(0);
  });

  test('reading past what was written is reported, not looped on forever', () => {
    const t = makeTable([128, 128], 8);
    const r = new Reader(0n);
    expect(() => r.symbol(t)).toThrow();
  });
});
