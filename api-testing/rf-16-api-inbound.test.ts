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

const PRODUCT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const draft = movementDto({ type: 'INBOUND', status: 'DRAFT' });
const confirmed = movementDto({ type: 'INBOUND', status: 'CONFIRMED' });

function register() {
  const { wrapper } = queryWrapper();
  return renderHook(() => useRegisterMovement(), { wrapper }).result;
}

describe('RF-16 API - Registrar una entrada (INBOUND)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  it('crea la entrada con fecha, nota y líneas en cajas y botellas, y la confirma', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));
    const result = register();

    // Act
    let movement: unknown;
    await act(async () => {
      movement = await result.current.mutateAsync({
        type: 'INBOUND',
        items: [
          { productId: PRODUCT_ID, quantity: 1, unit: 'BOTTLE' },
          { productId: PRODUCT_ID, quantity: 3, unit: 'CASE' },
        ],
        occurredAt: '2026-01-15T05:00:00.000Z',
        note: 'Factura 123',
      });
    });

    // Assert
    expect(trace(fetchMock)).toEqual([
      'POST /api/v1/movements',
      `POST /api/v1/movements/${draft.id}/confirm`,
    ]);
    expect(await bodyOf(fetchMock, 0)).toEqual({
      type: 'INBOUND',
      items: [
        { productId: PRODUCT_ID, quantity: 1, unit: 'BOTTLE' },
        { productId: PRODUCT_ID, quantity: 3, unit: 'CASE' },
      ],
      occurredAt: '2026-01-15T05:00:00.000Z',
      note: 'Factura 123',
    });
    expect(movement).toMatchObject({ type: 'INBOUND', status: 'CONFIRMED' });
  });

  it('una entrada no envía destinationLocationId ni reason cuando no se capturan', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));
    const result = register();

    // Act
    await act(async () => {
      await result.current.mutateAsync({
        type: 'INBOUND',
        items: [{ productId: PRODUCT_ID, quantity: 6, unit: 'BOTTLE' }],
        destinationLocationId: undefined,
        reason: undefined,
      });
    });

    // Assert
    const body = await bodyOf(fetchMock, 0);
    expect(body).not.toHaveProperty('destinationLocationId');
    expect(body).not.toHaveProperty('reason');
  });

  it('un 403 al crear (rol sin permiso) lanza ApiError y no intenta confirmar', async () => {
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
          type: 'INBOUND',
          items: [{ productId: PRODUCT_ID, quantity: 6, unit: 'BOTTLE' }],
        })
        .catch((error: unknown) => error);
    });

    // Assert
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({
      status: 403,
      message: 'You may not record this type of movement',
    });
    expect(trace(fetchMock)).toEqual(['POST /api/v1/movements']);
  });

  it('un 400 de validación expone cada mensaje por campo en ApiError.messages', async () => {
    // Arrange
    const messages = ['items.0.productId must be a UUID', 'items.0.quantity must be positive'];
    fetchMock.mockImplementationOnce(answer(400, errorBody(400, 'Bad Request', messages)));
    const result = register();

    // Act
    let failure: unknown;
    await act(async () => {
      failure = await result.current
        .mutateAsync({
          type: 'INBOUND',
          items: [{ productId: 'no-es-uuid', quantity: 0, unit: 'BOTTLE' }],
        })
        .catch((error: unknown) => error);
    });

    // Assert
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as InstanceType<typeof ApiError>).messages).toEqual(messages);
    expect((failure as Error).message).toBe(messages.join('. '));
  });

  it('si el borrador recordado ya no existe (404) abre uno nuevo con POST /movements', async () => {
    // Arrange
    const staleId = '99999999-9999-4999-8999-999999999999';
    fetchMock
      .mockImplementationOnce(answer(404, errorBody(404, 'Not Found', 'Movement not found')))
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));
    const result = register();

    // Act
    await act(async () => {
      await result.current.mutateAsync({
        type: 'INBOUND',
        items: [{ productId: PRODUCT_ID, quantity: 6, unit: 'BOTTLE' }],
        draftId: staleId,
      });
    });

    // Assert
    expect(trace(fetchMock)).toEqual([
      `PATCH /api/v1/movements/${staleId}`,
      'POST /api/v1/movements',
      `POST /api/v1/movements/${draft.id}/confirm`,
    ]);
    // draftId is a client-side handle and never reaches the create payload.
    expect(await bodyOf(fetchMock, 1)).toEqual({
      type: 'INBOUND',
      items: [{ productId: PRODUCT_ID, quantity: 6, unit: 'BOTTLE' }],
    });
  });
});
