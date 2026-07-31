'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stockKeys } from '@/features/stock/keys';
import {
  api,
  assertOk,
  unwrap,
  type CreateLocationInput,
  type UpdateLocationInput,
} from '@/lib/api';

export const locationKeys = {
  all: ['locations'] as const,
};

/**
 * Every location in one request, capped at the page size the API allows.
 *
 * They are physical warehouses, so the set is small and bounded, and every
 * consumer is a picker that needs the whole list to render one option each.
 */
const PAGE_SIZE = 100;

export function useLocations() {
  return useQuery({
    queryKey: locationKeys.all,
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/locations', { params: { query: { pageSize: PAGE_SIZE } } })),
    // They change about never, and a stale picker is worse than one extra fetch.
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLocationInput) =>
      unwrap(await api.POST('/api/v1/locations', { body: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: locationKeys.all }),
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateLocationInput }) =>
      unwrap(await api.PATCH('/api/v1/locations/{id}', { params: { path: { id } }, body: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: locationKeys.all }),
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) =>
      assertOk(await api.DELETE('/api/v1/locations/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: locationKeys.all });
      // Stock is read per location, so a deleted one must not stay in a cache.
      void queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });
}
