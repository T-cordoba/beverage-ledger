import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  answer,
  errorBody,
  loadApiUnderTest,
  pageOf,
  queryOf,
  queryWrapper,
  requestOf,
  session,
  stockLevelDto,
  trace,
} from './support/http';

const { fetchMock, useStockLevels, useStockAvailability, storeSession, ApiError } =
  await loadApiUnderTest();

const LOCATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CATEGORY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const productId = (n: number) => `bbbbbbbb-bbbb-4bbb-8bbb-${n.toString().padStart(12, '0')}`;

function levels(query: Parameters<typeof useStockLevels>[0], page = { page: 1, pageSize: 10 }) {
  const { wrapper } = queryWrapper();
  return renderHook(() => useStockLevels(query, page), { wrapper }).result;
}

describe('RF-22 API - Consultar las existencias actuales', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  it('pide GET /stock con la página y el token de la sesión', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf([stockLevelDto()])));

    // Act
    const result = levels({});
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(trace(fetchMock)).toEqual(['GET /api/v1/stock']);
    expect(queryOf(fetchMock)).toEqual({ page: '1', pageSize: '10' });
    expect(requestOf(fetchMock).headers.get('Authorization')).toBe('Bearer access-token-de-prueba');
  });

  it('envía bodega y categoría como query params cuando están elegidas', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf([])));

    // Act
    const result = levels(
      { locationId: LOCATION_ID, categoryId: CATEGORY_ID },
      { page: 3, pageSize: 25 },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(queryOf(fetchMock)).toEqual({
      locationId: LOCATION_ID,
      categoryId: CATEGORY_ID,
      page: '3',
      pageSize: '25',
    });
  });

  it('devuelve filas y meta tal como las entrega la API', async () => {
    // Arrange
    const rows = [
      stockLevelDto({ productId: productId(1), quantityBase: 0, isBelowMinimum: true }),
      stockLevelDto({ productId: productId(2), productName: 'Aguardiente Antioqueño' }),
    ];
    const page = pageOf(rows, { total: 37, pageCount: 4 });
    fetchMock.mockImplementation(answer(200, page));

    // Act
    const result = levels({});
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(result.current.data).toEqual(page);
  });

  it('un fallo del servidor llega como ApiError con su estado y mensaje', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(500, errorBody(500, 'Internal Server Error', 'Stock projection unavailable')),
    );

    // Act
    const result = levels({});
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toMatchObject({
      status: 500,
      message: 'Stock projection unavailable',
    });
  });

  it('la disponibilidad por producto pide los ids ordenados y unidos por comas', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(
        200,
        pageOf([
          stockLevelDto({ productId: productId(1), quantityBase: 5 }),
          stockLevelDto({ productId: productId(2), quantityBase: 0 }),
        ]),
      ),
    );
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(
      () => useStockAvailability([productId(2), productId(1)], LOCATION_ID),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Assert
    expect(queryOf(fetchMock)).toEqual({
      productIds: `${productId(1)},${productId(2)}`,
      pageSize: '2',
      locationId: LOCATION_ID,
    });
    expect([...result.current.levels]).toEqual([
      [productId(1), 5],
      [productId(2), 0],
    ]);
  });

  it('parte más de 50 productos en tandas de 50 para no superar el tope de la ruta', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf([])));
    const ids = Array.from({ length: 120 }, (_, i) => productId(i + 1));
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useStockAvailability(ids), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Assert
    const sizes = fetchMock.mock.calls.map((_, call) => queryOf(fetchMock, call).pageSize);
    expect(sizes.sort()).toEqual(['20', '50', '50']);
    expect(
      fetchMock.mock.calls.every((_, call) => !('locationId' in queryOf(fetchMock, call))),
    ).toBe(true);
  });

  it('deshabilitada no envía nada y nunca se declara lista', async () => {
    // Arrange
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useStockAvailability([productId(1)], undefined, false), {
      wrapper,
    });

    // Assert
    expect(result.current.isReady).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
