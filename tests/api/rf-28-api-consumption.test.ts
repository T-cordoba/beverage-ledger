import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  answer,
  consumptionRowDto,
  errorBody,
  loadApiUnderTest,
  queryOf,
  queryWrapper,
  session,
  trace,
} from './support/http';

const { fetchMock, useConsumptionReport, useSummaryReport, rangeFor, storeSession, ApiError } =
  await loadApiUnderTest();

const RANGE = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T00:00:00.000Z' };

function consumption(groupBy: 'product' | 'category' | 'brand', range = RANGE, limit = 10) {
  const { wrapper } = queryWrapper();
  return renderHook(() => useConsumptionReport(groupBy, range, limit), { wrapper }).result;
}

describe('RF-28 API - Reporte de consumo', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(['product', 'category', 'brand'] as const)(
    'pide GET /reports/consumption agrupado por %s con rango y límite',
    async (groupBy) => {
      // Arrange
      fetchMock.mockImplementation(answer(200, { range: RANGE, groupBy, data: [] }));

      // Act
      const result = consumption(groupBy);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert
      expect(trace(fetchMock)).toEqual(['GET /api/v1/reports/consumption']);
      expect(queryOf(fetchMock)).toEqual({ groupBy, limit: '10', ...RANGE });
    },
  );

  it('entrega las filas y el rango que la API confirma haber usado', async () => {
    // Arrange
    const report = {
      range: RANGE,
      groupBy: 'category' as const,
      data: [
        consumptionRowDto({ name: 'Ron', quantityBase: 120 }),
        consumptionRowDto({ id: 'otro', name: 'Whisky', quantityBase: 48, movementCount: 3 }),
      ],
    };
    fetchMock.mockImplementation(answer(200, report));

    // Act
    const result = consumption('category');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(result.current.data).toEqual(report);
  });

  it('el periodo "semana" se traduce a un rango de 7 días que termina ahora', async () => {
    // Arrange
    vi.useFakeTimers({ now: new Date('2026-03-15T12:00:00.000Z'), toFake: ['Date'] });
    fetchMock.mockImplementation(answer(200, { range: RANGE, groupBy: 'product', data: [] }));

    // Act
    const result = consumption('product', rangeFor('week'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(queryOf(fetchMock)).toMatchObject({
      from: '2026-03-08T12:00:00.000Z',
      to: '2026-03-15T12:00:00.000Z',
    });
  });

  it('un rango invertido vuelve como ApiError 400 con el mensaje de la API', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(400, errorBody(400, 'Bad Request', 'The range starts after it ends')),
    );

    // Act
    const result = consumption('product', { from: RANGE.to, to: RANGE.from });
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toMatchObject({
      status: 400,
      message: 'The range starts after it ends',
    });
  });

  it('sin permiso de reportes la API responde 403 y el hook lo expone como error', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(403, errorBody(403, 'Forbidden', 'Forbidden resource')));

    // Act
    const result = consumption('product');
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toMatchObject({ status: 403 });
    expect(result.current.data).toBeUndefined();
  });
  it('las tarjetas del reporte piden GET /reports/summary con el mismo rango', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, { range: RANGE }));
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useSummaryReport(RANGE), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(trace(fetchMock)).toEqual(['GET /api/v1/reports/summary']);
    expect(queryOf(fetchMock)).toEqual(RANGE);
  });

  it('las tarjetas no consultan nada mientras están deshabilitadas', () => {
    // Arrange
    const { wrapper } = queryWrapper();

    // Act
    const { result } = renderHook(() => useSummaryReport(RANGE, false), { wrapper });

    // Assert
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
