'use client';

import { useQuery } from '@tanstack/react-query';
import { api, unwrap, type ConsumptionGroupBy } from '@/lib/api';

export interface ReportRange {
  from: string;
  to: string;
}

const reportKeys = {
  consumption: (groupBy: ConsumptionGroupBy, range: ReportRange, limit: number) =>
    ['reports', 'consumption', groupBy, range, limit] as const,
  summary: (range: ReportRange) => ['reports', 'summary', range] as const,
};

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

export function useSummaryReport(range: ReportRange) {
  return useQuery({
    queryKey: reportKeys.summary(range),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/reports/summary', { params: { query: range } })),
  });
}
