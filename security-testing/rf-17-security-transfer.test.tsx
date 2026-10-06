import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCESS_TOKEN,
  AppProviders,
  CREATE_MOVEMENT_KEYS,
  QUERY_SMUGGLING_ID,
  SERVER_OWNED_KEYS,
  UPDATE_MOVEMENT_KEYS,
  answer,
  bodyOf,
  errorBody,
  loadClientUnderTest,
  movementDto,
  queryClient,
  queryWrapper,
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
const { MOVEMENT_TYPES } = await import('@/features/movements/movement-types');

const DRAFT_ID = '55555555-5555-4555-8555-555555555555';
const ORIGIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DESTINATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const items = [{ productId: PRODUCT_ID, quantity: 3, unit: 'BOTTLE' as const }];
const transfer = {
  type: 'TRANSFER' as const,
  items,
  locationId: ORIGIN_ID,
  destinationLocationId: DESTINATION_ID,
};
const draft = movementDto({
  id: DRAFT_ID,
  type: 'TRANSFER',
  locationId: ORIGIN_ID,
  destinationLocationId: DESTINATION_ID,
});
const confirmed = movementDto({
  id: DRAFT_ID,
  type: 'TRANSFER',
  locationId: ORIGIN_ID,
  destinationLocationId: DESTINATION_ID,
  status: 'CONFIRMED',
});

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

describe('RF-17 Security - Registrar un traspaso (TRANSFER)', () => {
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
    const failure = await registerAndCatch(transfer);

    // Assert
    expect(trace(fetchMock)).toEqual(['POST /api/v1/auth/refresh', 'POST /api/v1/movements']);
    expect(requestOf(fetchMock, 1).headers.get('Authorization')).toBeNull();
    expect(failure).toMatchObject({ status: 401 });
    expect(getAccessToken()).toBeNull();
  });

  it('un 403 (sin movement:create-transfer) no confirma ni reintenta y conserva la sesión', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementationOnce(
      answer(403, errorBody(403, 'Forbidden', 'Insufficient permissions')),
    );

    // Act
    const failure = await registerAndCatch(transfer);

    // Assert
    expect(trace(fetchMock)).toEqual(['POST /api/v1/movements']);
    expect(failure).toMatchObject({ status: 403 });
    expect(getAccessToken()).toBe(ACCESS_TOKEN);
  });

  it('el cuerpo solo lleva campos de CreateMovementDto con ambas bodegas explícitas', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));

    // Act
    await registerAndCatch({ ...transfer, draftId: null, onDraftOpened: () => undefined });

    // Assert
    const body = await bodyOf(fetchMock, 0);
    expect(CREATE_MOVEMENT_KEYS).toEqual(expect.arrayContaining(Object.keys(body)));
    for (const key of [...SERVER_OWNED_KEYS, 'draftId', 'onDraftOpened']) {
      expect(body).not.toHaveProperty(key);
    }
    expect(body).toMatchObject({ locationId: ORIGIN_ID, destinationLocationId: DESTINATION_ID });
  });

  it('ids de bodega manipulados viajan como valores JSON, nunca en la ruta ni la query', async () => {
    // Arrange
    storeSession(session());
    const hostileOrigin = '../locations/other-org?x=1';
    const hostileDestination = "' OR 1=1 --";
    fetchMock.mockImplementationOnce(
      answer(400, errorBody(400, 'Bad Request', ['locationId must be a UUID'])),
    );

    // Act
    const failure = await registerAndCatch({
      ...transfer,
      locationId: hostileOrigin,
      destinationLocationId: hostileDestination,
    });

    // Assert
    const url = new URL(requestOf(fetchMock, 0).url);
    expect(url.pathname).toBe('/api/v1/movements');
    expect(url.search).toBe('');
    expect(await bodyOf(fetchMock, 0)).toMatchObject({
      locationId: hostileOrigin,
      destinationLocationId: hostileDestination,
    });
    expect(failure).toMatchObject({ status: 400 });
    expect(trace(fetchMock)).toHaveLength(1);
  });

  it('origen igual a destino: el 400 de la API corta el flujo y solo expone su mensaje', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementationOnce(
      answer(400, errorBody(400, 'Bad Request', 'The destination must differ from the origin')),
    );

    // Act
    const failure = await registerAndCatch({ ...transfer, destinationLocationId: ORIGIN_ID });

    // Assert
    expect(trace(fetchMock)).toEqual(['POST /api/v1/movements']);
    expect(describeError(failure, 'Inténtalo de nuevo.')).toBe(
      'The destination must differ from the origin',
    );
  });

  it('reusar un borrador por PATCH no permite cambiar tipo ni bodegas del traspaso', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(200, draft))
      .mockImplementationOnce(answer(200, confirmed));

    // Act
    await registerAndCatch({
      ...transfer,
      locationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      destinationLocationId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      draftId: DRAFT_ID,
    });

    // Assert
    expect(trace(fetchMock)).toEqual([
      `PATCH /api/v1/movements/${DRAFT_ID}`,
      `POST /api/v1/movements/${DRAFT_ID}/confirm`,
    ]);
    const body = await bodyOf(fetchMock, 0);
    expect(UPDATE_MOVEMENT_KEYS).toEqual(expect.arrayContaining(Object.keys(body)));
    for (const key of ['type', 'locationId', 'destinationLocationId', ...SERVER_OWNED_KEYS]) {
      expect(body).not.toHaveProperty(key);
    }
  });

  it('un draftId con query smuggling se codifica: no añade parámetros ni fragmentos', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(404, errorBody(404, 'Not Found', 'Movement not found')))
      .mockImplementationOnce(answer(403, errorBody(403, 'Forbidden', 'Insufficient permissions')));

    // Act
    await registerAndCatch({ ...transfer, draftId: QUERY_SMUGGLING_ID });

    // Assert
    const patched = new URL(requestOf(fetchMock, 0).url);
    expect(patched.pathname).toBe(
      '/api/v1/movements/movement-1%3FcreatedByUserId%3Dother-user%23frag',
    );
    expect(patched.search).toBe('');
    expect(patched.hash).toBe('');
  });

  it('el permiso movement:create-transfer decide si la captura de traspaso se monta', () => {
    // Arrange
    auth.permissions = ['movement:create-outbound', 'movement:read'];
    const view = () => (
      <AppProviders client={queryClient()}>
        <PermissionGate permission={MOVEMENT_TYPES.TRANSFER.permission}>
          <p>captura de traspaso</p>
        </PermissionGate>
      </AppProviders>
    );

    // Act
    const { rerender } = render(view());
    const hiddenForOperator = screen.queryByText('captura de traspaso');
    auth.permissions = ['movement:create-transfer'];
    rerender(view());

    // Assert
    expect(MOVEMENT_TYPES.TRANSFER.permission).toBe('movement:create-transfer');
    expect(hiddenForOperator).toBeNull();
    expect(screen.getByText('captura de traspaso')).toBeTruthy();
  });
});
