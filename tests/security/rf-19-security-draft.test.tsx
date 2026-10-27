import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCESS_TOKEN,
  QUERY_SMUGGLING_ID,
  TRAVERSAL_ID,
  UPDATE_MOVEMENT_KEYS,
  XSS_PAYLOAD,
  answer,
  bodyOf,
  errorBody,
  loadClientUnderTest,
  movementDto,
  queryWrapper,
  requestOf,
  session,
  tokenInBrowserStorage,
  trace,
} from './support/security-harness';

const {
  fetchMock,
  useMovementDraft,
  useOpenDraft,
  useResumeDraft,
  openDraft,
  storeSession,
  forgetSession,
  getAccessToken,
  onSessionLost,
} = await loadClientUnderTest();

const STORAGE_KEY = 'beverage-ledger:movement-draft:OUTBOUND';
const product = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: XSS_PAYLOAD,
  category: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Ron' },
  brand: null,
  subcategory: null,
  abv: 35,
  origin: null,
  age: null,
  caseSize: 12,
  minimumStock: null,
  isActive: true,
};

async function resumeAndCatch(id: string) {
  const { wrapper } = queryWrapper();
  const { result } = renderHook(() => useResumeDraft(), { wrapper });
  let outcome: unknown;
  await act(async () => {
    outcome = await result.current.mutateAsync(id).catch((error: unknown) => error);
  });
  return outcome;
}

describe('RF-19 Security - Guardar y retomar un borrador de movimiento', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    forgetSession();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('el borrador guardado en localStorage nunca contiene el token de acceso', () => {
    // Arrange
    storeSession(session());
    const { result } = renderHook(() => useMovementDraft('OUTBOUND'));

    // Act
    act(() => {
      result.current.adjust(product, 'BOTTLE', 2);
      result.current.setNote('Nota de prueba');
    });

    // Assert
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('Nota de prueba');
    expect(tokenInBrowserStorage()).toBe(false);
    expect(getAccessToken()).toBe(ACCESS_TOKEN);
  });

  it('un borrador corrupto en localStorage se descarta como vacío en vez de romper la pantalla', () => {
    // Arrange
    window.localStorage.setItem(STORAGE_KEY, '{"lines": {"x": <script>alert(1)</script>');

    // Act
    const { result } = renderHook(() => useMovementDraft('OUTBOUND'));

    // Assert
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.pendingMovementId).toBeNull();
  });

  it('un borrador manipulado con __proto__ no contamina el prototipo de los objetos', () => {
    // Arrange
    window.localStorage.setItem(
      STORAGE_KEY,
      '{"__proto__": {"polluted": "sí"}, "constructor": {"prototype": {"polluted": "sí"}}}',
    );

    // Act
    renderHook(() => useMovementDraft('OUTBOUND'));

    // Assert
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('el PATCH de un borrador solo lleva campos de UpdateMovementDto: ni tipo ni bodegas', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementationOnce(answer(200, movementDto()));

    // Act
    await openDraft({
      type: 'ADJUSTMENT',
      locationId: 'otra-bodega',
      destinationLocationId: 'otra-mas',
      items: [{ productId: product.id, quantity: 1, unit: 'BOTTLE' }],
      note: 'nota',
      draftId: '11111111-1111-4111-8111-111111111111',
    });

    // Assert
    const body = await bodyOf(fetchMock);
    expect(Object.keys(body).every((key) => UPDATE_MOVEMENT_KEYS.includes(key))).toBe(true);
    expect(body).not.toHaveProperty('type');
    expect(body).not.toHaveProperty('locationId');
    expect(body).not.toHaveProperty('draftId');
  });

  it('un id de borrador manipulado queda codificado en la ruta y no alcanza otro endpoint', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementation(answer(404, errorBody(404, 'Not Found', 'Movement not found')));

    // Act
    await resumeAndCatch(TRAVERSAL_ID);
    await resumeAndCatch(QUERY_SMUGGLING_ID);

    // Assert
    const [traversal, smuggled] = [0, 1].map((call) => new URL(requestOf(fetchMock, call).url));
    expect(traversal.pathname).toBe('/api/v1/movements/..%2F..%2Fauth%2Flogout');
    expect(smuggled.pathname).toBe(
      '/api/v1/movements/movement-1%3FcreatedByUserId%3Dother-user%23frag',
    );
    expect(smuggled.search).toBe('');
    expect(trace(fetchMock)).not.toContain('POST /api/v1/auth/logout');
  });

  it('un 401 al buscar el borrador abierto cierra la sesión local y avisa para volver al login', async () => {
    // Arrange
    storeSession(session());
    const sessionLost = vi.fn();
    const unsubscribe = onSessionLost(sessionLost);
    fetchMock.mockImplementation(answer(401, errorBody(401, 'Unauthorized', 'Token expired')));
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useOpenDraft('OUTBOUND', 'user-1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    unsubscribe();

    // Assert
    expect(getAccessToken()).toBeNull();
    expect(sessionLost).toHaveBeenCalledTimes(1);
  });

  it('el token viaja solo en la cabecera Authorization, nunca en la URL de la búsqueda', async () => {
    // Arrange
    storeSession(session());
    fetchMock.mockImplementation(
      answer(200, { data: [], meta: { page: 1, pageSize: 1, total: 0, pageCount: 1, count: 0 } }),
    );
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useOpenDraft('OUTBOUND', 'user-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(requestOf(fetchMock).headers.get('Authorization')).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(requestOf(fetchMock).url).not.toContain(ACCESS_TOKEN);
  });
});
