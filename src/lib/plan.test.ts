import { describePlan, formatDay } from './plan';

describe('describePlan', () => {
  test('a server that sends no plan at all is the free plan', () => {
    expect(describePlan({})).toEqual({ name: 'Free', line: 'Free plan' });
  });

  test('free has no end date to show', () => {
    expect(describePlan({ plan: 'free', plan_until: null })).toEqual({ name: 'Free', line: 'Free plan' });
  });

  test('a plan with an end says when, on the viewer\u2019s calendar', () => {
    const until = '2026-11-22T23:30:00.000Z';

    expect(describePlan({ plan: 'plus', plan_until: until }, 'UTC')).toEqual({
      name: 'Plus',
      line: 'Plus plan until Nov 22, 2026',
    });
    // Half past eleven at night in London is already the next day in Auckland.
    expect(describePlan({ plan: 'pro', plan_until: until }, 'Pacific/Auckland').line).toBe('Pro plan until Nov 23, 2026');
  });

  test('a plan the app has never heard of is not shown as one', () => {
    expect(describePlan({ plan: 'enterprise' as 'plus', plan_until: '2026-11-22T00:00:00.000Z' }, 'UTC')).toEqual({
      name: 'Free',
      line: 'Free plan',
    });
  });
});

describe('formatDay', () => {
  test('writes a month name, so no reader has to guess day from month', () => {
    expect(formatDay('2026-03-04T12:00:00.000Z', 'UTC')).toBe('Mar 4, 2026');
  });
});
