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

  it.each<{ period: ReportPeriod; from: string; description: string }>([
    { period: 'week', from: '2026-08-25T12:00:00.000Z', description: 'de siete dias' },
    { period: 'month', from: '2026-08-01T12:00:00.000Z', description: 'de un mes' },
    { period: 'year', from: '2025-09-01T12:00:00.000Z', description: 'de un año' },
  ])('Camino - el periodo es $period y el rango es $description', ({ period, from }) => {
    const range = rangeFor(period);

    expect(range).toEqual({ from, to: HASTA });
  });

  it('Camino 4 - el periodo no es ninguno de los tres y el rango queda en cero', () => {
    const period = 'quarter' as ReportPeriod;

    const range = rangeFor(period);

    expect(range).toEqual({ from: HASTA, to: HASTA });
  });
});
