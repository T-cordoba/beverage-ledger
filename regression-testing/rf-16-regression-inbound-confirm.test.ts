import { expect } from 'chai';
import { beforeEach, describe, it, vi } from 'vitest';
import { openDraft } from '@/features/movements/open-draft';
import { ApiError } from '@/lib/api/errors';
import { apiReply, movementFixture } from './support/movements-harness';

const { client } = vi.hoisted(() => ({
  client: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: client,
}));

const items = [{ productId: 'product-1', quantity: 6, unit: 'BOTTLE' as const }];
const leftoverDraftId = 'movement-1';

describe('RF-16 regression - retry an inbound movement on its leftover draft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a retry updates the leftover draft and never opens a second one', async () => {
    // Arrange
    client.PATCH.mockResolvedValue(
      apiReply(200, { data: movementFixture({ id: leftoverDraftId, type: 'INBOUND' }) }),
    );

    // Act
    const draft = await openDraft({
      type: 'INBOUND',
      items,
      note: 'Supplier delivery',
      draftId: leftoverDraftId,
    });

    // Assert
    expect(client.PATCH.mock.calls, 'PATCH calls').to.deep.equal([
      [
        '/api/v1/movements/{id}',
        {
          params: { path: { id: leftoverDraftId } },
          body: { items, occurredAt: undefined, reason: undefined, note: 'Supplier delivery' },
        },
      ],
    ]);
    expect(client.POST.mock.calls, 'POST calls').to.have.lengthOf(0);
    expect(draft.id, 'draft id').to.equal(leftoverDraftId);
  });

  it.each([404, 409])(
    'a leftover draft answered with %i is replaced by a newly opened one',
    async (status) => {
      // Arrange
      client.PATCH.mockResolvedValue(
        apiReply(status, { error: { statusCode: status, message: 'Gone' } }),
      );
      client.POST.mockResolvedValue(
        apiReply(201, { data: movementFixture({ id: 'movement-2', type: 'INBOUND' }) }),
      );

      // Act
      const draft = await openDraft({ type: 'INBOUND', items, draftId: leftoverDraftId });

      // Assert
      expect(client.POST.mock.calls, 'POST calls').to.deep.equal([
        ['/api/v1/movements', { body: { type: 'INBOUND', items } }],
      ]);
      expect(draft.id, 'draft id').to.equal('movement-2');
    },
  );

  it('a validation failure on the retry surfaces instead of opening a second draft', async () => {
    // Arrange
    client.PATCH.mockResolvedValue(
      apiReply(400, {
        error: { statusCode: 400, message: ['quantity must be a positive number'] },
      }),
    );

    // Act
    const error = await openDraft({ type: 'INBOUND', items, draftId: leftoverDraftId }).catch(
      (e: unknown) => e,
    );

    // Assert
    expect(error, 'thrown error').to.be.instanceOf(ApiError).and.to.include({ status: 400 });
    expect((error as ApiError).messages, 'validation messages').to.deep.equal([
      'quantity must be a positive number',
    ]);
    expect(client.POST.mock.calls, 'POST calls').to.have.lengthOf(0);
  });
});
