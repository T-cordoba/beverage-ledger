import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import {
  answer,
  loadApiUnderTest,
  pageOf,
  queryOf,
  queryWrapper,
  session,
  stockLevelDto,
} from './support/http';

const { fetchMock, useStockLevels, storeSession } = await loadApiUnderTest();

const DEBOUNCE_MS = 20;
const PAGE = { page: 1, pageSize: 10 };

/** What StockLevelsView does: debounce the box, and only send a search that is not empty. */
function useFilteredStock(search: string, categoryId?: string) {
  const settled = useDebouncedValue(search, DEBOUNCE_MS);
  return useStockLevels({ ...(settled ? { search: settled } : {}), categoryId }, PAGE);
}

function filter(initial: string, categoryId?: string) {
  const { wrapper } = queryWrapper();
  return renderHook(({ search }) => useFilteredStock(search, categoryId), {
    wrapper,
    initialProps: { search: initial },
  });
}

describe('RF-23 API - Filtrar las existencias', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(answer(200, pageOf([stockLevelDto()])));
    storeSession(session());
  });

  it('una búsqueda vacía no manda el parámetro search', async () => {
    // Act
    const { result } = filter('');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(queryOf(fetchMock)).toEqual({ page: '1', pageSize: '10' });
  });

  it('el texto filtrado viaja en search y el servidor decide qué filas coinciden', async () => {
    // Arrange
    const { result, rerender } = filter('');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Act
    rerender({ search: 'ron' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    // Assert
    expect(queryOf(fetchMock, 1)).toEqual({ search: 'ron', page: '1', pageSize: '10' });
  });

  it('acentos, eñes y espacios llegan al servidor sin alterarse', async () => {
    // Act
    const { result } = filter('Añejo 7 años');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(queryOf(fetchMock).search).toBe('Añejo 7 años');
  });

  it('búsqueda y categoría se combinan en la misma petición', async () => {
    // Act
    const { result } = filter('caldas', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(queryOf(fetchMock)).toMatchObject({
      search: 'caldas',
      categoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    });
  });

  it('escribir letra por letra manda una sola petición con el término final', async () => {
    // Arrange
    const { result, rerender } = filter('');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Act
    for (const partial of ['g', 'gi', 'gin', 'gine', 'ginebra']) {
      act(() => rerender({ search: partial }));
    }
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS * 3));

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(queryOf(fetchMock, 1).search).toBe('ginebra');
  });

  it('mientras llega la respuesta filtrada se conservan las filas anteriores', async () => {
    // Arrange
    const { result, rerender } = filter('');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const before = result.current.data;
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));

    // Act
    rerender({ search: 'whisky' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    // Assert
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data).toBe(before);
  });
});
