import { cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCESS_TOKEN,
  AppProviders,
  LEAKY_ERROR_PAGE,
  LEAK_MARKERS,
  XSS_PAYLOAD,
  answer,
  errorBody,
  injectedMarkup,
  loadClientUnderTest,
  pageOf,
  queryClient,
  queryWrapper,
  rawAnswer,
  requestOf,
  routeAnswers,
  session,
  stockLevelDto,
} from './support/security-harness';

const {
  fetchMock,
  useStockLevels,
  storeSession,
  forgetSession,
  getAccessToken,
  onSessionLost,
  describeError,
} = await loadClientUnderTest();
const { StockLevelsView } = await import('@/features/stock/StockLevelsView');

const PAGE = { page: 1, pageSize: 10 };

function renderStock(rows = [stockLevelDto()]) {
  routeAnswers(fetchMock, {
    '/api/v1/stock': answer(200, pageOf(rows)),
    '/api/v1/categories': answer(200, pageOf([])),
    '/api/v1/locations': answer(200, pageOf([])),
  });
  return render(
    <AppProviders client={queryClient()}>
      <StockLevelsView />
    </AppProviders>,
  );
}

describe('RF-22 Security - Consultar las existencias actuales', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    forgetSession();
    storeSession(session());
  });

  it('un nombre de producto con HTML hostil se pinta como texto y no como marcado', async () => {
    // Arrange & Act
    const { container } = renderStock([
      stockLevelDto({ productName: XSS_PAYLOAD, brandName: '<script>alert(1)</script>' }),
    ]);

    // Assert
    expect(await screen.findByText(XSS_PAYLOAD)).toBeTruthy();
    expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy();
    expect(injectedMarkup(container)).toBe(false);
  });

  it('el enlace al kardex no se convierte en javascript: aunque el id venga manipulado', async () => {
    // Arrange & Act
    renderStock([stockLevelDto({ productId: 'javascript:alert(1)', productName: 'Ron' })]);

    // Assert
    const link = await screen.findByRole('link', { name: 'Ron' });
    expect(link.getAttribute('href')?.startsWith('/stock/')).toBe(true);
  });

  it('cada petición de existencias lleva el bearer en la cabecera y nunca en la URL', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf([])));
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useStockLevels({}, PAGE), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(requestOf(fetchMock).headers.get('Authorization')).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(requestOf(fetchMock).url).not.toContain(ACCESS_TOKEN);
  });

  it('un 401 en existencias cierra la sesión local y avisa para volver al login', async () => {
    // Arrange
    const sessionLost = vi.fn();
    const unsubscribe = onSessionLost(sessionLost);
    fetchMock.mockImplementation(answer(401, errorBody(401, 'Unauthorized', 'Token expired')));
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useStockLevels({}, PAGE), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    unsubscribe();

    // Assert
    expect(getAccessToken()).toBeNull();
    expect(sessionLost).toHaveBeenCalledTimes(1);
  });

  it('un 500 con traza y secretos del servidor no llega al mensaje que ve el usuario', async () => {
    // Arrange
    fetchMock.mockImplementation(rawAnswer(500, LEAKY_ERROR_PAGE, 'text/html'));
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useStockLevels({}, PAGE), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    const shown = describeError(result.current.error, 'Inténtalo de nuevo.');

    // Assert
    expect(result.current.error).toMatchObject({ status: 500, body: null });
    for (const marker of LEAK_MARKERS) expect(shown).not.toContain(marker);
  });

  it('una respuesta fallida no deja filas de otra consulta a la vista: muestra el error', async () => {
    // Arrange
    routeAnswers(fetchMock, {
      '/api/v1/stock': answer(
        403,
        errorBody(403, 'Forbidden', 'Forbidden resource', '/api/v1/stock'),
      ),
      '/api/v1/categories': answer(200, pageOf([])),
      '/api/v1/locations': answer(200, pageOf([])),
    });

    // Act
    render(
      <AppProviders client={queryClient()}>
        <StockLevelsView />
      </AppProviders>,
    );

    // Assert
    expect(await screen.findByText('No se pudieron cargar las existencias.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Ron Viejo de Caldas' })).toBeNull();
  });
});
