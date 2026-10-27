import { expect } from 'chai';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, it, vi } from 'vitest';
import { movementKeys, useCancelMovement } from '@/features/movements/api';
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

const cancellation = { id: 'movement-1', reason: 'Captured twice' };

describe('RF-20 regression - cancel a confirmed movement through the mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the cancel route with the movement id and the reason', async () => {
    // Arrange
    client.POST.mockResolvedValue(
      apiReply(200, { data: movementFixture({ status: 'CANCELLED' }) }),
    );
    const { wrapper } = withQueryClient();
    const { result } = renderHook(() => useCancelMovement(), { wrapper });

    // Act
    const cancelled = await act(() => result.current.mutateAsync(cancellation));

    // Assert
    expect(client.POST.mock.calls, 'POST calls').to.deep.equal([
      [
        '/api/v1/movements/{id}/cancel',
        { params: { path: { id: cancellation.id } }, body: { reason: cancellation.reason } },
      ],
    ]);
    expect(cancelled.status, 'movement status').to.equal('CANCELLED');
  });

  it('a cancellation invalidates the movements, stock and reports caches', async () => {
    // Arrange
    client.POST.mockResolvedValue(
      apiReply(200, { data: movementFixture({ status: 'CANCELLED' }) }),
    );
    const { queryClient, wrapper } = withQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCancelMovement(), { wrapper });

    // Act
    await act(() => result.current.mutateAsync(cancellation));

    // Assert
    expect(invalidatedKeys(invalidate.mock.calls), 'invalidated keys').to.deep.equal([
      movementKeys.all,
      stockKeys.all,
      reportKeys.all,
    ]);
  });

  it('a refused cancellation rejects with ApiError and leaves the caches alone', async () => {
    // Arrange
    client.POST.mockResolvedValue(
      apiReply(409, { error: { statusCode: 409, message: 'Movement is already cancelled' } }),
    );
    const { queryClient, wrapper } = withQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCancelMovement(), { wrapper });

    // Act
    let error: unknown;
    await act(async () => {
      error = await result.current.mutateAsync(cancellation).catch((e: unknown) => e);
    });

    // Assert
    expect(error, 'thrown error')
      .to.be.instanceOf(ApiError)
      .and.to.include({ status: 409, message: 'Movement is already cancelled' });
    expect(invalidate.mock.calls, 'invalidations').to.have.lengthOf(0);
  });
});
