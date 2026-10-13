import { expect } from 'chai';
import { beforeEach, describe, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MOVEMENT_TYPES } from '@/features/movements/movement-types';
import { useMovementDraft } from '@/features/movements/useMovementDraft';

const product = {
  id: 'product-1',
  name: 'Test product',
  category: { id: 'category-1', name: 'Spirits' },
  brand: { id: 'brand-1', name: 'Test brand' },
  subcategory: 'Whisky',
  abv: 40,
  origin: 'Scotland',
  age: '12 years',
  caseSize: 12,
  minimumStock: 10,
  isActive: true,
};

describe('RF-18 regression - register an adjustment', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('subtracting 3 bottles keeps a signed quantity of -3', () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('ADJUSTMENT'));

    // Act
    act(() => {
      result.current.adjust(product, 'BOTTLE', -3);
    });

    // Assert
    expect(result.current.quantityOf(product.id).BOTTLE, 'bottle quantity').to.equal(-3);
    expect(result.current.toItems(), 'wire items').to.deep.equal([
      { productId: product.id, quantity: -3, unit: 'BOTTLE' },
    ]);
  });

  it('adding 1 bottle and then subtracting 1 removes the line', () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('ADJUSTMENT'));
    act(() => {
      result.current.adjust(product, 'BOTTLE', 1);
    });

    // Act
    act(() => {
      result.current.adjust(product, 'BOTTLE', -1);
    });

    // Assert
    expect(result.current.lines, 'draft lines').to.have.lengthOf(0);
    expect(result.current.isEmpty, 'draft is empty').to.equal(true);
    expect(result.current.toItems(), 'wire items').to.have.lengthOf(0);
  });

  it('an adjustment requires a reason', () => {
    // Arrange
    const adjustment = MOVEMENT_TYPES.ADJUSTMENT;

    // Act
    const { requiresReason } = adjustment;

    // Assert
    expect(requiresReason, 'requires reason').to.equal(true);
  });
});
