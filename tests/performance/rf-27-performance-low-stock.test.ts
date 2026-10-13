import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BUDGET_MS,
  answer,
  loadUnderTest,
  median,
  queryWrapper,
  session,
  stockLevels,
  timed,
} from './support/perf';

const { fetchMock, useLowStock, storeSession } = await loadUnderTest();

describe('RF-27 Performance - Productos bajo el stock mínimo', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  it('la lista más larga que acepta la API (100) se procesa dentro del presupuesto de una operación', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, stockLevels(100)));
    const { wrapper } = queryWrapper();

    // Act
    const { ms, value: result } = await timed(async () => {
      const { result } = renderHook(() => useLowStock(100), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      return result;
    });

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.singleOperation);
    expect(result.current.data).toHaveLength(100);
  });

  it('el dashboard y la vista de existencias con el mismo límite comparten una sola petición', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, stockLevels(8)));
    const { wrapper } = queryWrapper();

    // Act
    const cards = Array.from({ length: 10 }, () => renderHook(() => useLowStock(8), { wrapper }));
    await waitFor(() => expect(cards.every(({ result }) => result.current.isSuccess)).toBe(true));

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('el tiempo de respuesta es estable: la mediana de 15 cargas cabe en el presupuesto', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, stockLevels(8)));

    // Act
    const samples: number[] = [];
    for (let i = 0; i < 15; i += 1) {
      const { wrapper } = queryWrapper();
      const { ms } = await timed(async () => {
        const { result } = renderHook(() => useLowStock(8), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
      });
      samples.push(ms);
    }

    // Assert
    expect(median(samples)).toBeLessThan(BUDGET_MS.singleOperation);
    expect(fetchMock).toHaveBeenCalledTimes(15);
  });
});
