import { beforeEach, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { sessionStub } from './support/api-result';
import { answer, stubbedTransport } from './support/stubbed-transport';

const { fetchMock, api, unwrap, storeSession } = await stubbedTransport();

describe('handleSubmit - Front', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('Camino 1 - signIn lanza excepcion y se muestra el error', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(401, { message: 'Invalid credentials' }));

    // Act
    const result = await api.POST('/api/v1/auth/login', {
      body: { email: 'no-existe@ejemplo.com', password: 'contraseña-incorrecta' },
    });

    // Assert
    expect(result.response.ok).toBe(false);
    expect(result.response.status).toBe(401);
    expect(() => unwrap(result)).toThrow();
  });

  it('Camino 2 - signIn tiene exito y devuelve datos de sesion', async () => {
    // Arrange
    const session = sessionStub();
    fetchMock.mockImplementation(answer(200, session));

    // Act
    const result = unwrap(
      await api.POST('/api/v1/auth/login', {
        body: { email: session.user.email, password: 'password-de-prueba' },
      }),
    );

    // Assert
    expect(result.accessToken).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.expiresIn).toBeDefined();
  });

  it('Camino 3 - el login no viaja con token, aunque haya sesion abierta', async () => {
    // Arrange
    // /auth/login is in SESSION_ROUTES: asking for a token there would recurse,
    // since renewing one is itself a call to the auth routes.
    storeSession(sessionStub({ accessToken: 'token-anterior' }));
    fetchMock.mockImplementation(answer(200, sessionStub()));

    // Act
    await api.POST('/api/v1/auth/login', {
      body: { email: 'admin@beverageledger.local', password: 'password-de-prueba' },
    });

    // Assert
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.headers.get('Authorization')).toBeNull();
    expect(request.url).toBe(`${API_ORIGIN}/api/v1/auth/login`);
  });
});
