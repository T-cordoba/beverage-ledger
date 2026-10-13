import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BUDGET_MS,
  DESTINATION_ID,
  LOCATION_ID,
  lineInputs,
  loadUnderTest,
  median,
  movementRouter,
  productDto,
  queryWrapper,
  session,
  timed,
  trace,
  uuid,
} from './support/perf';

const { fetchMock, useRegisterMovement, useMovementDraft, storeSession } = await loadUnderTest();

function register() {
  const { wrapper } = queryWrapper();
  return renderHook(() => useRegisterMovement(), { wrapper }).result;
}

describe('RF-17 Performance - Registrar un traspaso (TRANSFER)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    movementRouter(fetchMock);
    storeSession(session());
    window.localStorage.clear();
  });

  it('un traspaso de 300 líneas entre dos bodegas se registra dentro del presupuesto de carga grande', async () => {
    // Arrange
    const items = lineInputs(300);
    const result = register();

    // Act
    const { ms, value } = await timed(() =>
      act(async () =>
        result.current.mutateAsync({
          type: 'TRANSFER',
          items,
          locationId: LOCATION_ID,
          destinationLocationId: DESTINATION_ID,
        }),
      ),
    );

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.largePayload);
    expect(value).toMatchObject({ status: 'CONFIRMED' });
    expect(trace(fetchMock)).toHaveLength(2);
    const sent = (await (fetchMock.mock.calls[0][0] as Request).clone().json()) as {
      destinationLocationId: string;
      items: unknown[];
    };
    expect(sent.destinationLocationId).toBe(DESTINATION_ID);
    expect(sent.items).toHaveLength(300);
  });

  it('30 reintentos sobre un borrador existente usan PATCH y su mediana queda bajo el presupuesto de una operación', async () => {
    // Arrange
    const result = register();
    const samples: number[] = [];

    // Act
    for (let i = 0; i < 30; i += 1) {
      const { ms } = await timed(() =>
        act(async () => {
          await result.current.mutateAsync({
            type: 'TRANSFER',
            items: lineInputs(10),
            locationId: LOCATION_ID,
            destinationLocationId: DESTINATION_ID,
            draftId: uuid(i + 1, '1'),
          });
        }),
      );
      samples.push(ms);
    }

    // Assert
    expect(median(samples)).toBeLessThan(BUDGET_MS.singleOperation);
    const calls = trace(fetchMock);
    expect(calls).toHaveLength(60);
    // Retrying never opens a second movement: no orphan drafts under load.
    expect(calls).not.toContain('POST /api/v1/movements');
  });

  it('el borrador de traspaso con 500 productos y 200 cambios de bodega se mantiene en el presupuesto de transformación', async () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('TRANSFER'));
    const products = Array.from({ length: 500 }, (_, i) => productDto(i + 1, 6));
    act(() => {
      for (const product of products) result.current.adjust(product, 'CASE', 2);
    });

    // Act
    const { ms } = await timed(() =>
      act(() => {
        for (let i = 0; i < 100; i += 1) {
          result.current.setDestinationLocationId(DESTINATION_ID);
          // Picking the destination as origin gives the destination up.
          result.current.setLocationId(DESTINATION_ID);
        }
      }),
    );
    const items = result.current.toItems();

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.transform);
    expect(result.current.locationId).toBe(DESTINATION_ID);
    expect(result.current.destinationLocationId).toBe('');
    expect(items).toHaveLength(500);
    expect(result.current.totalBaseUnits).toBe(500 * 2 * 6);
  });
});
