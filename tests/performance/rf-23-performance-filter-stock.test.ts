import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import {
  BUDGET_MS,
  answer,
  loadUnderTest,
  pageOf,
  queryWrapper,
  session,
  stockLevels,
  timed,
} from './support/perf';

const { fetchMock, useStockLevels, storeSession } = await loadUnderTest();

const DEBOUNCE_MS = 50;

function useFilteredStock(search: string) {
  const settled = useDebouncedValue(search, DEBOUNCE_MS);
  return useStockLevels(settled ? { search: settled } : {}, { page: 1, pageSize: 10 });
}

const searchedTerms = () =>
  fetchMock.mock.calls.map(([request]) =>
    new URL((request as Request).url).searchParams.get('search'),
  );

/**
 * Types into the box and waits out the debounce and the answer inside act, so
 * both state updates are flushed instead of queued behind the test.
 */
async function settle(type: () => void) {
  await act(async () => {
    type();
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS * 2));
  });
}

describe('RF-23 Performance - Filtrar las existencias', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(answer(200, pageOf(stockLevels(10))));
    storeSession(session());
  });

  it('escribir un término de 30 caracteres produce una sola petición filtrada, no 30', async () => {
    // Arrange
    const term = 'aguardiente antioqueño sin azú';
    const { wrapper } = queryWrapper();
    const { result, rerender } = renderHook(({ search }) => useFilteredStock(search), {
      wrapper,
      initialProps: { search: '' },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Act
    for (let length = 1; length <= term.length; length += 1) {
      act(() => rerender({ search: term.slice(0, length) }));
    }
    await waitFor(() => expect(searchedTerms()).toContain(term));
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS * 3));

    // Assert
    expect(searchedTerms()).toEqual([null, term]);
  });

  it('el resultado filtrado llega poco después del debounce, dentro del presupuesto de una operación', async () => {
    // Arrange
    const { wrapper } = queryWrapper();
    const { result, rerender } = renderHook(({ search }) => useFilteredStock(search), {
      wrapper,
      initialProps: { search: '' },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Act
    const { ms } = await timed(async () => {
      await settle(() => rerender({ search: 'ron' }));
      await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    });

    // Assert
    expect(ms).toBeGreaterThanOrEqual(DEBOUNCE_MS - 5);
    expect(ms).toBeLessThan(DEBOUNCE_MS + BUDGET_MS.singleOperation);
  });

  it('volver a un término ya buscado reutiliza la caché en vez de repetir la petición mientras está fresca', async () => {
    // Arrange
    const { wrapper, client } = queryWrapper();
    client.setDefaultOptions({ queries: { retry: false, staleTime: 60_000 } });
    const { result, rerender } = renderHook(({ search }) => useFilteredStock(search), {
      wrapper,
      initialProps: { search: 'ron' },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await settle(() => rerender({ search: 'gin' }));
    await waitFor(() => expect(client.getQueryCache().getAll()).toHaveLength(2));

    // Act
    await settle(() => rerender({ search: 'ron' }));

    // Assert
    expect(searchedTerms()).toEqual(['ron', 'gin']);
  });
});
