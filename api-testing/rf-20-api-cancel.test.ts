import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  answer,
  bodyOf,
  errorBody,
  loadApiUnderTest,
  movementDto,
  queryWrapper,
  requestOf,
  session,
  trace,
} from './support/http';

const { fetchMock, useCancelMovement, storeSession, ApiError } = await loadApiUnderTest();

const MOVEMENT_ID = '11111111-1111-4111-8111-111111111111';
const cancelled = movementDto({
  id: MOVEMENT_ID,
  status: 'CANCELLED',
  confirmedAt: '2026-01-01T00:00:01.000Z',
  cancelledAt: '2026-01-02T00:00:00.000Z',
});

function cancelHook() {
  const { client, wrapper } = queryWrapper();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const result = renderHook(() => useCancelMovement(), { wrapper }).result;
  return { result, invalidate };
}

async function cancelAndCatch(
  result: ReturnType<typeof cancelHook>['result'],
  input: { id: string; reason: string },
) {
  let failure: unknown;
  await act(async () => {
    failure = await result.current.mutateAsync(input).catch((error: unknown) => error);
  });
  return failure;
}

describe('RF-20 API - Anular un movimiento confirmado', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  it('envía POST /movements/{id}/cancel con el motivo y devuelve el movimiento CANCELLED', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(answer(200, cancelled));
    const { result } = cancelHook();

    // Act
    let movement: unknown;
    await act(async () => {
      movement = await result.current.mutateAsync({
        id: MOVEMENT_ID,
        reason: 'Registro duplicado',
      });
    });

    // Assert
    expect(trace(fetchMock)).toEqual([`POST /api/v1/movements/${MOVEMENT_ID}/cancel`]);
    expect(await bodyOf(fetchMock, 0)).toEqual({ reason: 'Registro duplicado' });
    expect(requestOf(fetchMock, 0).headers.get('Authorization')).toBe(
      'Bearer access-token-de-prueba',
    );
    expect(movement).toMatchObject({
      id: MOVEMENT_ID,
      status: 'CANCELLED',
      cancelledAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('tras anular invalida las cachés de movimientos, existencias y reportes', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(answer(200, cancelled));
    const { result, invalidate } = cancelHook();

    // Act
    await act(async () => {
      await result.current.mutateAsync({ id: MOVEMENT_ID, reason: 'Registro duplicado' });
    });

    // Assert
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey?.[0]);
    expect(keys).toEqual(expect.arrayContaining(['movements', 'stock', 'reports']));
  });

  it('un 409 (ya anulado) lanza ApiError y no invalida cachés', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(
      answer(409, errorBody(409, 'Conflict', 'It is already cancelled')),
    );
    const { result, invalidate } = cancelHook();

    // Act
    const failure = await cancelAndCatch(result, { id: MOVEMENT_ID, reason: 'Otra vez' });

    // Assert
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 409, message: 'It is already cancelled' });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('un 400 (revertir dejaría stock bajo cero) lanza ApiError con el mensaje de la API', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(
      answer(400, errorBody(400, 'Bad Request', 'Reverting it would leave stock below zero')),
    );
    const { result } = cancelHook();

    // Act
    const failure = await cancelAndCatch(result, { id: MOVEMENT_ID, reason: 'Error de captura' });

    // Assert
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({
      status: 400,
      message: 'Reverting it would leave stock below zero',
    });
  });

  it('un 403 (sin permisos) lanza ApiError con status 403', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(
      answer(403, errorBody(403, 'Forbidden', 'Insufficient permissions')),
    );
    const { result } = cancelHook();

    // Act
    const failure = await cancelAndCatch(result, { id: MOVEMENT_ID, reason: 'Error de captura' });

    // Assert
    expect(failure).toMatchObject({ status: 403, message: 'Insufficient permissions' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
