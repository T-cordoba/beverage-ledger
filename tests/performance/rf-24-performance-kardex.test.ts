import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BUDGET_MS,
  kardexEntries,
  loadUnderTest,
  pageOf,
  answer,
  queryWrapper,
  session,
  timed,
} from './support/perf';

const { fetchMock, useKardex, storeSession } = await loadUnderTest();

const PRODUCT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const HISTORY = kardexEntries(2000);
const PAGE_SIZE = 100;

function serveHistory() {
  fetchMock.mockImplementation(async (input) => {
    const page = Number(new URL((input as Request).url).searchParams.get('page'));
    const rows = HISTORY.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return answer(200, pageOf(rows, page, HISTORY.length))();
  });
}

describe('RF-24 Performance - Consultar el kardex de un producto', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    serveHistory();
    storeSession(session());
  });

  it('una página de 100 movimientos se procesa dentro del presupuesto de una operación', async () => {
    // Arrange
    const { wrapper } = queryWrapper();

    // Act
    const { ms, value: result } = await timed(async () => {
      const { result } = renderHook(
        () => useKardex(PRODUCT_ID, undefined, { page: 1, pageSize: PAGE_SIZE }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      return result;
    });

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.singleOperation);
    expect(result.current.data?.data).toHaveLength(PAGE_SIZE);
  });

  it('recorrer las 20 páginas de un historial de 2000 líneas cuesta 20 peticiones y cabe en el presupuesto de lote', async () => {
    // Arrange
    const { wrapper } = queryWrapper();
    const { result, rerender } = renderHook(
      ({ page }) => useKardex(PRODUCT_ID, undefined, { page, pageSize: PAGE_SIZE }),
      { wrapper, initialProps: { page: 1 } },
    );

    // Act
    const { ms } = await timed(async () => {
      for (let page = 1; page <= 20; page += 1) {
        act(() => rerender({ page }));
        await waitFor(() => expect(result.current.data?.meta.page).toBe(page));
      }
    });

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.batch);
    expect(fetchMock).toHaveBeenCalledTimes(20);
    expect(result.current.data?.data.at(-1)?.balanceAfter).toBe(HISTORY.at(-1)?.balanceAfter);
  });

  it('el saldo corrido de la API se entrega intacto: el front no lo vuelve a sumar', async () => {
    // Arrange
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(
      () => useKardex(PRODUCT_ID, undefined, { page: 3, pageSize: PAGE_SIZE }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(result.current.data?.data).toEqual(HISTORY.slice(200, 300));
  });
});
