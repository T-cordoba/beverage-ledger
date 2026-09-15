import { api, unwrap, type Movement, type MovementLineInput, type MovementType } from '@/lib/api';

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

export async function openDraft({ draftId, ...input }: RegisterMovementInput): Promise<Movement> {
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
