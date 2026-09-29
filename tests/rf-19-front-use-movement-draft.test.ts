import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_LINE, useMovementDraft } from '@/features/movements/useMovementDraft';
import type { Product } from '@/lib/api';

const PRODUCTO = {
  id: 'product-1',
  name: 'Absolut Blue 750ml',
  category: { id: 'category-1', name: 'Vodka' },
  brand: { id: 'brand-1', name: 'Absolut' },
  subcategory: 'Destilados',
  abv: 40,
  origin: 'Suecia',
  age: null,
  caseSize: 12,
  minimumStock: 10,
  isActive: true,
} as unknown as Product;

const borrador = () => renderHook(() => useMovementDraft('OUTBOUND'));

describe('useMovementDraft', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('quantityOf', () => {
    it('Camino 1 - el producto no esta en el borrador y devuelve la linea vacia', () => {
      const { result } = borrador();

      const linea = result.current.quantityOf(PRODUCTO.id);

      expect(linea).toBe(EMPTY_LINE);
    });

    it('Camino 2 - el producto esta en el borrador y devuelve sus cantidades', () => {
      const { result } = borrador();

      act(() => result.current.adjust(PRODUCTO, 'BOTTLE', 3));

      const linea = result.current.quantityOf(PRODUCTO.id);

      expect(linea).toMatchObject({ BOTTLE: 3, CASE: 0 });
      expect(linea).toHaveProperty('product.caseSize', 12);
    });
  });

  describe('adjust', () => {
    it('Camino 1 - las dos unidades quedan en cero y la linea se retira', () => {
      const { result } = borrador();

      act(() => result.current.adjust(PRODUCTO, 'BOTTLE', 2));
      act(() => result.current.adjust(PRODUCTO, 'BOTTLE', -2));

      expect(result.current.lines).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    });

    it('Camino 2 - queda otra unidad en el producto y la linea se conserva', () => {
      const { result } = borrador();

      act(() => result.current.adjust(PRODUCTO, 'CASE', 1));
      act(() => result.current.adjust(PRODUCTO, 'BOTTLE', 1));
      act(() => result.current.adjust(PRODUCTO, 'BOTTLE', -1));

      expect(result.current.lines).toHaveLength(1);
      expect(result.current.quantityOf(PRODUCTO.id)).toMatchObject({ BOTTLE: 0, CASE: 1 });
      expect(result.current.totalBaseUnits).toBe(12);
    });
  });

  describe('campos del movimiento', () => {
    it('Camino 1 - se fijan fecha, bodegas, motivo, nota y borrador pendiente', () => {
      const { result } = borrador();

      act(() => result.current.setOccurredAt('2026-09-14'));
      act(() => result.current.setLocationId('location-1'));
      act(() => result.current.setDestinationLocationId('location-2'));
      act(() => result.current.setReason('Merma por rotura'));
      act(() => result.current.setNote('Turno noche'));
      act(() => result.current.rememberPending('movement-1'));

      expect(result.current).toMatchObject({
        occurredAt: '2026-09-14',
        locationId: 'location-1',
        destinationLocationId: 'location-2',
        reason: 'Merma por rotura',
        note: 'Turno noche',
        pendingMovementId: 'movement-1',
      });
    });
  });

  describe('restore', () => {
    it('Camino 1 - llega un borrador de la API y reemplaza el estado completo', () => {
      const { result } = borrador();

      act(() => result.current.adjust(PRODUCTO, 'BOTTLE', 9));
      act(() =>
        result.current.restore({
          movementId: 'movement-7',
          lines: [{ product: PRODUCTO, BOTTLE: 2, CASE: 1 }],
          occurredAt: '2026-09-01',
          locationId: 'location-1',
          destinationLocationId: '',
          reason: 'Conteo fisico',
          note: 'Recogido de la API',
        }),
      );

      expect(result.current.lines).toHaveLength(1);
      expect(result.current.lines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            BOTTLE: 2,
            CASE: 1,
            product: expect.objectContaining({ id: PRODUCTO.id, caseSize: 12 }),
          }),
        ]),
      );
      expect(result.current.quantityOf(PRODUCTO.id)).toMatchObject({ BOTTLE: 2, CASE: 1 });
      expect(result.current).toMatchObject({
        occurredAt: '2026-09-01',
        locationId: 'location-1',
        reason: 'Conteo fisico',
        note: 'Recogido de la API',
        pendingMovementId: 'movement-7',
        totalBaseUnits: 14,
      });
    });
  });
});
