import { expect } from 'chai';
import { beforeEach, describe, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMovementDraft } from '@/features/movements/useMovementDraft';

const product = {
  id: 'product-1',
  name: 'Test product',
  category: { id: 'category-1', name: 'Spirits' },
  brand: { id: 'brand-1', name: 'Test brand' },
  subcategory: 'Rum',
  abv: 40,
  origin: 'Colombia',
  age: '5 years',
  caseSize: 12,
  minimumStock: 10,
  isActive: true,
};

describe('RF-16 regression - register an inbound movement', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('adding 6 bottles totals 6 bottles and maps to one BOTTLE item', () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('INBOUND'));

    // Act
    act(() => {
      result.current.adjust(product, 'BOTTLE', 6);
    });

    // Assert
    expect(result.current.totalBottles, 'total bottles').to.equal(6);
    expect(result.current.toItems(), 'wire items').to.deep.equal([
      { productId: product.id, quantity: 6, unit: 'BOTTLE' },
    ]);
  });

  it('adding 3 cases totals 36 base units', () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('INBOUND'));

    // Act
    act(() => {
      result.current.adjust(product, 'CASE', 3);
    });

    // Assert
    expect(result.current.totalCases, 'total cases').to.equal(3);
    expect(result.current.totalBaseUnits, 'total base units').to.equal(36);
  });

  it('subtracting more bottles than captured removes the line instead of going negative', () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('INBOUND'));
    act(() => {
      result.current.adjust(product, 'BOTTLE', 2);
    });

    // Act
    act(() => {
      result.current.adjust(product, 'BOTTLE', -5);
    });

    // Assert
    expect(result.current.quantityOf(product.id).BOTTLE, 'bottle quantity').to.equal(0);
    expect(result.current.lines, 'draft lines').to.have.lengthOf(0);
    expect(result.current.isEmpty, 'draft is empty').to.equal(true);
  });
});
