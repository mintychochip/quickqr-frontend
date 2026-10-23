import { describe, expect, test } from 'bun:test';
import { GIFT_LIMITS, giftLink, isGiftToken, newGiftToken, parseNewGift } from './gifts';

const NOW = new Date('2026-10-22T12:00:00.000Z');

describe('gift tokens', () => {
  test('a token is 160 random bits: 27 URL-safe characters that never repeat', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const token = newGiftToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]{27}$/);
      seen.add(token);
    }
    expect(seen.size).toBe(500);
  });

  test('a token carries no padding, so it survives a URL fragment untouched', () => {
    for (let i = 0; i < 50; i++) expect(newGiftToken()).not.toContain('=');
  });

  test('only a string shaped like a token is one', () => {
    expect(isGiftToken(newGiftToken())).toBe(true);
    for (const bad of ['', 'short', 'x'.repeat(26), 'x'.repeat(28), `${'x'.repeat(26)}=`, `${'x'.repeat(26)} `, 'é'.repeat(27), 5, null, undefined, {}, ['x'.repeat(27)]]) {
      expect(isGiftToken(bad)).toBe(false);
    }
  });
});

describe('parseNewGift', () => {
  const ok = (input: unknown) => {
    const parsed = parseNewGift(input, NOW);
    if (!parsed.ok) throw new Error(`expected a valid gift, got: ${parsed.error}`);
    return parsed.value;
  };
  const bad = (input: unknown): string => {
    const parsed = parseNewGift(input, NOW);
    if (parsed.ok) throw new Error('expected an invalid gift');
    return parsed.error;
  };

  test('a plan and a length are enough: one use, a link good for 30 days, no note', () => {
    expect(ok({ plan: 'plus', days: 30 })).toEqual({
      plan: 'plus',
      days: 30,
      maxUses: 1,
      redeemBy: '2026-11-21T12:00:00.000Z',
      note: '',
    });
  });

  test('everything can be set, and the note is trimmed', () => {
    expect(ok({ plan: 'pro', days: 366, uses: 1000, link_days: 365, note: '  for Sam  ' })).toEqual({
      plan: 'pro',
      days: 366,
      maxUses: 1000,
      redeemBy: '2027-10-22T12:00:00.000Z',
      note: 'for Sam',
    });
  });

  test('only plus and pro can be given', () => {
    for (const plan of ['free', 'Plus', 'enterprise', '', 1, null, undefined]) {
      expect(bad({ plan, days: 30 }), String(plan)).toBe('plan must be plus or pro');
    }
  });

  test('the length is a whole number of days from 1 to 366', () => {
    for (const days of [0, -1, 367, 1.5, '30', null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(bad({ plan: 'plus', days }), String(days)).toBe('days must be a whole number from 1 to 366');
    }
    expect(ok({ plan: 'plus', days: 1 }).days).toBe(1);
  });

  test('uses are a whole number from 1 to 1000', () => {
    for (const uses of [0, -3, 1001, 2.5, '5', null]) {
      expect(bad({ plan: 'plus', days: 30, uses }), String(uses)).toBe('uses must be a whole number from 1 to 1000');
    }
  });

  test('the link lives 1 to 365 days', () => {
    for (const link_days of [0, 366, 1.5, '30', null]) {
      expect(bad({ plan: 'plus', days: 30, link_days }), String(link_days)).toBe('link_days must be a whole number from 1 to 365');
    }
  });

  test('a note is text of at most 120 characters once trimmed', () => {
    expect(ok({ plan: 'plus', days: 30, note: 'x'.repeat(120) }).note).toHaveLength(120);
    expect(bad({ plan: 'plus', days: 30, note: 'x'.repeat(121) })).toBe('note must be text of at most 120 characters');
    expect(bad({ plan: 'plus', days: 30, note: 5 })).toBe('note must be text of at most 120 characters');
    expect(ok({ plan: 'plus', days: 30, note: `  ${'x'.repeat(120)}  ` }).note).toHaveLength(120);
  });

  test('a body that is not an object is refused before anything else is read', () => {
    for (const body of [null, undefined, [], 'plus', 5, true]) expect(bad(body)).toBe('Invalid request body');
  });

  test('the limits are the ones the messages name', () => {
    expect(GIFT_LIMITS).toEqual({ days: { min: 1, max: 366 }, uses: { min: 1, max: 1000 }, linkDays: { default: 30, max: 365 }, noteMax: 120 });
  });
});

describe('giftLink', () => {
  test('the token is in the fragment, whether or not the base ends in a slash', () => {
    expect(giftLink('https://quickqr.app', 'abc')).toBe('https://quickqr.app/gift#abc');
    expect(giftLink('https://quickqr.app/', 'abc')).toBe('https://quickqr.app/gift#abc');
  });
});
