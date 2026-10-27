import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCESS_TOKEN,
  AppProviders,
  CREATE_MOVEMENT_KEYS,
  LEAKY_ERROR_PAGE,
  LEAK_MARKERS,
  SERVER_OWNED_KEYS,
  UPDATE_MOVEMENT_KEYS,
  XSS_PAYLOAD,
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
  describeError,
} = await loadClientUnderTest();
const { PermissionGate } = await import('@/features/auth/PermissionGate');
const { MIN_REASON_LENGTH, MOVEMENT_TYPES } = await import('@/features/movements/movement-types');
const { rules } = await import('@/lib/forms');

const DRAFT_ID = '66666666-6666-4666-8666-666666666666';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const items = [{ productId: PRODUCT_ID, quantity: -2, unit: 'BOTTLE' as const }];
const reason = 'Merma por rotura en barra';
const draft = movementDto({ id: DRAFT_ID, type: 'ADJUSTMENT', reason });
const confirmed = movementDto({ id: DRAFT_ID, type: 'ADJUSTMENT', reason, status: 'CONFIRMED' });

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

describe('RF-18 Security - Registrar un ajuste (ADJUSTMENT)', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    forgetSession();
    window.localStorage.clear();
    auth.permissions = [];
  });

  it('el motivo vacío, solo espacios o demasiado corto no pasa la validación del cliente', () => {
    // Arrange
    const attempts = ['', '     ', 'abc', '  ab  ', '\t\n'];

    // Act
    const issues = attempts.map((value) => rules.text(value, { minLength: MIN_REASON_LENGTH }));
    const accepted = rules.text(reason, { minLength: MIN_REASON_LENGTH });

    // Assert
    expect(MOVEMENT_TYPES.ADJUSTMENT.requiresReason).toBe(true);
    expect(issues.every((issue) => issue !== undefined)).toBe(true);
    expect(accepted).toBeUndefined();
  });

  it('si se salta la validación del cliente, el 400 de la API impide confirmar el ajuste', async () => {
    // Arrange
    storeSession(session());
    const messages = ['reason should not be empty'];
    fetchMock.mockImplementationOnce(answer(400, errorBody(400, 'Bad Request', messages)));

    // Act
    const failure = await registerAndCatch({ type: 'ADJUSTMENT', items });

    // Assert
    expect(trace(fetchMock)).toEqual(['POST /api/v1/movements']);
    expect(failure).toMatchObject({ status: 400, messages });
  });

  it('un OPERATOR que fuerza el ajuste recibe 403: no se confirma y la sesión sigue viva', async () => {
    // Arrange: adjustments are the restricted control in the role matrix.
    storeSession(session());
    fetchMock.mockImplementationOnce(
      answer(403, errorBody(403, 'Forbidden', 'Insufficient permissions')),
    );

    // Act
    const failure = await registerAndCatch({ type: 'ADJUSTMENT', items, reason });

    // Assert
    expect(trace(fetchMock)).toEqual(['POST /api/v1/movements']);
    expect(failure).toMatchObject({ status: 403 });
    expect(getAccessToken()).toBe(ACCESS_TOKEN);
  });

  it('sin sesión no envía cabecera Authorization ni confirma: el 401 corta el flujo', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Invalid refresh token')))
      .mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Unauthorized')));

    // Act
    const failure = await registerAndCatch({ type: 'ADJUSTMENT', items, reason });

    // Assert
    expect(trace(fetchMock)).toEqual(['POST /api/v1/auth/refresh', 'POST /api/v1/movements']);
    expect(requestOf(fetchMock, 1).headers.get('Authorization')).toBeNull();
    expect(failure).toMatchObject({ status: 401 });
  });

  it('un motivo con XSS viaja como string JSON literal y el cuerpo no inventa campos', async () => {
    // Arrange
    storeSession(session());
    const hostileReason = `Merma ${XSS_PAYLOAD}`;
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));

    // Act
    await registerAndCatch({ type: 'ADJUSTMENT', items, reason: hostileReason });

    // Assert
    const body = await bodyOf(fetchMock, 0);
    expect(requestOf(fetchMock, 0).headers.get('Content-Type')).toBe('application/json');
    expect(body).toMatchObject({ type: 'ADJUSTMENT', reason: hostileReason, items });
    expect(CREATE_MOVEMENT_KEYS).toEqual(expect.arrayContaining(Object.keys(body)));
    for (const key of SERVER_OWNED_KEYS) expect(body).not.toHaveProperty(key);
  });

  it('reusar un borrador por PATCH no permite convertir el ajuste en otro tipo', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(200, draft))
      .mockImplementationOnce(answer(200, confirmed));

    // Act
    await registerAndCatch({ type: 'ADJUSTMENT', items, reason, draftId: DRAFT_ID });

    // Assert
    expect(requestOf(fetchMock, 0).method).toBe('PATCH');
    const body = await bodyOf(fetchMock, 0);
    expect(UPDATE_MOVEMENT_KEYS).toEqual(expect.arrayContaining(Object.keys(body)));
    expect(body).not.toHaveProperty('type');
    expect(body).toMatchObject({ reason, items });
  });

  it('un 500 con traza y secretos del servidor no llega al mensaje que ve el usuario', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(rawAnswer(500, LEAKY_ERROR_PAGE, 'text/html'));

    // Act
    const failure = await registerAndCatch({ type: 'ADJUSTMENT', items, reason });
    const shown = describeError(failure, 'Inténtalo de nuevo.');

    // Assert
    expect(failure).toMatchObject({ status: 500, body: null });
    for (const marker of LEAK_MARKERS) expect(shown).not.toContain(marker);
  });

  it('el permiso movement:create-adjustment decide si la captura de ajuste se monta', () => {
    // Arrange
    auth.permissions = ['movement:create-outbound', 'movement:read'];
    const view = () => (
      <AppProviders client={queryClient()}>
        <PermissionGate permission={MOVEMENT_TYPES.ADJUSTMENT.permission}>
          <p>captura de ajuste</p>
        </PermissionGate>
      </AppProviders>
    );

    // Act
    const { rerender } = render(view());
    const hiddenForOperator = screen.queryByText('captura de ajuste');
    auth.permissions = ['movement:create-adjustment'];
    rerender(view());

    // Assert
    expect(MOVEMENT_TYPES.ADJUSTMENT.permission).toBe('movement:create-adjustment');
    expect(hiddenForOperator).toBeNull();
    expect(screen.getByText('captura de ajuste')).toBeTruthy();
  });
});
