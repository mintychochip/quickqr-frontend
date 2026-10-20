import type { AnalyticsSummary } from '../types';

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

export function scanTrendFromSummary(summary: AnalyticsSummary): ScanTrend {
  const points = summary.hourly_timeline.map((point) => point.count);
  const lastHour = points[points.length - 1] ?? 0;
  const previousHour = points[points.length - 2] ?? 0;
  return {
    total: summary.total_scans,
    lastHour,
    previousHour,
    rate: scanRate(lastHour, previousHour),
    points,
  };
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
  if (rate === null) return lastHour > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground';
  if (rate > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (rate < 0) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
}
