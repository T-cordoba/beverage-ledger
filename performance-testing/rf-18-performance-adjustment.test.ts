import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BUDGET_MS,
  answer,
  errorBody,
  lineInputs,
  loadUnderTest,
  movementDto,
  movementRouter,
  productDto,
  queryWrapper,
  session,
  timed,
} from './support/perf';

const { fetchMock, useRegisterMovement, useMovementDraft, storeSession, ApiError } =
  await loadUnderTest();

function register() {
  const { wrapper } = queryWrapper();
  return renderHook(() => useRegisterMovement(), { wrapper }).result;
}

describe('RF-18 Performance - Registrar un ajuste (ADJUSTMENT)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    movementRouter(fetchMock);
    storeSession(session());
    window.localStorage.clear();
  });

  it('2000 ajustes con signo sobre 200 productos se acumulan dentro del presupuesto de transformación', async () => {
    // Arrange
    const { result } = renderHook(() => useMovementDraft('ADJUSTMENT'));
    const products = Array.from({ length: 200 }, (_, i) => productDto(i + 1));

    // Act: each product goes +1 five times and -1 five times, plus a final -3.
    const { ms } = await timed(() =>
      act(() => {
        for (let round = 0; round < 5; round += 1) {
          for (const product of products) {
            result.current.adjust(product, 'BOTTLE', 1);
            result.current.adjust(product, 'BOTTLE', -1);
          }
        }
        for (const product of products) result.current.adjust(product, 'BOTTLE', -3);
      }),
    );

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.transform);
    // An adjustment is signed: negatives are kept, not clamped to zero.
    expect(result.current.productCount).toBe(200);
    expect(result.current.totalBottles).toBe(-600);
    expect(result.current.toItems().every((item) => item.quantity === -3)).toBe(true);
  });

  it('un ajuste de 500 líneas negativas con motivo se registra dentro del presupuesto de carga grande', async () => {
    // Arrange
    const items = lineInputs(500, -1);
    const result = register();

    // Act
    const { ms, value } = await timed(() =>
      act(async () =>
        result.current.mutateAsync({ type: 'ADJUSTMENT', items, reason: 'Conteo físico' }),
      ),
    );

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.largePayload);
    expect(value).toMatchObject({ status: 'CONFIRMED' });
    const sent = (await (fetchMock.mock.calls[0][0] as Request).clone().json()) as {
      reason: string;
      items: { quantity: number }[];
    };
    expect(sent.reason).toBe('Conteo físico');
    expect(sent.items.every((item) => item.quantity < 0)).toBe(true);
  });

  it('un 400 de validación con 300 mensajes se procesa como ApiError dentro del presupuesto de una operación', async () => {
    // Arrange
    const messages = Array.from({ length: 300 }, (_, i) => `items.${i}.quantity must not be 0`);
    fetchMock.mockReset();
    fetchMock
      .mockImplementationOnce(answer(201, movementDto({ type: 'ADJUSTMENT' })))
      .mockImplementationOnce(answer(400, errorBody(400, 'Bad Request', messages)));
    const result = register();

    // Act
    const { ms, value: failure } = await timed(() =>
      act(async () =>
        result.current
          .mutateAsync({ type: 'ADJUSTMENT', items: lineInputs(300), reason: 'Merma' })
          .catch((error: unknown) => error),
      ),
    );

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.singleOperation);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as InstanceType<typeof ApiError>).messages).toHaveLength(300);
  });
});
