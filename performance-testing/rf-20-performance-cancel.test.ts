import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BUDGET_MS,
  loadUnderTest,
  median,
  movementRouter,
  queryWrapper,
  session,
  timed,
  trace,
  uuid,
} from './support/perf';

const { fetchMock, useCancelMovement, movementKeys, storeSession } = await loadUnderTest();

function cancel() {
  const harness = queryWrapper();
  const { result } = renderHook(() => useCancelMovement(), { wrapper: harness.wrapper });
  return { result, client: harness.client };
}

describe('RF-20 Performance - Anular un movimiento confirmado', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    movementRouter(fetchMock);
    storeSession(session());
  });

  it('anular un movimiento tiene una mediana bajo el presupuesto de una operación en 30 repeticiones', async () => {
    // Arrange
    const { result } = cancel();
    const samples: number[] = [];

    // Act: one warm-up, then the measured runs.
    for (let run = 0; run <= 30; run += 1) {
      const { ms } = await timed(() =>
        act(async () => {
          await result.current.mutateAsync({
            id: uuid(run + 1, '1'),
            reason: 'Registro duplicado',
          });
        }),
      );
      if (run > 0) samples.push(ms);
    }

    // Assert
    expect(median(samples)).toBeLessThan(BUDGET_MS.singleOperation);
    // One request per void: cancelling is a single call.
    expect(fetchMock).toHaveBeenCalledTimes(31);
  });

  it('25 anulaciones concurrentes de movimientos distintos se resuelven todas dentro del presupuesto de lote', async () => {
    // Arrange
    const { result } = cancel();
    const ids = Array.from({ length: 25 }, (_, i) => uuid(i + 1, '1'));

    // Act
    const { ms, value: movements } = await timed(() =>
      act(async () =>
        Promise.all(ids.map((id) => result.current.mutateAsync({ id, reason: `Anulación ${id}` }))),
      ),
    );

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.batch);
    expect(movements.map((movement) => movement.id)).toEqual(ids);
    expect(movements.every((movement) => movement.status === 'CANCELLED')).toBe(true);
    expect(new Set(trace(fetchMock))).toEqual(
      new Set(ids.map((id) => `POST /api/v1/movements/${id}/cancel`)),
    );
  });

  it('con 900 consultas en caché, la invalidación tras anular cubre el ledger dentro del presupuesto de lote', async () => {
    // Arrange: 300 each of movements, stock, reports, plus 100 unrelated.
    const { result, client } = cancel();
    for (let i = 0; i < 300; i += 1) {
      client.setQueryData(movementKeys.detail(uuid(i, '1')), { i });
      client.setQueryData(['stock', 'levels', i], { i });
      client.setQueryData(['reports', 'consumption', i], { i });
    }
    for (let i = 0; i < 100; i += 1) client.setQueryData(['catalogue', i], { i });

    // Act
    const { ms } = await timed(() =>
      act(async () => {
        await result.current.mutateAsync({ id: uuid(1, '1'), reason: 'Error de captura' });
      }),
    );

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.batch);
    const queries = client.getQueryCache().getAll();
    const invalidated = queries.filter((query) => query.state.isInvalidated);
    expect(invalidated).toHaveLength(900);
    expect(
      queries
        .filter((query) => query.queryKey[0] === 'catalogue')
        .some((q) => q.state.isInvalidated),
    ).toBe(false);
  });
});
