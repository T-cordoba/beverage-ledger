'use client';

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { stockKeys } from './keys';

/** Filters the stock endpoint understands. Anything else would be client-side. */
export interface StockQuery {
  search?: string;
  categoryId?: string;
}

const PAGE_SIZE = 25;
const KARDEX_PAGE_SIZE = 20;

export function useStockLevels(query: StockQuery) {
  return useInfiniteQuery({
    queryKey: stockKeys.levels(query),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET('/api/v1/stock', {
          params: { query: { ...query, limit: PAGE_SIZE, cursor: pageParam } },
        }),
      ),
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}

/** A shortlist, not a page: the endpoint returns the worst offenders and stops. */
export function useLowStock(limit: number, enabled = true) {
  return useQuery({
    queryKey: stockKeys.low(limit),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/stock/low', { params: { query: { limit } } })),
    enabled,
  });
}

export function useKardex(productId: string) {
  return useInfiniteQuery({
    queryKey: stockKeys.kardex(productId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET('/api/v1/stock/{productId}/kardex', {
          params: { path: { productId }, query: { limit: KARDEX_PAGE_SIZE, cursor: pageParam } },
        }),
      ),
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  });
}
