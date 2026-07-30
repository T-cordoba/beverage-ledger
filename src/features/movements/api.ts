'use client';

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, unwrap, type MovementListQuery, type MovementLineInput } from '@/lib/api';

export type MovementQuery = Omit<MovementListQuery, 'cursor'>;

export const movementKeys = {
  all: ['movements'] as const,
  list: (query: MovementQuery) => ['movements', 'list', query] as const,
  detail: (id: string) => ['movements', 'detail', id] as const,
};

const PAGE_SIZE = 20;

export function useMovements(query: MovementQuery) {
  return useInfiniteQuery({
    queryKey: movementKeys.list(query),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET('/api/v1/movements', {
          params: { query: { ...query, limit: PAGE_SIZE, cursor: pageParam } },
        }),
      ),
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    // Keeps the list on screen while a changed filter is in flight.
    placeholderData: keepPreviousData,
  });
}

export function useMovement(id: string) {
  return useQuery({
    queryKey: movementKeys.detail(id),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/movements/{id}', { params: { path: { id } } })),
  });
}

export interface RegisterMovementInput {
  type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT';
  items: MovementLineInput[];
  occurredAt?: string;
  note?: string;
  reason?: string;
}

/**
 * Opens the movement and confirms it, which is two calls by design: the draft
 * does not touch stock, confirming applies the delta in one transaction.
 *
 * A failure on the second call — a dispatch larger than what is on hand, say —
 * leaves the draft behind rather than discarding what the user captured.
 */
export function useRegisterMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegisterMovementInput) => {
      const draft = unwrap(await api.POST('/api/v1/movements', { body: input }));

      return unwrap(
        await api.POST('/api/v1/movements/{id}/confirm', { params: { path: { id: draft.id } } }),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: movementKeys.all }),
  });
}

export function useCancelMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      unwrap(
        await api.POST('/api/v1/movements/{id}/cancel', {
          params: { path: { id } },
          body: { reason },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: movementKeys.all }),
  });
}

/**
 * The PDF is behind the same bearer token as everything else, so it cannot be a
 * plain link: it goes through the client and reaches the browser as a blob.
 */
export async function downloadMovementPdf(id: string, code: string): Promise<void> {
  const result = await api.GET('/api/v1/movements/{id}/pdf', {
    params: { path: { id } },
    parseAs: 'blob',
  });

  const blob = unwrap(result) as unknown as Blob;
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${code}.pdf`;
  link.click();

  URL.revokeObjectURL(url);
}
