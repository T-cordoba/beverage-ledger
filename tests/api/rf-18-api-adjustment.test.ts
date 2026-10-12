import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  answer,
  bodyOf,
  errorBody,
  loadApiUnderTest,
  movementDto,
  queryWrapper,
  session,
  trace,
} from './support/http';

const { fetchMock, useRegisterMovement, storeSession, ApiError } = await loadApiUnderTest();

const PRODUCT_A = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PRODUCT_B = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const draft = movementDto({ type: 'ADJUSTMENT', status: 'DRAFT', reason: 'Merma por rotura' });
const confirmed = { ...draft, status: 'CONFIRMED' as const };

function register() {
  const { wrapper } = queryWrapper();
  return renderHook(() => useRegisterMovement(), { wrapper }).result;
}

describe('RF-18 API - Registrar un ajuste (ADJUSTMENT)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  it('envía cantidades con signo y el motivo en POST /movements, y confirma', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));
    const result = register();

    // Act
    let movement: unknown;
    await act(async () => {
      movement = await result.current.mutateAsync({
        type: 'ADJUSTMENT',
        items: [
          { productId: PRODUCT_A, quantity: -3, unit: 'BOTTLE' },
          { productId: PRODUCT_B, quantity: 1, unit: 'CASE' },
        ],
        reason: 'Merma por rotura',
      });
    });

    // Assert
    expect(trace(fetchMock)).toEqual([
      'POST /api/v1/movements',
      `POST /api/v1/movements/${draft.id}/confirm`,
    ]);
    expect(await bodyOf(fetchMock, 0)).toEqual({
      type: 'ADJUSTMENT',
      items: [
        { productId: PRODUCT_A, quantity: -3, unit: 'BOTTLE' },
        { productId: PRODUCT_B, quantity: 1, unit: 'CASE' },
      ],
      reason: 'Merma por rotura',
    });
    expect(movement).toMatchObject({
      type: 'ADJUSTMENT',
      status: 'CONFIRMED',
      reason: 'Merma por rotura',
    });
  });

  it('un 400 por motivo faltante lanza ApiError y no confirma', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(
      answer(400, errorBody(400, 'Bad Request', 'An adjustment needs a reason')),
    );
    const result = register();

    // Act
    let failure: unknown;
    await act(async () => {
      failure = await result.current
        .mutateAsync({
          type: 'ADJUSTMENT',
          items: [{ productId: PRODUCT_A, quantity: -1, unit: 'BOTTLE' }],
        })
        .catch((error: unknown) => error);
    });

    // Assert
    expect(await bodyOf(fetchMock, 0)).not.toHaveProperty('reason');
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 400, message: 'An adjustment needs a reason' });
    expect(trace(fetchMock)).toEqual(['POST /api/v1/movements']);
  });

  it('un 400 al confirmar (ajuste negativo deja stock bajo cero) lanza ApiError', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(
        answer(400, errorBody(400, 'Bad Request', 'A line would leave stock below zero')),
      );
    const result = register();

    // Act
    let failure: unknown;
    await act(async () => {
      failure = await result.current
        .mutateAsync({
          type: 'ADJUSTMENT',
          items: [{ productId: PRODUCT_A, quantity: -500, unit: 'BOTTLE' }],
          reason: 'Conteo físico',
        })
        .catch((error: unknown) => error);
    });

    // Assert
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 400, message: 'A line would leave stock below zero' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('el reintento por PATCH reenvía líneas con signo y el motivo corregido', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(200, draft))
      .mockImplementationOnce(answer(200, confirmed));
    const result = register();

    // Act
    await act(async () => {
      await result.current.mutateAsync({
        type: 'ADJUSTMENT',
        items: [{ productId: PRODUCT_A, quantity: -2, unit: 'BOTTLE' }],
        reason: 'Conteo físico corregido',
        draftId: draft.id,
      });
    });

    // Assert
    expect(trace(fetchMock)).toEqual([
      `PATCH /api/v1/movements/${draft.id}`,
      `POST /api/v1/movements/${draft.id}/confirm`,
    ]);
    expect(await bodyOf(fetchMock, 0)).toEqual({
      items: [{ productId: PRODUCT_A, quantity: -2, unit: 'BOTTLE' }],
      reason: 'Conteo físico corregido',
    });
  });

  it('un 403 en el PATCH del borrador se muestra al usuario y no crea un segundo movimiento', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(
      answer(403, errorBody(403, 'Forbidden', 'You may not record this type of movement')),
    );
    const result = register();

    // Act
    let failure: unknown;
    await act(async () => {
      failure = await result.current
        .mutateAsync({
          type: 'ADJUSTMENT',
          items: [{ productId: PRODUCT_A, quantity: -1, unit: 'BOTTLE' }],
          reason: 'Merma',
          draftId: draft.id,
        })
        .catch((error: unknown) => error);
    });

    // Assert
    expect(failure).toMatchObject({ status: 403 });
    expect(trace(fetchMock)).toEqual([`PATCH /api/v1/movements/${draft.id}`]);
  });
});
