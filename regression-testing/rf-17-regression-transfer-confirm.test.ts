import { expect } from 'chai';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, it, vi } from 'vitest';
import { useRegisterMovement, useResumeDraft } from '@/features/movements/api';
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

const items = [{ productId: 'product-1', quantity: 1, unit: 'CASE' as const }];

/** A transfer as the API stores it: every line written once per side. */
const storedTransfer = movementFixture({
  type: 'TRANSFER',
  locationId: 'location-1',
  destinationLocationId: 'location-2',
  items: [
    itemFixture({
      id: 'out-1',
      locationId: 'location-1',
      quantity: 1,
      unit: 'CASE',
      quantityBase: -12,
    }),
    itemFixture({
      id: 'in-1',
      locationId: 'location-2',
      quantity: 1,
      unit: 'CASE',
      quantityBase: 12,
    }),
  ],
});

describe('RF-17 regression - confirm and resume a transfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends both the origin and the destination when the transfer is opened', async () => {
    // Arrange
    client.POST.mockResolvedValueOnce(
      apiReply(201, { data: movementFixture({ type: 'TRANSFER' }) }),
    ).mockResolvedValueOnce(
      apiReply(200, { data: movementFixture({ type: 'TRANSFER', status: 'CONFIRMED' }) }),
    );
    const { wrapper } = withQueryClient();
    const { result } = renderHook(() => useRegisterMovement(), { wrapper });

    // Act
    await act(() =>
      result.current.mutateAsync({
        type: 'TRANSFER',
        items,
        locationId: 'location-1',
        destinationLocationId: 'location-2',
      }),
    );

    // Assert
    expect(client.POST.mock.calls[0], 'open draft call').to.deep.equal([
      '/api/v1/movements',
      {
        body: {
          type: 'TRANSFER',
          items,
          locationId: 'location-1',
          destinationLocationId: 'location-2',
        },
      },
    ]);
  });

  it('resuming a transfer restores only the outgoing half, without doubling the line', async () => {
    // Arrange
    client.GET.mockResolvedValueOnce(apiReply(200, { data: storedTransfer })).mockResolvedValueOnce(
      apiReply(200, { data: pageOf([productFixture()]) }),
    );
    const { wrapper } = withQueryClient();
    const { result } = renderHook(() => useResumeDraft(), { wrapper });

    // Act
    const restored = await act(() => result.current.mutateAsync(storedTransfer.id));

    // Assert
    expect(restored.lines, 'restored lines').to.deep.equal([
      { product: productFixture(), BOTTLE: 0, CASE: 1 },
    ]);
    expect(restored, 'restored locations').to.include({
      movementId: storedTransfer.id,
      locationId: 'location-1',
      destinationLocationId: 'location-2',
    });
  });

  it('resuming asks the catalogue once for each distinct product, inactive ones included', async () => {
    // Arrange
    client.GET.mockResolvedValueOnce(apiReply(200, { data: storedTransfer })).mockResolvedValueOnce(
      apiReply(200, { data: pageOf([productFixture()]) }),
    );
    const { wrapper } = withQueryClient();
    const { result } = renderHook(() => useResumeDraft(), { wrapper });

    // Act
    await act(() => result.current.mutateAsync(storedTransfer.id));

    // Assert
    expect(client.GET.mock.calls[1], 'products call').to.deep.equal([
      '/api/v1/products',
      { params: { query: { productIds: 'product-1', status: 'all', pageSize: 1 } } },
    ]);
  });
});
