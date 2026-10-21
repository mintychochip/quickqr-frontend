import { ID_SETS, MIN_ID_LENGTH } from './model';
import { parse } from './tokenize';
import type { Costs, Token, Vocabulary } from './tokenize';

const vocab: Vocabulary = { wordIndex: new Map([['menu', 0], ['cafe', 1], ['the', 2]]), maxWordLength: 4 };

/** Literals 5 bits, words 3 + 4, capitalised 4 + 4, ids 6 plus the set, hex cheapest. */
const costs: Costs = {
  type: (_cls, t) => [1, 3, 4, 6][t]!,
  literal: () => 5,
  word: () => 4,
  idSet: (s) => [2, 1, 3, 3, 4, 4][s]!,
};

const describeTokens = (tokens: Token[]) => tokens.map((t) => `${t.kind}:${t.text}`);

describe('choosing tokens', () => {
  test('an empty string has nothing to code', () => {
    expect(parse('', vocab, costs)).toEqual({ bits: 0, tokens: [] });
  });

  test('a dictionary word beats spelling it out', () => {
    const p = parse('menu', vocab, costs);
    expect(describeTokens(p.tokens)).toEqual(['word:menu']);
    expect(p.tokens[0]!.index).toBe(0);
    expect(p.bits).toBe(7);
  });

  test('a capitalised word is its own token and keeps the capital', () => {
    const p = parse('Menu', vocab, costs);
    expect(describeTokens(p.tokens)).toEqual(['cap:Menu']);
    expect(p.tokens[0]!.index).toBe(0);
  });

  test('capitals anywhere but the first letter are spelled out', () => {
    expect(describeTokens(parse('MENU', vocab, costs).tokens)).toEqual(['lit:M', 'lit:E', 'lit:N', 'lit:U']);
    expect(describeTokens(parse('mEnu', vocab, costs).tokens).includes('word:mEnu')).toBe(false);
  });

  test('words are found inside longer runs of letters, and the rest stays literal', () => {
    expect(describeTokens(parse('xmenux', vocab, costs).tokens)).toEqual(['lit:x', 'word:menu', 'lit:x']);
  });

  test('separators stay literal between words', () => {
    expect(describeTokens(parse('/the-cafe', vocab, costs).tokens)).toEqual(['lit:/', 'word:the', 'lit:-', 'word:cafe']);
  });

  test('a long run drawn from a small alphabet becomes an id in the smallest set that holds it', () => {
    const p = parse('a1b2c3d4e5', vocab, costs);
    expect(describeTokens(p.tokens)).toEqual(['id:a1b2c3d4e5']);
    expect(p.tokens[0]!.index).toBe(1);
  });

  test('a short run is cheaper spelled out', () => {
    expect(parse('a1b2', vocab, costs).tokens.every((t) => t.kind === 'lit')).toBe(true);
    expect(MIN_ID_LENGTH).toBe(5);
  });

  test('an id never reaches into a separator', () => {
    const tokens = parse('0123456789-0123456789', vocab, costs).tokens;
    expect(tokens.every((t) => t.kind !== 'id' || !t.text.includes('-'))).toBe(true);
  });

  test('every literal is priced after the two characters before it, and its type after their class', () => {
    const literalCalls: string[] = [];
    const typeCalls: number[] = [];
    const spy: Costs = {
      ...costs,
      literal: (p2, p1, c) => {
        literalCalls.push(`${JSON.stringify(p2)}${JSON.stringify(p1)}${JSON.stringify(c)}`);
        return 5;
      },
      type: (cls, t) => {
        if (t === 0) typeCalls.push(cls);
        return costs.type(cls, t);
      },
    };
    parse('ab/', vocab, spy);
    expect(literalCalls).toEqual(['" "" ""a"', '" ""a""b"', '"a""b""/"']);
    // start, then after a letter, then after a letter
    expect(typeCalls).toEqual([0, 1, 1]);
  });

  test('the tokens always spell the input back', () => {
    for (const s of ['', '/', '/menu?x=1&y=Cafe#top', 'zzzzzzzzzzzzzzzzzz', '%2F%3A', '/Menu/the/CAFE/9f8e7d6c5b4a3210']) {
      expect(parse(s, vocab, costs).tokens.map((t) => t.text).join('')).toBe(s);
    }
  });
});

/** Every way of cutting `s` into tokens, priced the same way, by exhaustive search. */
function cheapest(s: string, from: number, previous: string): number {
  if (from === s.length) return 0;
  let best = Infinity;
  const cls = 0; // costs above ignore the class
  void previous;
  const literal = costs.type(cls, 0) + costs.literal(' ', ' ', s[from]!);
  best = Math.min(best, literal + cheapest(s, from + 1, s[from]!));
  for (let end = from + 2; end <= Math.min(s.length, from + vocab.maxWordLength); end++) {
    const piece = s.slice(from, end);
    if (vocab.wordIndex.has(piece)) best = Math.min(best, costs.type(cls, 1) + costs.word(0) + cheapest(s, end, piece.at(-1)!));
    const lowered = piece[0]!.toLowerCase() + piece.slice(1);
    if (/^[A-Z][a-z]+$/.test(piece) && vocab.wordIndex.has(lowered)) best = Math.min(best, costs.type(cls, 2) + costs.word(0) + cheapest(s, end, piece.at(-1)!));
  }
  for (let setIndex = 0; setIndex < ID_SETS.length; setIndex++) {
    const set = ID_SETS[setIndex]!;
    for (let end = from + MIN_ID_LENGTH; end <= s.length; end++) {
      const piece = s.slice(from, end);
      if ([...piece].every((c) => set.includes(c))) {
        const bits = costs.type(cls, 3) + costs.idSet(setIndex) + (piece.length + 1) * Math.log2(set.length + 1);
        best = Math.min(best, bits + cheapest(s, end, piece.at(-1)!));
      }
    }
  }
  return best;
}

describe('the parse is the cheapest one', () => {
  test('it matches an exhaustive search on short strings drawn from letters, digits and capitals', () => {
    let seed = 12345;
    const next = () => {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      return seed / 4294967296;
    };
    const pieces = ['menu', 'Menu', 'cafe', 'the', 'a', '1', 'f', '/', 'Z', '-', '0f', '99'];
    for (let round = 0; round < 300; round++) {
      let s = '';
      const count = 1 + Math.floor(next() * 5);
      for (let i = 0; i < count; i++) s += pieces[Math.floor(next() * pieces.length)];
      if (s.length > 11) s = s.slice(0, 11);
      expect(Math.abs(parse(s, vocab, costs).bits - cheapest(s, 0, ' ')) < 1e-9).toBe(true);
    }
  });
});
