import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  answer,
  errorBody,
  kardexEntryDto,
  loadApiUnderTest,
  pageOf,
  queryOf,
  queryWrapper,
  session,
  trace,
} from './support/http';

const { fetchMock, useKardex, storeSession, ApiError } = await loadApiUnderTest();

const PRODUCT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const LOCATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function kardex(locationId?: string, page = { page: 1, pageSize: 10 }) {
  const { wrapper } = queryWrapper();
  return renderHook(
    (props: { page: typeof page }) => useKardex(PRODUCT_ID, locationId, props.page),
    {
      wrapper,
      initialProps: { page },
    },
  );
}

describe('RF-24 API - Consultar el kardex de un producto', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  it('pide GET /stock/{productId}/kardex con el id del producto en la ruta', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf([kardexEntryDto()])));

    // Act
    const { result } = kardex();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(trace(fetchMock)).toEqual([`GET /api/v1/stock/${PRODUCT_ID}/kardex`]);
    expect(queryOf(fetchMock)).toEqual({ page: '1', pageSize: '10' });
  });

  it('con bodega elegida la manda como locationId', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf([])));

    // Act
    const { result } = kardex(LOCATION_ID, { page: 2, pageSize: 25 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(queryOf(fetchMock)).toEqual({ page: '2', pageSize: '25', locationId: LOCATION_ID });
  });

  it('entrega el saldo corrido que calcula la API, línea por línea y sin recalcularlo', async () => {
    // Arrange
    const entries = [
      kardexEntryDto({ id: '1', type: 'INBOUND', quantityBase: 24, balanceAfter: 24 }),
      kardexEntryDto({
        id: '2',
        type: 'OUTBOUND',
        quantity: 5,
        unit: 'BOTTLE',
        quantityBase: -5,
        balanceAfter: 19,
      }),
      kardexEntryDto({
        id: '3',
        type: 'ADJUSTMENT',
        quantity: -1,
        unit: 'BOTTLE',
        quantityBase: -1,
        balanceAfter: 18,
      }),
    ];
    fetchMock.mockImplementation(answer(200, pageOf(entries)));

    // Act
    const { result } = kardex();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(result.current.data?.data.map((entry) => entry.balanceAfter)).toEqual([24, 19, 18]);
  });

  it('cambiar de página pide la nueva y conserva la anterior mientras llega', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(200, pageOf([kardexEntryDto()], { total: 30, pageCount: 3 })),
    );
    const { result, rerender } = kardex();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstPage = result.current.data;
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));

    // Act
    rerender({ page: { page: 2, pageSize: 10 } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    // Assert
    expect(queryOf(fetchMock, 1).page).toBe('2');
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data).toBe(firstPage);
  });

  it('un producto inexistente llega como ApiError 404', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(404, errorBody(404, 'Not Found', 'Product not found')));

    // Act
    const { result } = kardex();
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toMatchObject({ status: 404, message: 'Product not found' });
  });
});
