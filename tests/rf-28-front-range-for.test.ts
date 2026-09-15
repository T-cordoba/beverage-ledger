import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rangeFor, type ReportPeriod } from '@/features/reports/range';

describe('rangeFor', () => {
  const AHORA = new Date('2026-09-01T12:00:00.000Z');
  const HASTA = AHORA.toISOString();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Camino 1 - el periodo es week y el rango es de siete dias', () => {
    const period: ReportPeriod = 'week';

    const range = rangeFor(period);

    expect(range).toEqual({ from: '2026-08-25T12:00:00.000Z', to: HASTA });
  });

  it('Camino 2 - el periodo es month y el rango es de un mes', () => {
    const period: ReportPeriod = 'month';

    const range = rangeFor(period);

    expect(range).toEqual({ from: '2026-08-01T12:00:00.000Z', to: HASTA });
  });

  it('Camino 3 - el periodo es year y el rango es de un año', () => {
    const period: ReportPeriod = 'year';

    const range = rangeFor(period);

    expect(range).toEqual({ from: '2025-09-01T12:00:00.000Z', to: HASTA });
  });

  it('Camino 4 - el periodo no es ninguno de los tres y el rango queda en cero', () => {
    const period = 'quarter' as ReportPeriod;

    const range = rangeFor(period);

    expect(range).toEqual({ from: HASTA, to: HASTA });
  });
});
