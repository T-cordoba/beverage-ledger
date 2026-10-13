import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  answer,
  bodyOf,
  errorBody,
  loadApiUnderTest,
  movementDto,
  pageOf,
  productDto,
  queryOf,
  queryWrapper,
  requestOf,
  session,
  trace,
} from './support/http';

const { fetchMock, useOpenDraft, useResumeDraft, openDraft, storeSession, ApiError } =
  await loadApiUnderTest();

const DRAFT_ID = '22222222-2222-4222-8222-222222222222';
const RUM = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001';
const GIN = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000002';
const ORIGIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DESTINATION = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const item = (
  productId: string,
  quantity: number,
  unit: 'BOTTLE' | 'CASE',
  quantityBase: number,
) => ({
  id: `${productId.slice(0, 30)}${unit === 'CASE' ? 'c' : 'b'}`,
  productId,
  locationId: ORIGIN,
  quantity,
  unit,
  quantityBase,
  productNameSnapshot: productId === RUM ? 'Ron' : 'Ginebra',
  brandNameSnapshot: null,
});

const summary = {
  id: DRAFT_ID,
  code: 'MOV-2026-000042',
  type: 'OUTBOUND' as const,
  status: 'DRAFT' as const,
  occurredAt: '2026-01-01T00:00:00.000Z',
  note: null,
  createdBy: { id: 'user-1', name: 'Administrador de prueba' },
  itemCount: 2,
};

function resume() {
  const { wrapper } = queryWrapper();
  return renderHook(() => useResumeDraft(), { wrapper }).result;
}

