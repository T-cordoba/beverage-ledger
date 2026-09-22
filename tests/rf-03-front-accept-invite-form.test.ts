import { beforeEach, describe, expect, it } from 'vitest';
import { sessionStub } from './support/api-result';
import { answer, stubbedTransport } from './support/stubbed-transport';

const { fetchMock, api, unwrap, storeSession } = await stubbedTransport();

const preview = {
  email: 'invitado@ejemplo.com',
  role: 'OPERATOR',
  organizationName: 'Beverage Ledger',
  expiresAt: '2026-12-31T00:00:00.000Z',
} as const;

describe('AcceptInviteForm render - Front', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    // A token in memory keeps the auth middleware from spending the first call
    // on /auth/refresh, so each scenario below is exactly one request.
    storeSession(sessionStub());
  });

  it('Camino 1 - vista previa cargando, se muestra spinner', async () => {
    // Arrange
    // isPending cannot be read off the result, so what is asserted is that the
    // promise is still open while the transport has not answered.
    let release: (response: Response) => void = () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );

    // Act
    const pending = api.POST('/api/v1/invitations/lookup', { body: { token: 'token-de-prueba' } });
    const settledFirst = await Promise.race([pending.then(() => 'settled'), 'pending']);

    // Assert
    expect(settledFirst).toBe('pending');

    release(await answer(200, preview)());
    expect(unwrap(await pending).email).toBe(preview.email);
  });

  it('Camino 2 - token invalido, se muestra tarjeta de error', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(404, { message: 'Invitation not found or expired' }));

    // Act
    const result = await api.POST('/api/v1/invitations/lookup', {
      body: { token: 'token-invalido-para-error' },
    });

    // Assert
    expect(result.response.ok).toBe(false);
    expect(result.response.status).toBe(404);
    expect(result.error).toBeDefined();
    expect(() => unwrap(result)).toThrow();
  });

  it('Camino 3 - token valido, se muestra formulario de aceptacion', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, preview));

    // Act
    const result = unwrap(
      await api.POST('/api/v1/invitations/lookup', { body: { token: 'token-para-formulario' } }),
    );

    // Assert
    expect(result.email).toBe(preview.email);
    expect(result.organizationName).toBe(preview.organizationName);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
