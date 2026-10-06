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

const { fetchMock, useRegisterMovement, storeSession, getAccessToken, ApiError } =
  await loadApiUnderTest();

const PRODUCT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const LOCATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const draft = movementDto({ type: 'OUTBOUND', status: 'DRAFT' });
const confirmed = movementDto({
  type: 'OUTBOUND',
  status: 'CONFIRMED',
  confirmedAt: '2026-01-01T00:00:01.000Z',
});

function register() {
  const { wrapper } = queryWrapper();
  return renderHook(() => useRegisterMovement(), { wrapper }).result;
}

describe('RF-15 API - Registrar una salida (OUTBOUND)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  it('abre el borrador con POST /movements y lo confirma con POST /movements/{id}/confirm', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));
    const result = register();

    // Act
    let movement: unknown;
    await act(async () => {
      movement = await result.current.mutateAsync({
        type: 'OUTBOUND',
        items: [{ productId: PRODUCT_ID, quantity: 2, unit: 'CASE' }],
        locationId: LOCATION_ID,
      });
    });

    // Assert
    expect(trace(fetchMock)).toEqual([
      'POST /api/v1/movements',
      `POST /api/v1/movements/${draft.id}/confirm`,
    ]);
    expect(await bodyOf(fetchMock, 0)).toEqual({
      type: 'OUTBOUND',
      items: [{ productId: PRODUCT_ID, quantity: 2, unit: 'CASE' }],
      locationId: LOCATION_ID,
    });
    expect(movement).toEqual(confirmed);
  });

  it('envía el bearer token y JSON en la creación; la confirmación no lleva cuerpo', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(answer(200, confirmed));
    const result = register();

    // Act
    await act(async () => {
      await result.current.mutateAsync({
        type: 'OUTBOUND',
        items: [{ productId: PRODUCT_ID, quantity: 1, unit: 'BOTTLE' }],
      });
    });

    // Assert
    const create = requestOf(fetchMock, 0);
    const confirm = requestOf(fetchMock, 1);
    expect(create.headers.get('Authorization')).toBe('Bearer access-token-de-prueba');
    expect(create.headers.get('Content-Type')).toBe('application/json');
    expect(create.credentials).toBe('include');
    expect(confirm.headers.get('Authorization')).toBe('Bearer access-token-de-prueba');
    expect(confirm.body).toBeNull();
    // Without a location the API resolves the default one, so the key is omitted.
    expect(await bodyOf(fetchMock, 0)).not.toHaveProperty('locationId');
  });

  it('un 400 al confirmar (stock insuficiente) lanza ApiError y deja el borrador recordado', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(201, draft))
      .mockImplementationOnce(
        answer(400, errorBody(400, 'Bad Request', 'A line would leave stock below zero')),
      );
    const onDraftOpened = vi.fn();
    const result = register();

    // Act
    let failure: unknown;
    await act(async () => {
      failure = await result.current
        .mutateAsync({
          type: 'OUTBOUND',
          items: [{ productId: PRODUCT_ID, quantity: 999, unit: 'BOTTLE' }],
          onDraftOpened,
        })
        .catch((error: unknown) => error);
    });

    // Assert
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 400, message: 'A line would leave stock below zero' });
    expect(onDraftOpened).toHaveBeenCalledWith(draft.id);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The callback is a client-side hook and never travels in the payload.
    expect(await bodyOf(fetchMock, 0)).not.toHaveProperty('onDraftOpened');
  });

  it('reintentar con draftId actualiza el borrador con PATCH /movements/{id} en vez de crear otro', async () => {
    // Arrange
    fetchMock
      .mockImplementationOnce(answer(200, draft))
      .mockImplementationOnce(answer(200, confirmed));
    const result = register();

    // Act
    await act(async () => {
      await result.current.mutateAsync({
        type: 'OUTBOUND',
        items: [{ productId: PRODUCT_ID, quantity: 3, unit: 'BOTTLE' }],
        locationId: LOCATION_ID,
        note: 'Reintento',
        draftId: draft.id,
      });
    });

    // Assert
    expect(trace(fetchMock)).toEqual([
      `PATCH /api/v1/movements/${draft.id}`,
      `POST /api/v1/movements/${draft.id}/confirm`,
    ]);
    // UpdateMovementDto only takes these fields: type and location stay out.
    expect(await bodyOf(fetchMock, 0)).toEqual({
      items: [{ productId: PRODUCT_ID, quantity: 3, unit: 'BOTTLE' }],
      note: 'Reintento',
    });
  });

  it('un 401 rechaza el registro, no intenta confirmar y olvida la sesión', async () => {
    // Arrange
    fetchMock.mockImplementationOnce(answer(401, errorBody(401, 'Unauthorized', 'Unauthorized')));
    const result = register();

    // Act
    let failure: unknown;
    await act(async () => {
      failure = await result.current
        .mutateAsync({
          type: 'OUTBOUND',
          items: [{ productId: PRODUCT_ID, quantity: 1, unit: 'BOTTLE' }],
        })
        .catch((error: unknown) => error);
    });

    // Assert
    expect(failure).toMatchObject({ status: 401 });
    expect(trace(fetchMock)).toEqual(['POST /api/v1/movements']);
    expect(getAccessToken()).toBeNull();
  });
});
