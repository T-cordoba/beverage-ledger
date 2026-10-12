import { cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppProviders,
  LEAKY_ERROR_PAGE,
  LEAK_MARKERS,
  XSS_PAYLOAD,
  answer,
  errorBody,
  injectedMarkup,
  loadClientUnderTest,
  queryClient,
  queryWrapper,
  rawAnswer,
  session,
  stockLevelDto,
} from './support/security-harness';

const { fetchMock, useLowStock, storeSession, forgetSession, getAccessToken, onSessionLost } =
  await loadClientUnderTest();
const { LowStockCard } = await import('@/features/stock/LowStockCard');

function renderCard(enabled = true) {
  return render(
    <AppProviders client={queryClient()}>
      <LowStockCard enabled={enabled} />
    </AppProviders>,
  );
}

describe('RF-27 Security - Productos bajo el stock mínimo', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    forgetSession();
    storeSession(session());
  });

  it('nombre y categoría con HTML hostil se pintan como texto en la tarjeta', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(200, [
        stockLevelDto({ productName: XSS_PAYLOAD, categoryName: '<b onerror=x>Ron</b>' }),
      ]),
    );

    // Act
    const { container } = renderCard();

    // Assert
    expect(await screen.findByText(XSS_PAYLOAD)).toBeTruthy();
    expect(screen.getByText('<b onerror=x>Ron</b>')).toBeTruthy();
    expect(injectedMarkup(container)).toBe(false);
  });

  it('el enlace de cada fila apunta siempre dentro de /stock/, aunque el id venga manipulado', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(200, [stockLevelDto({ productId: 'javascript:alert(1)', productName: 'Ginebra' })]),
    );

    // Act
    renderCard();

    // Assert
    const link = await screen.findByRole('link', { name: 'Ginebra' });
    expect(link.getAttribute('href')?.startsWith('/stock/')).toBe(true);
  });

  it('deshabilitada (sin permiso de existencias) no dispara ninguna petición', () => {
    // Act
    renderCard(false);

    // Assert
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un 500 con traza del servidor muestra un mensaje genérico, sin filtrar secretos', async () => {
    // Arrange
    fetchMock.mockImplementation(rawAnswer(500, LEAKY_ERROR_PAGE, 'text/html'));

    // Act
    const { container } = renderCard();

    // Assert
    expect(await screen.findByText('No se pudo cargar la lista de reposición.')).toBeTruthy();
    for (const marker of LEAK_MARKERS) expect(container.textContent).not.toContain(marker);
  });

  it('un 401 cierra la sesión local y avisa para volver al login', async () => {
    // Arrange
    const sessionLost = vi.fn();
    const unsubscribe = onSessionLost(sessionLost);
    fetchMock.mockImplementation(answer(401, errorBody(401, 'Unauthorized', 'Token expired')));
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useLowStock(8), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    unsubscribe();

    // Assert
    expect(getAccessToken()).toBeNull();
    expect(sessionLost).toHaveBeenCalledTimes(1);
  });
});
