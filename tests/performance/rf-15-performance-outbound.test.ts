import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BUDGET_MS,
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
} from './support/perf';

const { fetchMock, useRegisterMovement, useMovementDraft, storeSession } = await loadUnderTest();

function register() {
  const { wrapper } = queryWrapper();
  return renderHook(() => useRegisterMovement(), { wrapper }).result;
}

describe('RF-15 Performance - Registrar una salida (OUTBOUND)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    movementRouter(fetchMock);
    storeSession(session());
    window.localStorage.clear();
  });

  it('el registro de una salida (crear + confirmar) tiene una mediana bajo el presupuesto de una operación', async () => {
    // Arrange
    const result = register();
    const samples: number[] = [];
    const runs = 20;

    // Act: one warm-up, then the measured runs.
    for (let run = 0; run <= runs; run += 1) {
      const { ms } = await timed(() =>
        act(async () => {
          await result.current.mutateAsync({
            type: 'OUTBOUND',
            items: lineInputs(3),
            locationId: LOCATION_ID,
          });
        }),
      );
      if (run > 0) samples.push(ms);
    }

    // Assert
    expect(median(samples)).toBeLessThan(BUDGET_MS.singleOperation);
    // Two calls per registration, never more: no hidden refresh or retry.
    expect(fetchMock).toHaveBeenCalledTimes((runs + 1) * 2);
  });

  it('una salida con 500 líneas se envía y se confirma dentro del presupuesto de carga grande', async () => {
    // Arrange
    const items = lineInputs(500);
    const result = register();

    // Act
    const { ms, value } = await timed(() =>
      act(async () =>
        result.current.mutateAsync({ type: 'OUTBOUND', items, locationId: LOCATION_ID }),
      ),
    );

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.largePayload);
    expect(value).toMatchObject({ status: 'CONFIRMED' });
    // Volume does not change the number of requests: lines travel in one body.
    expect(trace(fetchMock)).toHaveLength(2);
    const sent = (await (fetchMock.mock.calls[0][0] as Request).clone().json()) as {
      items: unknown[];
    };
    expect(sent.items).toHaveLength(500);
  });

  it('el borrador transforma 1000 productos a líneas de envío dentro del presupuesto de transformación', async () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('OUTBOUND'));
    const products = Array.from({ length: 1000 }, (_, i) => productDto(i + 1));
    act(() => {
      for (const product of products) {
        result.current.adjust(product, 'BOTTLE', 2);
        result.current.adjust(product, 'CASE', 1);
      }
    });

    // Act
    const { ms, value: items } = await timed(() => result.current.toItems());

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.transform);
    expect(items).toHaveLength(2000);
    expect(result.current.totalBaseUnits).toBe(1000 * (2 + 12));
  });
});
