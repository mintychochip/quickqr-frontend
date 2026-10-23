import type { Link, TrendsSummary } from '../types';

export type ScanTrend = {
  total: number;
  lastHour: number;
  previousHour: number;
  rate: number | null;
  points: number[];
  loading?: boolean;
  error?: boolean;
};

export function scanRate(lastHour: number, previousHour: number): number | null {
  if (previousHour === 0) return lastHour === 0 ? 0 : null;
  return Math.round(((lastHour - previousHour) / previousHour) * 100);
}

/** The trend of one link from its hourly counts, oldest first: the last two are this hour and the one before. */
export function scanTrendFromCounts(total: number, counts: number[]): ScanTrend {
  const lastHour = counts[counts.length - 1] ?? 0;
  const previousHour = counts[counts.length - 2] ?? 0;
  return {
    total,
    lastHour,
    previousHour,
    rate: scanRate(lastHour, previousHour),
    points: counts,
  };
}

/**
 * A trend for every link in `links`, from one trends answer. The answer lists only links with a scan in its hours, so a
 * link it leaves out gets six zeros. Totals come from the link itself, which the list already carries.
 */
export function scanTrendsFor(
  links: Pick<Link, 'code' | 'total_scans'>[],
  trends: TrendsSummary,
): Record<string, ScanTrend> {
  const counts = new Map(trends.links.map((trend) => [trend.code, trend.counts]));
  return Object.fromEntries(
    links.map((link) => [
      link.code,
      scanTrendFromCounts(link.total_scans || 0, counts.get(link.code) ?? trends.hours.map(() => 0)),
    ]),
  );
}

export function pendingScanTrend(total = 0): ScanTrend {
  return {
    total,
    lastHour: 0,
    previousHour: 0,
    rate: 0,
    points: [],
    loading: true,
  };
}

export function failedScanTrend(total = 0): ScanTrend {
  return {
    total,
    lastHour: 0,
    previousHour: 0,
    rate: 0,
    points: [],
    error: true,
  };
}

export function formatScanRate(rate: number | null, lastHour: number): string {
  if (rate === null) return lastHour > 0 ? 'New this hour' : '0% vs last hour';
  return `${rate > 0 ? '+' : ''}${rate}% vs last hour`;
}

export function scanRateTone(rate: number | null, lastHour: number): string {
  if (rate === null) return lastHour > 0 ? 'scan-tone-up' : 'scan-tone-flat';
  if (rate > 0) return 'scan-tone-up';
  if (rate < 0) return 'scan-tone-down';
  return 'scan-tone-flat';
}
