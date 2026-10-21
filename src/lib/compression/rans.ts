/**
 * Range-ANS over one arbitrary-precision integer.
 *
 * v0 already treats a payload as a single number it pushes digits onto and pops digits off. Pushing a value
 * that has `M` equally likely options is `x * M + v`. This generalises that to options with unequal
 * probabilities: a symbol owning `freq` of `2^logT` slots costs `logT - log2(freq)` bits, so likely symbols are
 * cheap. There is no renormalisation and no flush: the number simply grows.
 *
 * Pushes and pops are last-in first-out, so the encoder pushes in the reverse of the order the decoder pops.
 *
 * rANS wastes up to about `log2(T)` bits when the first symbol is pushed onto a tiny state, because the rounding
 * is relative to `x`. The v1 format therefore pushes the header and host first and the body on top of them.
 */

export type Table = {
  readonly logT: number;
  readonly freq: readonly number[];
  /** `cum[i]` is the first slot of symbol `i`; `cum[freq.length]` is `2^logT`. */
  readonly cum: readonly number[];
};

/**
 * Turns counts into slot counts that add up to exactly `2^logT`. Every symbol keeps at least one slot, so
 * anything can still be coded, and the rounding remainder goes to the most likely symbol (lowest index on a
 * tie). Both decoders repeat this arithmetic, so it uses only integers below 2^53.
 */
export function normalize(raw: readonly number[], logT: number): number[] {
  const total = 2 ** logT;
  let sum = 0;
  for (const r of raw) {
    if (!Number.isInteger(r) || r < 0 || r * total > Number.MAX_SAFE_INTEGER) throw new RangeError(`count ${r} cannot be scaled to 2^${logT}`);
    sum += r;
  }
  if (sum === 0) throw new RangeError('cannot build a distribution from all-zero counts');
  const freq = raw.map((r) => Math.max(1, Math.floor((r * total) / sum)));
  let best = 0;
  let used = 0;
  for (let i = 0; i < freq.length; i++) {
    used += freq[i]!;
    if (freq[i]! > freq[best]!) best = i;
  }
  freq[best] = freq[best]! + total - used;
  if (freq[best]! < 1) throw new RangeError(`too many symbols (${raw.length}) for 2^${logT} slots`);
  return freq;
}

export function makeTable(freq: readonly number[], logT: number): Table {
  let sum = 0;
  const cum = [0];
  for (const f of freq) {
    if (!Number.isInteger(f) || f < 1) throw new RangeError('every symbol needs at least one slot');
    sum += f;
    cum.push(sum);
  }
  if (sum !== 2 ** logT) throw new RangeError(`slots add up to ${sum}, expected 2^${logT}`);
  return { logT, freq, cum };
}

/** Bits the model charges for `symbol`. */
export function symbolCost(t: Table, symbol: number): number {
  return t.logT - Math.log2(t.freq[symbol]!);
}

export function pushSymbol(x: bigint, t: Table, symbol: number): bigint {
  if (x < 1n) throw new RangeError('state must be at least 1');
  const f = BigInt(t.freq[symbol]!);
  return ((x / f) << BigInt(t.logT)) + BigInt(t.cum[symbol]!) + (x % f);
}

export function pushUniform(x: bigint, m: number, value: number): bigint {
  if (x < 1n) throw new RangeError('state must be at least 1');
  if (!Number.isInteger(value) || value < 0 || value >= m) throw new RangeError(`${value} is not below ${m}`);
  return x * BigInt(m) + BigInt(value);
}

/** Pops from the low end of a number, mirroring the pushes. */
export class Reader {
  x: bigint;

  constructor(x: bigint) {
    this.x = x;
  }

  symbol(t: Table): number {
    if (this.x < 1n) throw new RangeError('payload ended early');
    const shift = BigInt(t.logT);
    const slot = Number(this.x & ((1n << shift) - 1n));
    let lo = 0;
    let hi = t.freq.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (t.cum[mid]! <= slot) lo = mid;
      else hi = mid - 1;
    }
    this.x = BigInt(t.freq[lo]!) * (this.x >> shift) + BigInt(slot - t.cum[lo]!);
    return lo;
  }

  uniform(m: number): number {
    if (this.x < 1n) throw new RangeError('payload ended early');
    const size = BigInt(m);
    const value = Number(this.x % size);
    this.x /= size;
    return value;
  }
}
