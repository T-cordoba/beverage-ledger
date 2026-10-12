import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BUDGET_MS,
  LOCATION_ID,
  answer,
  itemsFor,
  lineInputs,
  loadUnderTest,
  movementDto,
  movementRouter,
  queryWrapper,
  session,
  timed,
  trace,
} from './support/perf';

const { fetchMock, useRegisterMovement, storeSession } = await loadUnderTest();

function register() {
  const { wrapper } = queryWrapper();
  return renderHook(() => useRegisterMovement(), { wrapper }).result;
}

describe('RF-16 Performance - Registrar una entrada (INBOUND)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    movementRouter(fetchMock);
    storeSession(session());
  });

  it('50 entradas registradas una tras otra terminan dentro del presupuesto de lote con 2 llamadas cada una', async () => {
    // Arrange
    const result = register();
    const count = 50;

    // Act
    const { ms } = await timed(async () => {
      for (let i = 0; i < count; i += 1) {
        await act(async () => {
          await result.current.mutateAsync({ type: 'INBOUND', items: lineInputs(5) });
        });
      }
    });

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.batch);
    expect(fetchMock).toHaveBeenCalledTimes(count * 2);
  });

  it('20 entradas concurrentes se resuelven todas, cada una con su propio movimiento', async () => {
    // Arrange
    const result = register();
    const count = 20;

    // Act
    const { ms, value: movements } = await timed(() =>
      act(async () =>
        Promise.all(
          Array.from({ length: count }, (_, i) =>
            result.current.mutateAsync({
              type: 'INBOUND',
              items: lineInputs(i + 1),
              locationId: LOCATION_ID,
            }),
          ),
        ),
      ),
    );

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.batch);
    expect(movements).toHaveLength(count);
    expect(new Set(movements.map((movement) => movement.id)).size).toBe(count);
    expect(movements.every((movement) => movement.status === 'CONFIRMED')).toBe(true);
    const calls = trace(fetchMock);
    expect(calls.filter((call) => call === 'POST /api/v1/movements')).toHaveLength(count);
    expect(calls.filter((call) => call.endsWith('/confirm'))).toHaveLength(count);
  });

  it('procesa una respuesta de confirmación con 2000 líneas dentro del presupuesto de carga grande', async () => {
    // Arrange
    const items = lineInputs(2000);
    const draft = movementDto({ type: 'INBOUND', items: itemsFor(items) });
    const confirmed = { ...draft, status: 'CONFIRMED' as const };
    fetchMock.mockReset();
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));
    const result = register();

    // Act
    const { ms, value } = await timed(() =>
      act(async () => result.current.mutateAsync({ type: 'INBOUND', items })),
    );

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.largePayload);
    expect(value.items).toHaveLength(2000);
    expect(value.items[1999]).toEqual(confirmed.items[1999]);
  });
});
