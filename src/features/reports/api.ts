'use client';

import { useQuery } from '@tanstack/react-query';
import { api, unwrap, type ConsumptionGroupBy } from '@/lib/api';
import { reportKeys } from './keys';

export interface ReportRange {
  from: string;
  to: string;
}

export type ActivityGranularity = 'day' | 'week' | 'month';

export function useConsumptionReport(
  groupBy: ConsumptionGroupBy,
  range: ReportRange,
  limit: number,
) {
  return useQuery({
    queryKey: reportKeys.consumption(groupBy, range, limit),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/v1/reports/consumption', {
          params: { query: { groupBy, limit, ...range } },
        }),
      ),
  });
}

export function useSummaryReport(range: ReportRange, enabled = true) {
  return useQuery({
    queryKey: reportKeys.summary(range),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/reports/summary', { params: { query: range } })),
    enabled,
  });
}

export function useActivityReport(
  range: ReportRange,
  granularity: ActivityGranularity,
  enabled = true,
) {
  return useQuery({
    queryKey: reportKeys.activity(range, granularity),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/v1/reports/activity', {
          params: { query: { ...range, granularity } },
        }),
      ),
    enabled,
  });
}
