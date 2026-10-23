import { describe, expect, test } from 'bun:test';
import { bestPlan } from './plans';

const NOW = new Date('2026-10-22T12:00:00.000Z');
const ends = (days: number): string => new Date(NOW.getTime() + days * 86_400_000).toISOString();

describe('bestPlan', () => {
  test('no entitlements is Free with no end date', () => {
    expect(bestPlan([], NOW)).toEqual({ plan: 'free', until: null });
  });

  test('a live Plus is Plus until its end', () => {
    expect(bestPlan([{ plan: 'plus', ends_at: ends(30) }], NOW)).toEqual({ plan: 'plus', until: ends(30) });
  });

  test('Pro beats Plus while both are live, and Plus is what is left when Pro ends', () => {
    const rows = [
      { plan: 'plus', ends_at: ends(60) },
      { plan: 'pro', ends_at: ends(10) },
    ];
    expect(bestPlan(rows, NOW)).toEqual({ plan: 'pro', until: ends(10) });
    expect(bestPlan(rows, new Date(NOW.getTime() + 11 * 86_400_000))).toEqual({ plan: 'plus', until: ends(60) });
  });

  test('a row that has ended counts for nothing, and one ending this very instant has ended', () => {
    expect(bestPlan([{ plan: 'pro', ends_at: ends(-1) }], NOW)).toEqual({ plan: 'free', until: null });
    expect(bestPlan([{ plan: 'pro', ends_at: NOW.toISOString() }], NOW)).toEqual({ plan: 'free', until: null });
  });

  test('until is the latest end among the live rows of the winning plan', () => {
    const rows = [
      { plan: 'plus', ends_at: ends(5) },
      { plan: 'plus', ends_at: ends(40) },
      { plan: 'plus', ends_at: ends(20) },
    ];
    expect(bestPlan(rows, NOW)).toEqual({ plan: 'plus', until: ends(40) });
  });

  test('a plan name this code does not know is ignored, never trusted as a paid plan', () => {
    expect(bestPlan([{ plan: 'enterprise', ends_at: ends(30) }, { plan: 'free', ends_at: ends(30) }], NOW)).toEqual({ plan: 'free', until: null });
  });
});
