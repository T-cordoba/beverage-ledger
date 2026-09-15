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

      expect(result.current.quantityOf(PRODUCTO.id)).toEqual(EMPTY_LINE);
    });

    it('Camino 2 - el producto esta en el borrador y devuelve sus cantidades', () => {
      const { result } = borrador();

      act(() => result.current.adjust(PRODUCTO, 'BOTTLE', 3));

      expect(result.current.quantityOf(PRODUCTO.id)).toMatchObject({ BOTTLE: 3, CASE: 0 });
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

      expect(result.current.occurredAt).toBe('2026-09-14');
      expect(result.current.locationId).toBe('location-1');
      expect(result.current.destinationLocationId).toBe('location-2');
      expect(result.current.reason).toBe('Merma por rotura');
      expect(result.current.note).toBe('Turno noche');
      expect(result.current.pendingMovementId).toBe('movement-1');
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
      expect(result.current.quantityOf(PRODUCTO.id)).toMatchObject({ BOTTLE: 2, CASE: 1 });
      expect(result.current.occurredAt).toBe('2026-09-01');
      expect(result.current.locationId).toBe('location-1');
      expect(result.current.reason).toBe('Conteo fisico');
      expect(result.current.note).toBe('Recogido de la API');
      expect(result.current.pendingMovementId).toBe('movement-7');
      expect(result.current.totalBaseUnits).toBe(14);
    });
  });
});
