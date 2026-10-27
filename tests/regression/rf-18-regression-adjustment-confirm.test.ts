import { expect } from 'chai';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, it, vi } from 'vitest';
import { useRegisterMovement, useResumeDraft } from '@/features/movements/api';
import { openDraft } from '@/features/movements/open-draft';
import { ApiError } from '@/lib/api/errors';
import {
  apiReply,
  itemFixture,
  movementFixture,
  pageOf,
  productFixture,
  withQueryClient,
} from './support/movements-harness';

const { client } = vi.hoisted(() => ({
  client: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: client,
}));

const items = [{ productId: 'product-1', quantity: -3, unit: 'BOTTLE' as const }];
const reason = 'Broken bottles';

describe('RF-18 regression - confirm and resume an adjustment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the signed quantity and the reason when the adjustment is opened', async () => {
    // Arrange
    client.POST.mockResolvedValueOnce(
      apiReply(201, { data: movementFixture({ type: 'ADJUSTMENT' }) }),
    ).mockResolvedValueOnce(
      apiReply(200, { data: movementFixture({ type: 'ADJUSTMENT', status: 'CONFIRMED' }) }),
    );
    const { wrapper } = withQueryClient();
    const { result } = renderHook(() => useRegisterMovement(), { wrapper });

    // Act
    await act(() => result.current.mutateAsync({ type: 'ADJUSTMENT', items, reason }));

    // Assert
    expect(client.POST.mock.calls[0], 'open draft call').to.deep.equal([
      '/api/v1/movements',
      { body: { type: 'ADJUSTMENT', items, reason } },
    ]);
  });

  it('a retry on the leftover draft carries the reason in the update', async () => {
    // Arrange
    client.PATCH.mockResolvedValue(
      apiReply(200, { data: movementFixture({ type: 'ADJUSTMENT' }) }),
    );

    // Act
    await openDraft({ type: 'ADJUSTMENT', items, reason, draftId: 'movement-1' });

    // Assert
    expect(client.PATCH.mock.calls[0][1], 'PATCH options').to.deep.equal({
      params: { path: { id: 'movement-1' } },
      body: { items, occurredAt: undefined, reason, note: undefined },
    });
  });

  it('a missing reason surfaces the API validation message and opens nothing else', async () => {
    // Arrange
    client.POST.mockResolvedValue(
      apiReply(400, { error: { statusCode: 400, message: ['reason should not be empty'] } }),
    );

    // Act
    const error = await openDraft({ type: 'ADJUSTMENT', items }).catch((e: unknown) => e);

    // Assert
    expect(error, 'thrown error').to.be.instanceOf(ApiError).and.to.include({ status: 400 });
    expect((error as ApiError).messages, 'validation messages').to.deep.equal([
      'reason should not be empty',
    ]);
    expect(client.POST.mock.calls, 'POST calls').to.have.lengthOf(1);
  });

  it('resuming an adjustment keeps the negative quantity and the reason', async () => {
    // Arrange
    const stored = movementFixture({
      type: 'ADJUSTMENT',
      reason,
      items: [itemFixture({ quantity: -3, unit: 'BOTTLE', quantityBase: -3 })],
    });
    client.GET.mockResolvedValueOnce(apiReply(200, { data: stored })).mockResolvedValueOnce(
      apiReply(200, { data: pageOf([productFixture()]) }),
    );
    const { wrapper } = withQueryClient();
    const { result } = renderHook(() => useResumeDraft(), { wrapper });

    // Act
    const restored = await act(() => result.current.mutateAsync(stored.id));

    // Assert
    expect(restored.lines, 'restored lines').to.deep.equal([
      { product: productFixture(), BOTTLE: -3, CASE: 0 },
    ]);
    expect(restored, 'restored fields').to.include({ reason, note: '', destinationLocationId: '' });
  });
});
