import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCESS_TOKEN,
  AppProviders,
  LEAKY_ERROR_PAGE,
  LEAK_MARKERS,
  QUERY_SMUGGLING_ID,
  TRAVERSAL_ID,
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
  useCancelMovement,
  storeSession,
  forgetSession,
  getAccessToken,
  onSessionLost,
  ApiError,
  describeError,
} = await loadClientUnderTest();
const { MovementDetailView } = await import('@/features/movements/MovementDetailView');

const MOVEMENT_ID = '11111111-1111-4111-8111-111111111111';
const confirmedMovement = movementDto({
  id: MOVEMENT_ID,
  status: 'CONFIRMED',
  confirmedAt: '2026-01-01T00:00:01.000Z',
});
const cancelledMovement = movementDto({
  ...confirmedMovement,
  status: 'CANCELLED',
  cancelledAt: '2026-01-02T00:00:00.000Z',
});

function cancelHook() {
  const { client, wrapper } = queryWrapper();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const { result } = renderHook(() => useCancelMovement(), { wrapper });
  return { result, invalidate };
}

async function cancelAndCatch(input: { id: string; reason: string }) {
  const { result, invalidate } = cancelHook();
  let outcome: unknown;
  await act(async () => {
    outcome = await result.current.mutateAsync(input).catch((error: unknown) => error);
  });
  return { outcome, invalidate };
}

async function renderDetail(movement = confirmedMovement) {
  fetchMock.mockImplementationOnce(answer(200, movement));
  render(
    <AppProviders client={queryClient()}>
      <MovementDetailView id={movement.id} />
    </AppProviders>,
  );
  await screen.findByRole('heading', { name: movement.code });
}

