import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BUDGET_MS,
  answer,
  loadUnderTest,
  pageOf,
  queryWrapper,
  session,
  stockLevels,
  timed,
  uuid,
} from './support/perf';

const { fetchMock, useStockLevels, useStockAvailability, storeSession } = await loadUnderTest();

const PAGE = { page: 1, pageSize: 100 };

describe('RF-22 Performance - Consultar las existencias actuales', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  it('la página más grande que sirve la API (100 filas) se procesa dentro del presupuesto de una operación', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf(stockLevels(100), 1, 215)));
    const { wrapper } = queryWrapper();

    // Act
    const { ms, value: result } = await timed(async () => {
      const { result } = renderHook(() => useStockLevels({}, PAGE), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      return result;
    });

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.singleOperation);
    expect(result.current.data?.data).toHaveLength(100);
  });

  it('diez componentes que piden la misma página comparten una sola petición', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf(stockLevels(10))));
    const { wrapper } = queryWrapper();

    // Act
    const hooks = Array.from({ length: 10 }, () =>
      renderHook(() => useStockLevels({}, { page: 1, pageSize: 10 }), { wrapper }),
    );
    await waitFor(() => expect(hooks.every(({ result }) => result.current.isSuccess)).toBe(true));

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('la disponibilidad de 1000 productos sale en 20 tandas de 50, dentro del presupuesto de lote', async () => {
    // Arrange
    const ids = Array.from({ length: 1000 }, (_, i) => uuid(i + 1, 'b'));
    fetchMock.mockImplementation(async (input) => {
      const requested = new URL((input as Request).url).searchParams.get('productIds') ?? '';
      const rows = requested.split(',').map((productId) => ({
        ...stockLevels(1)[0],
        productId,
      }));
      return answer(200, pageOf(rows))();
    });
    const { wrapper } = queryWrapper();

    // Act
    const { ms, value: result } = await timed(async () => {
      const { result } = renderHook(() => useStockAvailability(ids), { wrapper });
      await waitFor(() => expect(result.current.isReady).toBe(true));
      return result;
    });

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.batch);
    expect(fetchMock).toHaveBeenCalledTimes(20);
    expect(result.current.levels.size).toBe(1000);
  });

  it('que el picker cargue una página más solo pide la tanda nueva, no las anteriores', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf([])));
    const firstPage = Array.from({ length: 50 }, (_, i) => uuid(i + 1, 'b'));
    const secondPage = Array.from({ length: 50 }, (_, i) => uuid(i + 51, 'b'));
    const { wrapper } = queryWrapper();
    const { result, rerender } = renderHook(({ ids }) => useStockAvailability(ids), {
      wrapper,
      initialProps: { ids: firstPage },
    });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Act
    rerender({ ids: [...firstPage, ...secondPage] });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
