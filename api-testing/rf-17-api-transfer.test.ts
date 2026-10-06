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
const ORIGIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DESTINATION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const draft = movementDto({
  type: 'TRANSFER',
  status: 'DRAFT',
  locationId: ORIGIN_ID,
  destinationLocationId: DESTINATION_ID,
});
const confirmed = { ...draft, status: 'CONFIRMED' as const };

function register() {
  const { wrapper } = queryWrapper();
  return renderHook(() => useRegisterMovement(), { wrapper }).result;
}

describe('RF-17 API - Registrar un traspaso (TRANSFER)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  it('envía origen y destino en POST /movements y confirma el traspaso', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));
    const result = register();

    // Act
    let movement: unknown;
    await act(async () => {
      movement = await result.current.mutateAsync({
        type: 'TRANSFER',
        items: [{ productId: PRODUCT_ID, quantity: 4, unit: 'BOTTLE' }],
        locationId: ORIGIN_ID,
        destinationLocationId: DESTINATION_ID,
      });
    });

    // Assert
    expect(trace(fetchMock)).toEqual([
      'POST /api/v1/movements',
      `POST /api/v1/movements/${draft.id}/confirm`,
    ]);
    expect(await bodyOf(fetchMock, 0)).toEqual({
      type: 'TRANSFER',
      items: [{ productId: PRODUCT_ID, quantity: 4, unit: 'BOTTLE' }],
      locationId: ORIGIN_ID,
      destinationLocationId: DESTINATION_ID,
    });
    expect(movement).toMatchObject({
      type: 'TRANSFER',
      status: 'CONFIRMED',
      locationId: ORIGIN_ID,
      destinationLocationId: DESTINATION_ID,
    });
  });

  it('un 400 por destino faltante lanza ApiError con el mensaje de la API', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(
      answer(400, errorBody(400, 'Bad Request', 'A transfer needs a destination location')),
    );
    const result = register();

    // Act
    let failure: unknown;
    await act(async () => {
      failure = await result.current
        .mutateAsync({
          type: 'TRANSFER',
          items: [{ productId: PRODUCT_ID, quantity: 4, unit: 'BOTTLE' }],
          locationId: ORIGIN_ID,
        })
        .catch((error: unknown) => error);
    });

    // Assert
    expect(await bodyOf(fetchMock, 0)).not.toHaveProperty('destinationLocationId');
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({
      status: 400,
      message: 'A transfer needs a destination location',
    });
    expect(trace(fetchMock)).toEqual(['POST /api/v1/movements']);
  });

  it('un 400 al confirmar (origen sin stock) conserva el id del borrador para reintentar', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(
        answer(400, errorBody(400, 'Bad Request', 'A line would leave stock below zero')),
      );
    const opened: string[] = [];
    const result = register();

    // Act
    let failure: unknown;
    await act(async () => {
      failure = await result.current
        .mutateAsync({
          type: 'TRANSFER',
          items: [{ productId: PRODUCT_ID, quantity: 400, unit: 'BOTTLE' }],
          locationId: ORIGIN_ID,
          destinationLocationId: DESTINATION_ID,
          onDraftOpened: (id) => opened.push(id),
        })
        .catch((error: unknown) => error);
    });

    // Assert
    expect(failure).toMatchObject({ status: 400 });
    expect(opened).toEqual([draft.id]);
  });

  it('el reintento por PATCH no reenvía origen ni destino (UpdateMovementDto no los acepta)', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(200, draft))
      .mockImplementationOnce(answer(200, confirmed));
    const result = register();

    // Act
    await act(async () => {
      await result.current.mutateAsync({
        type: 'TRANSFER',
        items: [{ productId: PRODUCT_ID, quantity: 2, unit: 'BOTTLE' }],
        locationId: ORIGIN_ID,
        destinationLocationId: DESTINATION_ID,
        draftId: draft.id,
      });
    });

    // Assert
    expect(trace(fetchMock)).toEqual([
      `PATCH /api/v1/movements/${draft.id}`,
      `POST /api/v1/movements/${draft.id}/confirm`,
    ]);
    expect(await bodyOf(fetchMock, 0)).toEqual({
      items: [{ productId: PRODUCT_ID, quantity: 2, unit: 'BOTTLE' }],
    });
  });

  it('si el borrador ya no es editable (409) crea uno nuevo con origen y destino completos', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(409, errorBody(409, 'Conflict', 'It is no longer a draft')))
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));
    const result = register();

    // Act
    await act(async () => {
      await result.current.mutateAsync({
        type: 'TRANSFER',
        items: [{ productId: PRODUCT_ID, quantity: 2, unit: 'BOTTLE' }],
        locationId: ORIGIN_ID,
        destinationLocationId: DESTINATION_ID,
        draftId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      });
    });

    // Assert
    expect(trace(fetchMock)).toEqual([
      'PATCH /api/v1/movements/dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'POST /api/v1/movements',
      `POST /api/v1/movements/${draft.id}/confirm`,
    ]);
    expect(await bodyOf(fetchMock, 1)).toEqual({
      type: 'TRANSFER',
      items: [{ productId: PRODUCT_ID, quantity: 2, unit: 'BOTTLE' }],
      locationId: ORIGIN_ID,
      destinationLocationId: DESTINATION_ID,
    });
  });
});