describe('RF-20 Security - Anular un movimiento confirmado', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    forgetSession();
    auth.permissions = [];
  });

  it('el cuerpo de la anulación es exactamente { reason }: no envía estado, fechas ni autor', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementationOnce(answer(200, cancelledMovement));

    // Act
    await cancelAndCatch({ id: MOVEMENT_ID, reason: 'Registro duplicado' });

    // Assert
    expect(trace(fetchMock)).toEqual([`POST /api/v1/movements/${MOVEMENT_ID}/cancel`]);
    expect(await bodyOf(fetchMock, 0)).toEqual({ reason: 'Registro duplicado' });
    expect(requestOf(fetchMock, 0).headers.get('Authorization')).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('un id manipulado (traversal o query smuggling) se codifica y sigue apuntando a /cancel', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(404, errorBody(404, 'Not Found', 'Movement not found')))
      .mockImplementationOnce(answer(404, errorBody(404, 'Not Found', 'Movement not found')));

    // Act
    await cancelAndCatch({ id: TRAVERSAL_ID, reason: 'Intento manipulado' });
    await cancelAndCatch({ id: QUERY_SMUGGLING_ID, reason: 'Intento manipulado' });

    // Assert
    const [traversal, smuggled] = [0, 1].map((call) => new URL(requestOf(fetchMock, call).url));
    expect(traversal.pathname).toBe('/api/v1/movements/..%2F..%2Fauth%2Flogout/cancel');
    expect(smuggled.pathname).toBe(
      '/api/v1/movements/movement-1%3FcreatedByUserId%3Dother-user%23frag/cancel',
    );
    expect(smuggled.search).toBe('');
    expect(trace(fetchMock)).not.toContain('POST /api/v1/auth/logout');
  });

  it('sin sesión la anulación no lleva Authorization, falla con 401 y no invalida cachés', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Invalid refresh token')))
      .mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Unauthorized')));

    // Act
    const { outcome, invalidate } = await cancelAndCatch({ id: MOVEMENT_ID, reason: 'Duplicado' });

    // Assert
    expect(requestOf(fetchMock, 1).headers.get('Authorization')).toBeNull();
    expect(outcome).toBeInstanceOf(ApiError);
    expect(outcome).toMatchObject({ status: 401 });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('un 401 durante la anulación invalida la sesión en memoria y avisa para volver al login', async () => {
    // Arrange
    storeSession(session());
    const sessionLost = vi.fn();
    const unsubscribe = onSessionLost(sessionLost);
    fetchMock.mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Token expired')));

    // Act
    await cancelAndCatch({ id: MOVEMENT_ID, reason: 'Duplicado' });
    unsubscribe();

    // Assert
    expect(getAccessToken()).toBeNull();
    expect(sessionLost).toHaveBeenCalledTimes(1);
  });

  it('una anulación no autorizada (403) no reintenta, no invalida cachés y conserva la sesión', async () => {
    // Arrange: an operator does not hold movement:cancel.
    storeSession(session());
    fetchMock.mockImplementationOnce(
      answer(403, errorBody(403, 'Forbidden', 'Insufficient permissions')),
    );

    // Act
    const { outcome, invalidate } = await cancelAndCatch({ id: MOVEMENT_ID, reason: 'Duplicado' });

    // Assert
    expect(outcome).toMatchObject({ status: 403, message: 'Insufficient permissions' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe(ACCESS_TOKEN);
  });

  it('el id de otra organización responde 404 y el error no revela detalles del servidor', async () => {
    // Arrange
    storeSession(session());
    fetchMock
      .mockImplementationOnce(answer(404, errorBody(404, 'Not Found', 'Movement not found')))
      .mockImplementationOnce(rawAnswer(500, LEAKY_ERROR_PAGE, 'text/html'));

    // Act
    const foreign = await cancelAndCatch({
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      reason: 'x'.repeat(8),
    });
    const crashed = await cancelAndCatch({ id: MOVEMENT_ID, reason: 'Duplicado' });
    const shown = [foreign.outcome, crashed.outcome].map((e) =>
      describeError(e, 'Inténtalo de nuevo.'),
    );

    // Assert
    expect(shown[0]).toBe('Movement not found');
    expect(shown[1]).toBe('Request failed with status 500');
    for (const marker of LEAK_MARKERS) expect(shown.join(' ')).not.toContain(marker);
  });

  it('un motivo con XSS se envía literal en JSON, sin ejecutarse ni alterarse', async () => {
    // Arrange
    storeSession(session());
    const reason = `Duplicado ${XSS_PAYLOAD}`;
    fetchMock.mockImplementationOnce(answer(200, cancelledMovement));

    // Act
    await cancelAndCatch({ id: MOVEMENT_ID, reason });

    // Assert
    expect(requestOf(fetchMock, 0).headers.get('Content-Type')).toBe('application/json');
    expect(await bodyOf(fetchMock, 0)).toEqual({ reason });
  });

  it('sin movement:cancel el detalle no ofrece anular; con él sí, y nunca sobre uno ya anulado', async () => {
    // Arrange
    storeSession(session());

    // Act
    auth.permissions = ['movement:read', 'movement:create-outbound'];
    await renderDetail();
    const forOperator = screen.queryByRole('button', { name: 'Anular' });
    cleanup();

    auth.permissions = ['movement:read', 'movement:cancel'];
    await renderDetail();
    const forManager = screen.queryByRole('button', { name: 'Anular' });
    cleanup();

    await renderDetail(cancelledMovement);
    const onCancelled = screen.queryByRole('button', { name: 'Anular' });

    // Assert
    expect(forOperator).toBeNull();
    expect(forManager).not.toBeNull();
    expect(onCancelled).toBeNull();
    expect(trace(fetchMock).every((call) => call.startsWith('GET '))).toBe(true);
  });

  it('el diálogo no envía la anulación con motivo vacío, de solo espacios o demasiado corto', async () => {
    // Arrange
    storeSession(session());
    auth.permissions = ['movement:read', 'movement:cancel'];
    await renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Anular' }));
    const input = await screen.findByPlaceholderText('¿Por qué se anula?');
    const submit = () => fireEvent.submit(input.closest('form') as HTMLFormElement);

    // Act
    for (const reason of ['', '      ', 'abc']) {
      fireEvent.change(input, { target: { value: reason } });
      await act(async () => submit());
    }

    // Assert
    expect(trace(fetchMock)).toEqual([`GET /api/v1/movements/${MOVEMENT_ID}`]);
  });

  it('un motivo con XSS que vuelve de la API se pinta como texto, nunca como HTML', async () => {
    // Arrange
    storeSession(session());
    const reason = `Duplicado ${XSS_PAYLOAD}`;

    // Act
    await renderDetail(movementDto({ ...cancelledMovement, reason }));

    // Assert
    expect(screen.getByText(reason)).toBeTruthy();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(document.querySelector('[onerror]')).toBeNull();
  });
});
