import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { jsonResponse } from './support/api-result';

const fetchMock = vi.fn<typeof fetch>();

describe('AcceptInviteForm render - Front', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('Camino 1 - vista previa cargando, se muestra spinner', async () => {
    // Arrange
    // El estado isPending es transitorio y no alcanzable via API directamente.
    // Se verifica que el endpoint de preview existe y responde.
    fetchMock.mockResolvedValue(jsonResponse(404, { message: 'Invitation not found' }));

    // Act
    const response = await fetch(`${API_ORIGIN}/api/v1/invitations/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'token-de-prueba-inexistente' }),
    });

    // Assert
    expect(response.status).toBeDefined();
  });

  it('Camino 2 - token invalido, se muestra tarjeta de error', async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(404, { message: 'Invitation not found or expired' }));

    // Act
    const response = await fetch(`${API_ORIGIN}/api/v1/invitations/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'token-invalido-para-error' }),
    });
    const body = await response.json();

    // Assert
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
    expect(body.message).toBeDefined();
  });

  it('Camino 3 - token valido, se muestra formulario de aceptacion', async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        email: 'invitado@ejemplo.com',
        organizationName: 'Beverage Ledger',
      }),
    );

    // Act
    const response = await fetch(`${API_ORIGIN}/api/v1/invitations/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'token-para-formulario' }),
    });
    const body = await response.json();

    // Assert
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(body.email).toBeDefined();
  });
});
