import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BUDGET_MS,
  answer,
  consumptionRows,
  loadUnderTest,
  queryWrapper,
  session,
  timed,
} from './support/perf';

const { fetchMock, useConsumptionReport, rangeFor, granularityFor, REPORT_PERIODS, storeSession } =
  await loadUnderTest();

const RANGE = { from: '2026-01-01T00:00:00.000Z', to: '2026-12-31T00:00:00.000Z' };
const GROUPINGS = ['product', 'category', 'brand'] as const;

describe('RF-28 Performance - Reporte de consumo', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    storeSession(session());
  });

  it('el reporte con el límite máximo de la API (200 filas) se procesa dentro del presupuesto', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(200, { range: RANGE, groupBy: 'product', data: consumptionRows(200) }),
    );
    const { wrapper } = queryWrapper();

    // Act
    const { ms, value: result } = await timed(async () => {
      const { result } = renderHook(() => useConsumptionReport('product', RANGE, 200), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      return result;
    });

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.singleOperation);
    expect(result.current.data?.data).toHaveLength(200);
  });

  it('cada combinación de periodo y agrupación cuesta exactamente una petición', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(200, { range: RANGE, groupBy: 'product', data: consumptionRows(20) }),
    );
    const { wrapper } = queryWrapper();
    const combinations = REPORT_PERIODS.flatMap((period) =>
      GROUPINGS.map((groupBy) => ({ groupBy, range: rangeFor(period) })),
    );

    // Act
    const { ms } = await timed(async () => {
      const hooks = combinations.map(({ groupBy, range }) =>
        renderHook(() => useConsumptionReport(groupBy, range, 10), { wrapper }),
      );
      await waitFor(() => expect(hooks.every(({ result }) => result.current.isSuccess)).toBe(true));
    });

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.batch);
    expect(fetchMock).toHaveBeenCalledTimes(combinations.length);
  });

  it('calcular rango y granularidad 10 000 veces es despreciable frente al presupuesto', () => {
    // Act
    const start = performance.now();
    for (let i = 0; i < 10_000; i += 1) {
      const period = REPORT_PERIODS[i % REPORT_PERIODS.length];
      rangeFor(period);
      granularityFor(period);
    }
    const ms = performance.now() - start;

    // Assert
    expect(ms).toBeLessThan(BUDGET_MS.transform);
  });
});
