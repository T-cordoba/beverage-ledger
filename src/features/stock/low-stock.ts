'use client';

import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { stockKeys } from './keys';

/** A shortlist, not a page: the endpoint returns the worst offenders and stops. */
export function useLowStock(limit: number, enabled = true) {
  return useQuery({
    queryKey: stockKeys.low(limit),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/stock/low', { params: { query: { limit } } })),
    enabled,
  });
}
