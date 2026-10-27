import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCESS_TOKEN,
  API_ORIGIN,
  AppProviders,
  CREATE_MOVEMENT_KEYS,
  SERVER_OWNED_KEYS,
  SQLI_PAYLOAD,
  XSS_PAYLOAD,
  answer,
  bodyOf,
  errorBody,
  loadClientUnderTest,
  movementDto,
  queryClient,
  queryWrapper,
  rawBodyOf,
  requestOf,
  session,
  trace,
} from './support/security-harness';

const auth = vi.hoisted(() => ({ permissions: [] as string[] }));

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ can: (permission: string) => auth.permissions.includes(permission) }),
}));

const {
  fetchMock,
  useRegisterMovement,
  storeSession,
  forgetSession,
  getAccessToken,
  onSessionLost,
  ApiError,
  describeError,
} = await loadClientUnderTest();
const { PermissionGate } = await import('@/features/auth/PermissionGate');
const { MOVEMENT_TYPES } = await import('@/features/movements/movement-types');

const DRAFT_ID = '44444444-4444-4444-8444-444444444444';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const items = [{ productId: PRODUCT_ID, quantity: 1, unit: 'CASE' as const }];
const draft = movementDto({ id: DRAFT_ID, type: 'INBOUND' });
const confirmed = movementDto({ id: DRAFT_ID, type: 'INBOUND', status: 'CONFIRMED' });

type RegisterInput = Parameters<ReturnType<typeof useRegisterMovement>['mutateAsync']>[0];

async function registerAndCatch(input: RegisterInput) {
  const { wrapper } = queryWrapper();
  const { result } = renderHook(() => useRegisterMovement(), { wrapper });
  let outcome: unknown;
  await act(async () => {
    outcome = await result.current.mutateAsync(input).catch((error: unknown) => error);
  });
  return outcome;
}

describe('RF-16 Security - Registrar una entrada (INBOUND)', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    forgetSession();
    window.localStorage.clear();
    auth.permissions = [];
  });

  it('sin sesión no envía cabecera Authorization ni confirma: el 401 corta el flujo', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Invalid refresh token')))
      .mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Unauthorized')));

    // Act
    const failure = await registerAndCatch({ type: 'INBOUND', items });

    // Assert
    expect(trace(fetchMock)).toEqual(['POST /api/v1/auth/refresh', 'POST /api/v1/movements']);
    expect(requestOf(fetchMock, 1).headers.get('Authorization')).toBeNull();
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 401 });
  });

  it('un OPERATOR que fuerza la entrada recibe 403: no se confirma y la sesión sigue viva', async () => {
    // Arrange: per the role matrix an operator cannot register inbound movements.
    storeSession(session());
    fetchMock.mockImplementationOnce(
      answer(403, errorBody(403, 'Forbidden', 'Insufficient permissions')),
    );

    // Act
    const failure = await registerAndCatch({ type: 'INBOUND', items });

    // Assert
    expect(trace(fetchMock)).toEqual(['POST /api/v1/movements']);
    expect(failure).toMatchObject({ status: 403, message: 'Insufficient permissions' });
    expect(getAccessToken()).toBe(ACCESS_TOKEN);
  });

  it('un 401 al confirmar invalida la sesión en memoria y avisa para volver al login', async () => {
    // Arrange
    storeSession(session());
    const sessionLost = vi.fn();
    const unsubscribe = onSessionLost(sessionLost);
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Token revoked')));

    // Act
    const failure = await registerAndCatch({ type: 'INBOUND', items });
    unsubscribe();

    // Assert
    expect(failure).toMatchObject({ status: 401 });
    expect(getAccessToken()).toBeNull();
    expect(sessionLost).toHaveBeenCalledTimes(1);
  });

  it('el cuerpo solo lleva campos de CreateMovementDto y ninguna bodega destino', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));

    // Act
    await registerAndCatch({ type: 'INBOUND', items, onDraftOpened: () => undefined });

    // Assert
    const body = await bodyOf(fetchMock, 0);
    expect(CREATE_MOVEMENT_KEYS).toEqual(expect.arrayContaining(Object.keys(body)));
    expect(body).not.toHaveProperty('destinationLocationId');
    for (const key of SERVER_OWNED_KEYS) expect(body).not.toHaveProperty(key);
    expect(body).toMatchObject({ type: 'INBOUND', items });
  });

  it('una nota con XSS/SQLi viaja como string JSON literal, sin interpretarse ni alterarse', async () => {
    // Arrange
    storeSession(session());
    const note = `${XSS_PAYLOAD} ${SQLI_PAYLOAD}`;
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));

    // Act
    await registerAndCatch({ type: 'INBOUND', items, note });

    // Assert
    expect(requestOf(fetchMock, 0).headers.get('Content-Type')).toBe('application/json');
    expect(await bodyOf(fetchMock, 0)).toMatchObject({ note });
    expect(new URL(requestOf(fetchMock, 0).url).search).toBe('');
  });

  it('el token solo viaja en la cabecera Authorization hacia el origen de la API', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));

    // Act
    await registerAndCatch({ type: 'INBOUND', items });

    // Assert
    for (const call of [0, 1]) {
      const request = requestOf(fetchMock, call);
      expect(new URL(request.url).origin).toBe(API_ORIGIN);
      expect(request.url).not.toContain(ACCESS_TOKEN);
      expect(request.headers.get('Authorization')).toBe(`Bearer ${ACCESS_TOKEN}`);
      expect(request.credentials).toBe('include');
    }
    expect(await rawBodyOf(fetchMock, 0)).not.toContain(ACCESS_TOKEN);
  });

  it('un 400 de validación muestra solo los mensajes de la API, sin path ni timestamp', async () => {
    // Arrange
    storeSession(session());
    const messages = ['items must contain at least 1 elements', 'quantity must be positive'];
    fetchMock.mockImplementationOnce(answer(400, errorBody(400, 'Bad Request', messages)));

    // Act
    const failure = await registerAndCatch({ type: 'INBOUND', items: [] });
    const shown = describeError(failure, 'Inténtalo de nuevo.');

    // Assert
    expect(trace(fetchMock)).toEqual(['POST /api/v1/movements']);
    expect(shown).toBe(messages.join('. '));
    expect(shown).not.toContain('/api/v1/movements');
    expect(shown).not.toContain('2026-01-01T00:00:00.000Z');
  });

  it('el permiso movement:create-inbound decide si la captura de entrada se monta', () => {
    // Arrange: an operator's real set of permissions, without inbound.
    auth.permissions = ['movement:create-outbound', 'movement:read'];
    const view = () => (
      <AppProviders client={queryClient()}>
        <PermissionGate permission={MOVEMENT_TYPES.INBOUND.permission}>
          <p>captura de entrada</p>
        </PermissionGate>
      </AppProviders>
    );

    // Act
    const { rerender } = render(view());
    const hiddenForOperator = screen.queryByText('captura de entrada');
    auth.permissions = ['movement:create-inbound'];
    rerender(view());

    // Assert
    expect(MOVEMENT_TYPES.INBOUND.permission).toBe('movement:create-inbound');
    expect(hiddenForOperator).toBeNull();
    expect(screen.getByText('captura de entrada')).toBeTruthy();
  });
});
