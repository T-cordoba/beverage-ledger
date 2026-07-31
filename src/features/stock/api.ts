'use client';

import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import type { PageParams } from '@/lib/hooks';
import { stockKeys } from './keys';

/** Well under the 200 the endpoint accepts, and it matches how the picker pages. */
const AVAILABILITY_CHUNK = 50;

/** Filters the stock endpoint understands. Anything else would be client-side. */
export interface StockQuery {
  search?: string;
  categoryId?: string;
  /** Omitted means the default location, which is what the API resolves. */
  locationId?: string;
}

export function useStockLevels(query: StockQuery, page: PageParams) {
  return useQuery({
    queryKey: stockKeys.levels(query, page),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/stock', { params: { query: { ...query, ...page } } })),
    placeholderData: keepPreviousData,
  });
}

/**
 * What is on hand for a known set of products, at one location.
 *
 * Asks by id rather than paging the catalogue: the capture screen already knows
 * which products it is showing, and needs to know how many of each it may take
 * out before the user asks for more than exists.
 */
export function useStockAvailability(
  productIds: string[],
  locationId?: string,
  enabled = true,
): { levels: Map<string, number>; isReady: boolean } {
  // Chunked, and each chunk is its own query: the picker grows by a page at a
  // time, so this keeps the URL bounded and lets an already-fetched page stay
  // cached instead of refetching everything whenever one more product loads.
  const chunks: string[][] = [];
  const ids = [...productIds].sort();

  for (let index = 0; index < ids.length; index += AVAILABILITY_CHUNK) {
    chunks.push(ids.slice(index, index + AVAILABILITY_CHUNK));
  }

  const results = useQueries({
    queries: chunks.map((chunk) => ({
      queryKey: stockKeys.availability(chunk, locationId),
      queryFn: async () =>
        unwrap(
          await api.GET('/api/v1/stock', {
            params: {
              query: {
                productIds: chunk.join(','),
                pageSize: chunk.length,
                ...(locationId ? { locationId } : {}),
              },
            },
          }),
        ),
      enabled,
    })),
  });

  const levels = new Map<string, number>();

  for (const result of results) {
    for (const level of result.data?.data ?? []) {
      levels.set(level.productId, level.quantityBase);
    }
  }

  return {
    levels,
    isReady: enabled && results.length > 0 && results.every((one) => one.isSuccess),
  };
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

export function useKardex(productId: string, locationId: string | undefined, page: PageParams) {
  return useQuery({
    queryKey: stockKeys.kardex(productId, locationId, page),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/v1/stock/{productId}/kardex', {
          params: {
            path: { productId },
            query: { ...page, ...(locationId ? { locationId } : {}) },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}
