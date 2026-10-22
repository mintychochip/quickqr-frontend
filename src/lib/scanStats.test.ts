import { scanTrendFromCounts, scanTrendFromSummary, scanTrendsFor } from './scanStats';
import type { AnalyticsSummary, TrendsSummary } from '../types';

const hours = ['10', '11', '12', '13', '14', '15'].map((h) => `2026-10-22T${h}:00:00Z`);

describe('scanTrendFromCounts', () => {
  test('the last two counts are this hour and the one before, and the rate is the change between them', () => {
    expect(scanTrendFromCounts(40, [0, 1, 2, 3, 4, 6])).toEqual({
      total: 40,
      lastHour: 6,
      previousHour: 4,
      rate: 50,
      points: [0, 1, 2, 3, 4, 6],
    });
  });

  test('from no scans to some is "new this hour" (a null rate) and from none to none is flat', () => {
    expect(scanTrendFromCounts(3, [0, 0, 0, 0, 0, 3]).rate).toBeNull();
    expect(scanTrendFromCounts(0, [0, 0, 0, 0, 0, 0]).rate).toBe(0);
  });

  test('draws exactly what the per-link analytics answer it replaces would have drawn', () => {
    const counts = [2, 0, 5, 1, 0, 4];
    const summary: AnalyticsSummary = {
      total_scans: 12,
      unique_devices: 3,
      device_breakdown: {},
      recent_scans: [],
      top_referrers: {},
      hourly_timeline: counts.map((count, i) => ({ time: `${10 + i}:00`, count })),
    };
    expect(scanTrendFromCounts(summary.total_scans, counts)).toEqual(scanTrendFromSummary(summary));
  });
});

describe('scanTrendsFor', () => {
  const links = [
    { code: 'busy', total_scans: 12 },
    { code: 'quiet', total_scans: 5 },
  ];

  test('gives every link a trend: the listed one from its counts, the others as six zeros, totals from the link itself', () => {
    const trends: TrendsSummary = { hours, links: [{ code: 'busy', counts: [0, 0, 1, 2, 3, 6] }] };
    expect(scanTrendsFor(links, trends)).toEqual({
      busy: { total: 12, lastHour: 6, previousHour: 3, rate: 100, points: [0, 0, 1, 2, 3, 6] },
      quiet: { total: 5, lastHour: 0, previousHour: 0, rate: 0, points: [0, 0, 0, 0, 0, 0] },
    });
  });

  test('skips a listed link the caller did not ask about, and handles no links at all', () => {
    const trends: TrendsSummary = { hours, links: [{ code: 'elsewhere', counts: [1, 1, 1, 1, 1, 1] }] };
    expect(Object.keys(scanTrendsFor(links, trends))).toEqual(['busy', 'quiet']);
    expect(scanTrendsFor([], { hours, links: [] })).toEqual({});
  });
});
