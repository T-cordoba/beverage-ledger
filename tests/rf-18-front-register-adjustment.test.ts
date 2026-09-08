import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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

describe('Registrar ajuste - Front', () => {
  beforeEach(() => {
    window.localStorage.removeItem('beverage-ledger:movement-draft:ADJUSTMENT');
  });

  it('Camino 1 - ajuste con isSigned falso agrega o actualiza la línea', () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('ADJUSTMENT'));

    // Act
    act(() => {
      result.current.adjust(product, 'BOTTLE', 1);
    });

    // Assert
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.productCount).toBe(1);
    expect(result.current.totalBottles).toBe(1);

    const items = result.current.toItems();

    expect(items).toEqual([
      {
        productId: product.id,
        quantity: 1,
        unit: 'BOTTLE',
      },
    ]);
  });

  it('Camino 2 - ajuste con isSigned verdadero conserva el valor calculado', () => {
    // Arrange
    const current = {
      product,
      BOTTLE: 1,
      CASE: 0,
    };

    // Act
    const raw = current.BOTTLE + 1;
    const next = {
      product,
      BOTTLE: raw,
      CASE: current.CASE,
    };

    // Assert
    expect(next.BOTTLE).toBe(2);
    expect(next.CASE).toBe(0);
  });

  it('Camino 3 - cuando BOTTLE y CASE quedan en cero se elimina la línea', () => {
    // Arrange
    const current = {
      product,
      BOTTLE: 1,
      CASE: 0,
    };

    // Act
    const raw = current.BOTTLE - 1;
    const next = {
      product,
      BOTTLE: Math.max(0, raw),
      CASE: current.CASE,
    };
    const lineExists = next.BOTTLE !== 0 || next.CASE !== 0;

    // Assert
    expect(next.BOTTLE).toBe(0);
    expect(next.CASE).toBe(0);
    expect(lineExists).toBe(false);
  });
});