describe('RF-19 API - Guardar y retomar un borrador de movimiento', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  it('busca el borrador abierto con GET /movements filtrado por tipo, estado DRAFT y autor', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf([summary], { pageSize: 1 })));
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useOpenDraft('OUTBOUND', 'user-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(trace(fetchMock)).toEqual(['GET /api/v1/movements']);
    expect(queryOf(fetchMock)).toEqual({
      type: 'OUTBOUND',
      status: 'DRAFT',
      createdByUserId: 'user-1',
      pageSize: '1',
    });
    expect(requestOf(fetchMock).headers.get('Authorization')).toBe('Bearer access-token-de-prueba');
    expect(result.current.data).toEqual(summary);
  });

  it('sin borrador abierto la respuesta vacía se traduce a null, no a undefined', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf([])));
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useOpenDraft('INBOUND', 'user-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(result.current.data).toBeNull();
  });

  it('no consulta la API mientras no se conoce el usuario de la sesión', async () => {
    // Arrange
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useOpenDraft('OUTBOUND', undefined), { wrapper });

    // Assert
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retomar son dos peticiones: el movimiento y luego sus productos por id', async () => {
    // Arrange
    const movement = movementDto({
      id: DRAFT_ID,
      items: [item(RUM, 2, 'CASE', 24), item(RUM, 3, 'BOTTLE', 3), item(GIN, 1, 'BOTTLE', 1)],
    });
    fetchMock
      .mockImplementationOnce(answer(200, movement))
      .mockImplementationOnce(
        answer(200, pageOf([productDto({ id: RUM }), productDto({ id: GIN, name: 'Ginebra' })])),
      );
    const result = resume();

    // Act
    let restored: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      restored = await result.current.mutateAsync(DRAFT_ID);
    });

    // Assert
    expect(trace(fetchMock)).toEqual([`GET /api/v1/movements/${DRAFT_ID}`, 'GET /api/v1/products']);
    expect(queryOf(fetchMock, 1)).toEqual({
      productIds: `${RUM},${GIN}`,
      status: 'all',
      pageSize: '2',
    });
    expect(restored?.movementId).toBe(DRAFT_ID);
    expect(restored?.lines.map(({ product, BOTTLE, CASE }) => [product.id, BOTTLE, CASE])).toEqual([
      [RUM, 3, 2],
      [GIN, 1, 0],
    ]);
  });

  it('de un traspaso solo lee la mitad saliente, para no duplicar cada línea', async () => {
    // Arrange
    const transfer = movementDto({
      id: DRAFT_ID,
      type: 'TRANSFER',
      locationId: ORIGIN,
      destinationLocationId: DESTINATION,
      items: [
        { ...item(RUM, 4, 'BOTTLE', -4), locationId: ORIGIN },
        { ...item(RUM, 4, 'BOTTLE', 4), id: 'in', locationId: DESTINATION },
      ],
    });
    fetchMock
      .mockImplementationOnce(answer(200, transfer))
      .mockImplementationOnce(answer(200, pageOf([productDto({ id: RUM })])));
    const result = resume();

    // Act
    let restored: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      restored = await result.current.mutateAsync(DRAFT_ID);
    });

    // Assert
    expect(restored?.lines).toHaveLength(1);
    expect(restored?.lines[0]).toMatchObject({ BOTTLE: 4, CASE: 0 });
    expect(restored?.destinationLocationId).toBe(DESTINATION);
  });

  it('un borrador que ya no existe llega como ApiError 404 y no pide los productos', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(404, errorBody(404, 'Not Found', 'Movement not found')));
    const result = resume();

    // Act
    let caught: unknown;
    await act(async () => {
      caught = await result.current.mutateAsync(DRAFT_ID).catch((error: unknown) => error);
    });

    // Assert
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({ status: 404, message: 'Movement not found' });
    expect(trace(fetchMock)).toEqual([`GET /api/v1/movements/${DRAFT_ID}`]);
  });

  it('con un borrador pendiente reutiliza ese mismo id con PATCH en vez de abrir otro', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, movementDto({ id: DRAFT_ID })));
    const items = [{ productId: RUM, quantity: 2, unit: 'BOTTLE' as const }];

    // Act
    const movement = await openDraft({ type: 'OUTBOUND', items, draftId: DRAFT_ID });

    // Assert
    expect(trace(fetchMock)).toEqual([`PATCH /api/v1/movements/${DRAFT_ID}`]);
    expect(await bodyOf(fetchMock)).toEqual({ items });
    expect(movement.id).toBe(DRAFT_ID);
  });

  it.each([404, 409])(
    'si el PATCH responde %i el borrador se abandona y se abre uno nuevo con POST',
    async (status) => {
      // Arrange
      fetchMock
        .mockImplementationOnce(answer(status, errorBody(status, 'Gone', 'Draft unusable')))
        .mockImplementationOnce(answer(201, movementDto({ id: 'nuevo-borrador' })));
      const items = [{ productId: RUM, quantity: 1, unit: 'CASE' as const }];

      // Act
      const movement = await openDraft({ type: 'OUTBOUND', items, draftId: DRAFT_ID });

      // Assert
      expect(trace(fetchMock)).toEqual([
        `PATCH /api/v1/movements/${DRAFT_ID}`,
        'POST /api/v1/movements',
      ]);
      expect(await bodyOf(fetchMock, 1)).toEqual({ type: 'OUTBOUND', items });
      expect(movement.id).toBe('nuevo-borrador');
    },
  );

  it('cualquier otro fallo del PATCH se le muestra al usuario y no abre un segundo movimiento', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(400, errorBody(400, 'Bad Request', ['items.0.quantity must be a positive number'])),
    );

    // Act
    const caught = await openDraft({
      type: 'OUTBOUND',
      items: [{ productId: RUM, quantity: -1, unit: 'BOTTLE' }],
      draftId: DRAFT_ID,
    }).catch((error: unknown) => error);

    // Assert
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as InstanceType<typeof ApiError>).messages).toEqual([
      'items.0.quantity must be a positive number',
    ]);
    expect(trace(fetchMock)).toEqual([`PATCH /api/v1/movements/${DRAFT_ID}`]);
  });
});
