import { expect } from 'chai';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, it, vi } from 'vitest';
import { movementKeys, useRegisterMovement } from '@/features/movements/api';
import { reportKeys } from '@/features/reports/keys';
import { stockKeys } from '@/features/stock/keys';
import { ApiError } from '@/lib/api/errors';
import {
  apiReply,
  invalidatedKeys,
  movementFixture,
  withQueryClient,
} from './support/movements-harness';

const { client } = vi.hoisted(() => ({
  client: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: client,
}));

const items = [{ productId: 'product-1', quantity: 2, unit: 'CASE' as const }];

describe('RF-15 regression - confirm an outbound movement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the draft and then confirms that same draft', async () => {
    // Arrange
    client.POST.mockResolvedValueOnce(
      apiReply(201, { data: movementFixture() }),
    ).mockResolvedValueOnce(apiReply(200, { data: movementFixture({ status: 'CONFIRMED' }) }));
    const { wrapper } = withQueryClient();
    const { result } = renderHook(() => useRegisterMovement(), { wrapper });

    // Act
    const confirmed = await act(() =>
      result.current.mutateAsync({ type: 'OUTBOUND', items, locationId: 'location-1' }),
    );

    // Assert
    expect(client.POST.mock.calls, 'POST calls').to.deep.equal([
      ['/api/v1/movements', { body: { type: 'OUTBOUND', items, locationId: 'location-1' } }],
      ['/api/v1/movements/{id}/confirm', { params: { path: { id: 'movement-1' } } }],
    ]);
    expect(confirmed.status, 'confirmed status').to.equal('CONFIRMED');
  });

  it('a confirm refused for lack of stock rejects and still reports the draft id', async () => {
    // Arrange
    client.POST.mockResolvedValueOnce(
      apiReply(201, { data: movementFixture() }),
    ).mockResolvedValueOnce(
      apiReply(409, { error: { statusCode: 409, message: 'Insufficient stock' } }),
    );
    const onDraftOpened = vi.fn();
    const { wrapper } = withQueryClient();
    const { result } = renderHook(() => useRegisterMovement(), { wrapper });

    // Act
    let error: unknown;
    await act(async () => {
      error = await result.current
        .mutateAsync({ type: 'OUTBOUND', items, onDraftOpened })
        .catch((e: unknown) => e);
    });

    // Assert
    expect(error, 'thrown error')
      .to.be.instanceOf(ApiError)
      .and.to.include({ status: 409, message: 'Insufficient stock' });
    expect(onDraftOpened.mock.calls, 'reported draft ids').to.deep.equal([['movement-1']]);
  });

  it('a confirmed outbound invalidates the movements, stock and reports caches', async () => {
    // Arrange
    client.POST.mockResolvedValueOnce(
      apiReply(201, { data: movementFixture() }),
    ).mockResolvedValueOnce(apiReply(200, { data: movementFixture({ status: 'CONFIRMED' }) }));
    const { queryClient, wrapper } = withQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRegisterMovement(), { wrapper });

    // Act
    await act(() => result.current.mutateAsync({ type: 'OUTBOUND', items }));

    // Assert
    expect(invalidatedKeys(invalidate.mock.calls), 'invalidated keys').to.deep.equal([
      movementKeys.all,
      stockKeys.all,
      reportKeys.all,
    ]);
  });
});
