import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AppProviders,
  SQLI_PAYLOAD,
  XSS_PAYLOAD,
  answer,
  injectedMarkup,
  loadClientUnderTest,
  pageOf,
  queryClient,
  queryWrapper,
  requestOf,
  routeAnswers,
  session,
  stockLevelDto,
} from './support/security-harness';

const { fetchMock, useStockLevels, storeSession, forgetSession } = await loadClientUnderTest();
const { StockLevelsView } = await import('@/features/stock/StockLevelsView');

const PAGE = { page: 1, pageSize: 10 };

async function searchFor(search: string) {
  fetchMock.mockImplementation(answer(200, pageOf([])));
  const { wrapper } = queryWrapper();
  const { result } = renderHook(() => useStockLevels({ search }, PAGE), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return new URL(requestOf(fetchMock).url).searchParams;
}

describe('RF-23 Security - Filtrar las existencias', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    forgetSession();
    storeSession(session());
  });

  it('una inyección SQL en la búsqueda viaja como un único valor de texto, sin tocarse', async () => {
    // Act
    const params = await searchFor(SQLI_PAYLOAD);

    // Assert
    expect(params.get('search')).toBe(SQLI_PAYLOAD);
    expect([...params.keys()].sort()).toEqual(['page', 'pageSize', 'search']);
  });

  it('una búsqueda con & y = no puede colar parámetros extra como locationId u otra página', async () => {
    // Act
    const params = await searchFor('ron&locationId=otra-org&pageSize=100000');

    // Assert
    expect(params.get('search')).toBe('ron&locationId=otra-org&pageSize=100000');
    expect(params.get('locationId')).toBeNull();
    expect(params.get('pageSize')).toBe('10');
  });

  it('una búsqueda con ../ no cambia la ruta pedida', async () => {
    // Act
    await searchFor('../../auth/logout');

    // Assert
    expect(new URL(requestOf(fetchMock).url).pathname).toBe('/api/v1/stock');
  });

  it('el término hostil escrito en la caja se queda como valor del input, sin inyectar marcado', async () => {
    // Arrange
    routeAnswers(fetchMock, {
      '/api/v1/stock': answer(200, pageOf([stockLevelDto()])),
      '/api/v1/categories': answer(200, pageOf([])),
      '/api/v1/locations': answer(200, pageOf([])),
    });
    const { container } = render(
      <AppProviders client={queryClient()}>
        <StockLevelsView />
      </AppProviders>,
    );
    const box = await screen.findByRole('searchbox', { name: 'Buscar existencias por producto' });

    // Act
    fireEvent.change(box, { target: { value: XSS_PAYLOAD } });
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([request]) =>
          (request as Request).url.includes(encodeURIComponent('<img')),
        ),
      ).toBe(true),
    );

    // Assert
    expect((box as HTMLInputElement).value).toBe(XSS_PAYLOAD);
    expect(injectedMarkup(container)).toBe(false);
  });
});
