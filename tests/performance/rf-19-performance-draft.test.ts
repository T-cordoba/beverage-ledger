import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BUDGET_MS,
  answer,
  itemsFor,
  lineInputs,
  loadUnderTest,
  median,
  movementDto,
  pageOf,
  productDto,
  queryWrapper,
  session,
  timed,
  trace,
} from './support/perf';

const { fetchMock, useMovementDraft, useResumeDraft, storeSession } = await loadUnderTest();

const PRODUCTS = Array.from({ length: 500 }, (_, i) => productDto(i + 1));

function draft() {
  return renderHook(() => useMovementDraft('OUTBOUND')).result;
}

describe('RF-19 Performance - Guardar y retomar un borrador de movimiento', () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock.mockReset();
    storeSession(session());
  });

  it('capturar 500 productos con botellas y cajas cabe en el presupuesto de transformación', () => {
    // Arrange
    const result = draft();

    // Act
    const start = performance.now();
    act(() => {
      for (const product of PRODUCTS) {
        result.current.adjust(product, 'BOTTLE', 3);
        result.current.adjust(product, 'CASE', 1);
      }
    });
    const ms = performance.now() - start;

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.transform);
    expect(result.current.productCount).toBe(500);
    expect(result.current.totalBaseUnits).toBe(500 * (3 + 12));
  });

  it('convertir un borrador de 500 productos al formato del cable es lineal: 1000 líneas', () => {
    // Arrange
    const result = draft();
    act(() => {
      for (const product of PRODUCTS) {
        result.current.adjust(product, 'BOTTLE', 1);
        result.current.adjust(product, 'CASE', 2);
      }
    });

    // Act
    const samples = Array.from({ length: 20 }, () => {
      const start = performance.now();
      result.current.toItems();
      return performance.now() - start;
    });

    // Assert
    expect(median(samples)).toBeLessThan(BUDGET_MS.transform / 10);
    expect(result.current.toItems()).toHaveLength(1000);
  });

  it('recargar la página restaura un borrador de 500 productos desde localStorage dentro del presupuesto', () => {
    // Arrange
    const first = renderHook(() => useMovementDraft('OUTBOUND'));
    act(() => {
      for (const product of PRODUCTS) first.result.current.adjust(product, 'BOTTLE', 2);
    });
    first.unmount();

    // Act
    const start = performance.now();
    const reloaded = draft();
    const ms = performance.now() - start;

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.transform);
    expect(reloaded.current.productCount).toBe(500);
    expect(reloaded.current.totalBottles).toBe(1000);
  });

  it('retomar un borrador de 500 líneas cuesta 2 peticiones, no una por producto', async () => {
    // Arrange
    const lines = lineInputs(500);
    const movement = movementDto({ id: 'borrador-grande', items: itemsFor(lines) });
    fetchMock
      .mockImplementationOnce(answer(200, movement))
      .mockImplementationOnce(answer(200, pageOf(PRODUCTS)));
    const { wrapper } = queryWrapper();
    const result = renderHook(() => useResumeDraft(), { wrapper }).result;

    // Act
    const { ms, value } = await timed(() =>
      act(async () => result.current.mutateAsync('borrador-grande')),
    );

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.largePayload);
    expect(trace(fetchMock)).toEqual([
      'GET /api/v1/movements/borrador-grande',
      'GET /api/v1/products',
    ]);
    expect(value.lines).toHaveLength(500);
  });
});
