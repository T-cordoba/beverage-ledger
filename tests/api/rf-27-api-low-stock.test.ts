import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  answer,
  errorBody,
  loadApiUnderTest,
  queryOf,
  queryWrapper,
  requestOf,
  session,
  stockLevelDto,
  trace,
} from './support/http';

const { fetchMock, useLowStock, storeSession, ApiError } = await loadApiUnderTest();

function lowStock(limit: number, enabled = true) {
  const { wrapper } = queryWrapper();
  return renderHook(() => useLowStock(limit, enabled), { wrapper }).result;
}

describe('RF-27 API - Productos bajo el stock mínimo', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  it('pide GET /stock/low con el límite de la tarjeta y el token', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, []));

    // Act
    const result = lowStock(8);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(trace(fetchMock)).toEqual(['GET /api/v1/stock/low']);
    expect(queryOf(fetchMock)).toEqual({ limit: '8' });
    expect(requestOf(fetchMock).headers.get('Authorization')).toBe('Bearer access-token-de-prueba');
  });

  it('la respuesta es una lista, no una página, y conserva el orden de la API', async () => {
    // Arrange
    const rows = [
      stockLevelDto({
        productId: 'p-1',
        productName: 'Ginebra',
        quantityBase: 0,
        isBelowMinimum: true,
      }),
      stockLevelDto({
        productId: 'p-2',
        productName: 'Tequila',
        quantityBase: 3,
        isBelowMinimum: true,
      }),
    ];
    fetchMock.mockImplementation(answer(200, rows));

    // Act
    const result = lowStock(8);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(result.current.data).toEqual(rows);
    expect(result.current.data?.every((row) => row.isBelowMinimum)).toBe(true);
  });

  it('sin productos bajo mínimo devuelve una lista vacía', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, []));

    // Act
    const result = lowStock(8);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(result.current.data).toEqual([]);
  });

  it('deshabilitada no envía la petición', () => {
    // Act
    const result = lowStock(8, false);

    // Assert
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un límite fuera de rango vuelve como ApiError 400 con los mensajes de validación', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(400, errorBody(400, 'Bad Request', ['limit must not be greater than 100'])),
    );

    // Act
    const result = lowStock(500);
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as InstanceType<typeof ApiError>).messages).toEqual([
      'limit must not be greater than 100',
    ]);
  });
});
