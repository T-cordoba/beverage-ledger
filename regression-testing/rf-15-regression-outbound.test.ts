import { expect } from 'chai';
import { beforeEach, describe, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMovementDraft } from '@/features/movements/useMovementDraft';

const product = {
  id: 'product-1',
  name: 'Producto de prueba',
  category: { id: 'category-1', name: 'Bebidas' },
  brand: { id: 'brand-1', name: 'Marca prueba' },
  subcategory: 'Destilados',
  abv: 40,
  origin: 'Argentina',
  age: '5 años',
  caseSize: 12,
  minimumStock: 10,
  isActive: true,
};

describe('RF-15 regression - register an outbound movement', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('adding 2 cases totals 2 cases and 24 base units', () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('OUTBOUND'));

    // Act
    act(() => {
      result.current.adjust(product, 'CASE', 2);
    });

    // Assert
    expect(result.current.totalCases, 'total cases').to.equal(2);
    expect(result.current.totalBaseUnits, 'total base units').to.equal(24);
  });

  it('toItems returns one CASE line with quantity 2', () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('OUTBOUND'));
    act(() => {
      result.current.adjust(product, 'CASE', 2);
    });

    // Act
    const items = result.current.toItems();

    // Assert
    expect(items, 'wire items').to.deep.equal([
      { productId: product.id, quantity: 2, unit: 'CASE' },
    ]);
  });

  it('subtracting more bottles than captured removes the line instead of going negative', () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('OUTBOUND'));
    act(() => {
      result.current.adjust(product, 'BOTTLE', 1);
    });

    // Act
    act(() => {
      result.current.adjust(product, 'BOTTLE', -3);
    });

    // Assert
    expect(result.current.quantityOf(product.id).BOTTLE, 'bottle quantity').to.equal(0);
    expect(result.current.lines, 'draft lines').to.have.lengthOf(0);
    expect(result.current.isEmpty, 'draft is empty').to.equal(true);
  });
});
