import { beforeEach, describe, expect, it } from 'vitest';
import { page, sessionStub, userStub } from './support/api-result';
import { answer, requestOf, stubbedTransport } from './support/stubbed-transport';

const { fetchMock, api, unwrap, storeSession } = await stubbedTransport();

const suspended = userStub({ id: 'user-2', status: 'SUSPENDED' });
const active = userStub({ id: 'user-3', status: 'ACTIVE' });

describe('changeStatus - Front', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    // A token in memory keeps the auth middleware from spending the first call
    // on /auth/refresh, so each scenario below is exactly one request.
    storeSession(sessionStub());
  });

  it('Camino 1 - usuario suspendido se reactiva exitosamente', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(200, page([suspended, active])))
      .mockImplementationOnce(answer(200, { ...suspended, status: 'ACTIVE' }));

    // Act
    const listado = unwrap(await api.GET('/api/v1/users', { params: { query: { pageSize: 50 } } }));

    const reactivado = unwrap(
      await api.PATCH('/api/v1/users/{id}', {
        params: { path: { id: suspended.id } },
        body: { status: 'ACTIVE' },
      }),
    );

    // Assert
    expect(listado.data).toHaveLength(2);
    expect(reactivado.status).toBe('ACTIVE');
    expect(requestOf(fetchMock, 1).url).toContain(`/api/v1/users/${suspended.id}`);
  });

  it('Camino 2 - usuario activo se suspende exitosamente', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, { ...active, status: 'SUSPENDED' }));

    // Act
    const suspendido = unwrap(
      await api.PATCH('/api/v1/users/{id}', {
        params: { path: { id: active.id } },
        body: { status: 'SUSPENDED' },
      }),
    );

    // Assert
    expect(suspendido.status).toBe('SUSPENDED');
  });

  it('Camino 3 - la mutacion falla y se notifica error', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(404, { message: 'User not found' }));

    // Act
    const response = await api.PATCH('/api/v1/users/{id}', {
      params: { path: { id: '00000000-0000-4000-8000-000000000000' } },
      body: { status: 'SUSPENDED' },
    });

    // Assert
    expect(response.error).toBeDefined();
    expect(response.response.status).toBe(404);
    expect(() => unwrap(response)).toThrow();
  });

  it('Camino 4 - un 401 en una ruta con sesion la da por terminada', async () => {
    // Arrange
    // The other side of the middleware: a 401 outside the session routes means
    // the session is over, so the client drops the token rather than retrying.
    const { getAccessToken } = await import('@/lib/api/session');
    fetchMock.mockImplementation(answer(401, { message: 'Unauthorized' }));

    // Act
    await api.PATCH('/api/v1/users/{id}', {
      params: { path: { id: active.id } },
      body: { status: 'SUSPENDED' },
    });

    // Assert
    expect(getAccessToken()).toBeNull();
  });
});
