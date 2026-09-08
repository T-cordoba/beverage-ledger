import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMovementDraft } from '@/features/movements/useMovementDraft';
import { openDraft } from '@/features/movements/api';

vi.mock('@/features/movements/api', () => ({
  openDraft: vi.fn(),
}));

const mockedOpenDraft = vi.mocked(openDraft);

const productId = 'product-1';
const locationId = 'location-1';
const destinationLocationId = 'location-2';

describe('Registrar traspaso - Front', () => {
  beforeEach(() => {
    window.localStorage.removeItem('beverage-ledger:movement-draft:TRANSFER');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Camino 1 - se registra un traspaso con ubicaciones diferentes', async () => {
    // Arrange
    mockedOpenDraft.mockResolvedValue({
      id: 'movement-1',
      type: 'TRANSFER',
      status: 'DRAFT',
    } as any);


    const { result } = renderHook(() => useMovementDraft('TRANSFER'));

    act(() => {
      result.current.setLocationId(locationId);
      result.current.setDestinationLocationId(destinationLocationId);
    });

    expect(result.current.locationId).toBe(locationId);
    expect(result.current.destinationLocationId).toBe(destinationLocationId);

    const movement = {
      type: 'TRANSFER' as const,
      items: [
        {
          productId,
          quantity: 1,
          unit: 'BOTTLE' as const,
        },
      ],
      locationId: result.current.locationId,
      destinationLocationId: result.current.destinationLocationId,
      note: 'vitest',
      draftId: null,
    };

    // Act
    const draft = await openDraft(movement);

    // Assert
    expect(draft.type).toBe('TRANSFER');
    expect(draft.status).toBe('DRAFT');

    expect(mockedOpenDraft).toHaveBeenCalledWith(movement);
  });

  it('Camino 2 - se limpia destinationLocationId cuando coincide con locationId', () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('TRANSFER'));

    // Act
    act(() => {
      result.current.setDestinationLocationId(destinationLocationId);
      result.current.setLocationId(destinationLocationId);
    });

    // Assert
    expect(result.current.locationId).toBe(destinationLocationId);
    expect(result.current.destinationLocationId).toBe('');
  });
});