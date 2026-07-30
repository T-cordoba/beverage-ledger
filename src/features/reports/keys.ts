import type { ConsumptionGroupBy } from '@/lib/api';
import type { ActivityGranularity, ReportRange } from './api';

/** Apart from the hooks for the same reason as the stock keys: no import cycles. */
export const reportKeys = {
  all: ['reports'] as const,
  consumption: (groupBy: ConsumptionGroupBy, range: ReportRange, limit: number) =>
    ['reports', 'consumption', groupBy, range, limit] as const,
  summary: (range: ReportRange) => ['reports', 'summary', range] as const,
  activity: (range: ReportRange, granularity: ActivityGranularity) =>
    ['reports', 'activity', range, granularity] as const,
};
