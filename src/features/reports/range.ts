import type { ReportRange } from './api';

export type ReportPeriod = 'week' | 'month' | 'year';

/** Labelled from `reports.periods`, keyed by these same values. */
export const REPORT_PERIODS: ReportPeriod[] = ['week', 'month', 'year'];

/** Every report takes a range; the presets are what the UI actually offers. */
export function rangeFor(period: ReportPeriod): ReportRange {
  const to = new Date();
  const from = new Date(to);

  if (period === 'week') from.setDate(to.getDate() - 7);
  if (period === 'month') from.setMonth(to.getMonth() - 1);
  if (period === 'year') from.setFullYear(to.getFullYear() - 1);

  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * A year of daily buckets is 365 bars nobody can read, so the granularity
 * follows the range instead of being a second control the user has to set.
 */
export function granularityFor(period: ReportPeriod): 'day' | 'week' | 'month' {
  if (period === 'week') return 'day';
  if (period === 'month') return 'day';
  return 'month';
}
