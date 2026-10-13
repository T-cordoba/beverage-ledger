import { expect } from 'chai';
import { beforeEach, describe, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MOVEMENT_TYPES } from '@/features/movements/movement-types';
import { useMovementDraft } from '@/features/movements/useMovementDraft';

describe('RF-17 regression - register a transfer', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps both the origin and the destination when they differ', () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('TRANSFER'));

    // Act
    act(() => {
      result.current.setLocationId('location-1');
      result.current.setDestinationLocationId('location-2');
    });

    // Assert
    expect(result.current.locationId, 'origin location').to.equal('location-1');
    expect(result.current.destinationLocationId, 'destination location').to.equal('location-2');
  });

  it('clears the destination when the origin moves onto it', () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('TRANSFER'));
    act(() => {
      result.current.setDestinationLocationId('location-2');
    });

    // Act
    act(() => {
      result.current.setLocationId('location-2');
    });

    // Assert
    expect(result.current.locationId, 'origin location').to.equal('location-2');
    expect(result.current.destinationLocationId, 'destination location').to.equal('');
  });

  it('declares that a transfer needs a destination', () => {
    // Arrange
    const transfer = MOVEMENT_TYPES.TRANSFER;

    // Act
    const { needsDestination } = transfer;

    // Assert
    expect(needsDestination, 'transfer needs destination').to.equal(true);
  });
});
