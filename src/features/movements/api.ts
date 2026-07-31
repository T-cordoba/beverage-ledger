'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
// The key modules, not the barrels: stock imports a movements component, so a
// barrel import here would close the cycle.
import { reportKeys } from '@/features/reports/keys';
import { stockKeys } from '@/features/stock/keys';
import {
  api,
  unwrap,
  type Movement,
  type MovementLineInput,
  type MovementListQuery,
  type MovementType,
} from '@/lib/api';
import type { PageParams } from '@/lib/hooks';
import { toDateKey } from '@/lib/utils';
import { EMPTY_LINE, type DraftLine, type RestoredDraft } from './useMovementDraft';

export type MovementQuery = Omit<MovementListQuery, 'page' | 'pageSize'>;

export const movementKeys = {
  all: ['movements'] as const,
  list: (query: MovementQuery, page: PageParams) => ['movements', 'list', query, page] as const,
  recent: (limit: number) => ['movements', 'recent', limit] as const,
  detail: (id: string) => ['movements', 'detail', id] as const,
  openDraft: (type: MovementType, userId: string | undefined) =>
    ['movements', 'open-draft', type, userId ?? 'anonymous'] as const,
};

export function useMovements(query: MovementQuery, page: PageParams) {
  return useQuery({
    queryKey: movementKeys.list(query, page),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/movements', { params: { query: { ...query, ...page } } })),
    // Keeps the list on screen while a changed filter or page is in flight.
    placeholderData: keepPreviousData,
  });
}

/** The dashboard's shortlist: its own entry, so it never shares the history's cache. */
export function useRecentMovements(limit: number, enabled = true) {
  return useQuery({
    queryKey: movementKeys.recent(limit),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/movements', { params: { query: { pageSize: limit } } })),
    enabled,
  });
}

export function useMovement(id: string) {
  return useQuery({
    queryKey: movementKeys.detail(id),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/movements/{id}', { params: { path: { id } } })),
  });
}

/**
 * The draft this user already has open for this type, if any.
 *
 * The local draft only knows about drafts opened on this device, so a confirm
 * that failed on the laptop is invisible from the phone: the movement sits in
 * the history and the capture screen starts blank. This is what lets the screen
 * notice it and offer to pick it up.
 */
export function useOpenDraft(type: MovementType, createdByUserId: string | undefined) {
  return useQuery({
    queryKey: movementKeys.openDraft(type, createdByUserId),
    queryFn: async () => {
      const page = unwrap(
        await api.GET('/api/v1/movements', {
          params: { query: { type, status: 'DRAFT', createdByUserId, pageSize: 1 } },
        }),
      );

      // Null and not the bare lookup: TanStack Query refuses `undefined` as data
      // and logs an error, and "no draft open" is the ordinary answer here.
      return page.data[0] ?? null;
    },
    enabled: createdByUserId !== undefined,
  });
}

/**
 * Confirming or voiding a movement moves stock, and stock feeds the reports, so
 * a write to the ledger has to invalidate all three caches, not just this one.
 */
function invalidateLedger(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: movementKeys.all });
  void queryClient.invalidateQueries({ queryKey: stockKeys.all });
  void queryClient.invalidateQueries({ queryKey: reportKeys.all });
}

export interface RegisterMovementInput {
  type: MovementType;
  items: MovementLineInput[];
  /** Omitted means the default location, which is what the API resolves. */
  locationId?: string;
  /** Only a transfer carries one, and the API rejects it on any other type. */
  destinationLocationId?: string;
  occurredAt?: string;
  note?: string;
  reason?: string;
  /** A draft a previous confirm left behind: updated rather than duplicated. */
  draftId?: string | null;
  /** Called once the draft exists, so a failed confirm can be retried on it. */
  onDraftOpened?: (id: string) => void;
}

/** Statuses that make a draft unusable: someone else confirmed, voided or removed it. */
const GONE_DRAFT_STATUSES = new Set([404, 409]);

async function openDraft({ draftId, ...input }: RegisterMovementInput): Promise<Movement> {
  if (draftId) {
    const updated = await api.PATCH('/api/v1/movements/{id}', {
      params: { path: { id: draftId } },
      body: {
        items: input.items,
        occurredAt: input.occurredAt,
        reason: input.reason,
        note: input.note,
      },
    });

    // Only fall through when the draft is beyond reuse. Any other failure is
    // the user's to see, not something to paper over with a second movement.
    if (!GONE_DRAFT_STATUSES.has(updated.response.status)) return unwrap(updated);
  }

  return unwrap(await api.POST('/api/v1/movements', { body: input }));
}

/**
 * Opens the movement and confirms it, which is two calls by design: the draft
 * does not touch stock, confirming applies the delta in one transaction.
 *
 * A failure on the second call — a dispatch larger than what is on hand, say —
 * leaves the draft behind rather than discarding what the user captured. The
 * caller remembers its id and passes it back on the next attempt, so fixing the
 * quantities reuses that draft instead of littering the ledger with orphans.
 */
export function useRegisterMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegisterMovementInput) => {
      const draft = await openDraft(input);
      input.onDraftOpened?.(draft.id);

      return unwrap(
        await api.POST('/api/v1/movements/{id}/confirm', { params: { path: { id: draft.id } } }),
      );
    },
    onSuccess: () => invalidateLedger(queryClient),
  });
}

/**
 * Reads a draft back into the shape the capture screen edits.
 *
 * Two requests and not one: the ledger line keeps a name snapshot but points at
 * the product by id, and the draft needs the product itself — its case size is
 * what turns cases into units.
 *
 * A transfer stores each product twice, once per side. Only the outgoing half is
 * read back; both carry the same captured quantity, and restoring both would
 * double every line.
 */
export function useResumeDraft() {
  return useMutation({
    mutationFn: async (movementId: string): Promise<RestoredDraft> => {
      const movement = unwrap(
        await api.GET('/api/v1/movements/{id}', { params: { path: { id: movementId } } }),
      );

      const items =
        movement.type === 'TRANSFER'
          ? movement.items.filter((item) => item.quantityBase < 0)
          : movement.items;

      const productIds = [...new Set(items.map((item) => item.productId))].sort();

      const products = unwrap(
        await api.GET('/api/v1/products', {
          params: {
            query: {
              productIds: productIds.join(','),
              status: 'all',
              pageSize: Math.max(productIds.length, 1),
            },
          },
        }),
      ).data;

      const byId = new Map(products.map((product) => [product.id, product]));
      const lines = new Map<string, DraftLine>();

      for (const item of items) {
        const product = byId.get(item.productId);

        // A product the catalogue no longer returns cannot be edited as a line,
        // and guessing its case size would restate the quantity. Dropping it is
        // visible in the totals, which is better than a wrong number.
        if (!product) continue;

        const line = lines.get(product.id) ?? { product, ...EMPTY_LINE };
        lines.set(product.id, { ...line, [item.unit]: line[item.unit] + item.quantity });
      }

      return {
        movementId: movement.id,
        lines: [...lines.values()],
        occurredAt: toDateKey(new Date(movement.occurredAt)),
        locationId: movement.locationId,
        destinationLocationId: movement.destinationLocationId ?? '',
        reason: movement.reason ?? '',
        note: movement.note ?? '',
      };
    },
  });
}

/** Confirms a draft that already exists, from the movement's own page. */
export function useConfirmMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await api.POST('/api/v1/movements/{id}/confirm', { params: { path: { id } } })),
    onSuccess: () => invalidateLedger(queryClient),
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
    onSuccess: () => invalidateLedger(queryClient),
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
