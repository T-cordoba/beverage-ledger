import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCESS_TOKEN,
  AppProviders,
  CREATE_MOVEMENT_KEYS,
  LEAKY_ERROR_PAGE,
  LEAK_MARKERS,
  SERVER_OWNED_KEYS,
  TRAVERSAL_ID,
  answer,
  bodyOf,
  errorBody,
  loadClientUnderTest,
  movementDto,
  queryClient,
  queryWrapper,
  rawAnswer,
  requestOf,
  session,
  tokenInBrowserStorage,
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

const DRAFT_ID = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const items = [{ productId: PRODUCT_ID, quantity: 2, unit: 'BOTTLE' as const }];
const draft = movementDto({ id: DRAFT_ID, type: 'OUTBOUND' });
const confirmed = movementDto({ id: DRAFT_ID, type: 'OUTBOUND', status: 'CONFIRMED' });

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

describe('RF-15 Security - Registrar una salida (OUTBOUND)', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    forgetSession();
    window.localStorage.clear();
    window.sessionStorage.clear();
    auth.permissions = [];
  });

  it('sin sesión no envía cabecera Authorization ni confirma: el 401 corta el flujo', async () => {
    // Arrange: no token in memory and the refresh cookie is rejected.
    fetchMock
      .mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Invalid refresh token')))
      .mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Unauthorized')));

    // Act
    const failure = await registerAndCatch({ type: 'OUTBOUND', items });

    // Assert
    expect(trace(fetchMock)).toEqual(['POST /api/v1/auth/refresh', 'POST /api/v1/movements']);
    expect(requestOf(fetchMock, 1).headers.get('Authorization')).toBeNull();
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 401 });
    expect(getAccessToken()).toBeNull();
  });

  it('un 401 al confirmar invalida la sesión en memoria y avisa para volver al login', async () => {
    // Arrange
    storeSession(session());
    const sessionLost = vi.fn();
    const unsubscribe = onSessionLost(sessionLost);
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Token expired')));

    // Act
    const failure = await registerAndCatch({ type: 'OUTBOUND', items });
    unsubscribe();

    // Assert
    expect(failure).toMatchObject({ status: 401 });
    expect(getAccessToken()).toBeNull();
    expect(sessionLost).toHaveBeenCalledTimes(1);
  });

  it('un 403 (sin movement:create-outbound) no confirma ni reintenta y conserva la sesión', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementationOnce(
      answer(403, errorBody(403, 'Forbidden', 'Insufficient permissions')),
    );

    // Act
    const failure = await registerAndCatch({ type: 'OUTBOUND', items });

    // Assert
    expect(trace(fetchMock)).toEqual(['POST /api/v1/movements']);
    expect(failure).toMatchObject({ status: 403, message: 'Insufficient permissions' });
    expect(getAccessToken()).toBe(ACCESS_TOKEN);
  });

  it('el cuerpo solo lleva campos de CreateMovementDto: nada de estado, autor, id ni callbacks', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));

    // Act
    await registerAndCatch({
      type: 'OUTBOUND',
      items,
      draftId: null,
      onDraftOpened: () => undefined,
    });

    // Assert
    const body = await bodyOf(fetchMock, 0);
    expect(CREATE_MOVEMENT_KEYS).toEqual(expect.arrayContaining(Object.keys(body)));
    for (const key of [...SERVER_OWNED_KEYS, 'draftId', 'onDraftOpened']) {
      expect(body).not.toHaveProperty(key);
    }
    expect(body).toMatchObject({ type: 'OUTBOUND', items });
  });

  it('confirma exactamente el id que emitió el servidor, nunca uno elegido por el cliente', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));

    // Act
    await registerAndCatch({ type: 'OUTBOUND', items });

    // Assert
    expect(trace(fetchMock)).toEqual([
      'POST /api/v1/movements',
      `POST /api/v1/movements/${DRAFT_ID}/confirm`,
    ]);
    expect(requestOf(fetchMock, 1).headers.get('Authorization')).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('un draftId manipulado (path traversal) se codifica y no escapa de /movements/{id}', async () => {
    // Arrange: the pending draft id lives in localStorage, so the user can rewrite it.
    storeSession(session());
    fetchMock.mockImplementationOnce(answer(404, errorBody(404, 'Not Found', 'Not found')));
    fetchMock.mockImplementationOnce(answer(400, errorBody(400, 'Bad Request', 'Invalid')));

    // Act
    await registerAndCatch({ type: 'OUTBOUND', items, draftId: TRAVERSAL_ID });

    // Assert
    const patched = new URL(requestOf(fetchMock, 0).url);
    expect(requestOf(fetchMock, 0).method).toBe('PATCH');
    expect(patched.pathname).toBe('/api/v1/movements/..%2F..%2Fauth%2Flogout');
    expect(trace(fetchMock)).not.toContain('POST /api/v1/auth/logout');
  });

  it('un 500 con traza y secretos del servidor no llega al mensaje que ve el usuario', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementationOnce(rawAnswer(500, LEAKY_ERROR_PAGE, 'text/html'));

    // Act
    const failure = await registerAndCatch({ type: 'OUTBOUND', items });
    const shown = describeError(failure, 'Inténtalo de nuevo.');

    // Assert
    expect(failure).toMatchObject({ status: 500, body: null });
    expect(shown).toBe('Request failed with status 500');
    for (const marker of LEAK_MARKERS) expect(shown).not.toContain(marker);
  });

  it('el token de acceso nunca se persiste en localStorage, sessionStorage ni cookies', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));

    // Act
    await registerAndCatch({ type: 'OUTBOUND', items });

    // Assert
    expect(tokenInBrowserStorage()).toBe(false);
    expect(new URL(requestOf(fetchMock, 1).url).search).toBe('');
  });

  it('sin el permiso movement:create-outbound la pantalla de captura no se monta', () => {
    // Arrange
    auth.permissions = ['movement:create-inbound', 'movement:read'];

    // Act
    render(
      <AppProviders client={queryClient()}>
        <PermissionGate permission={MOVEMENT_TYPES.OUTBOUND.permission}>
          <p>captura de salida</p>
        </PermissionGate>
      </AppProviders>,
    );

    // Assert
    expect(MOVEMENT_TYPES.OUTBOUND.permission).toBe('movement:create-outbound');
    expect(screen.queryByText('captura de salida')).toBeNull();
    expect(screen.getByText('No tienes acceso a esta sección.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
