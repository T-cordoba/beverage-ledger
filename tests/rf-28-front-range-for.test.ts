import { describe, expect, it } from 'vitest';
import { rangeFor, type ReportPeriod } from '@/features/reports/range';

/**
 * RF-28 - FRONT - rangeFor(period)
 * Un test por cada camino de la tabla de docs/testing/RF-28-reporte-consumo.md.
 */
describe('rangeFor', () => {
  const daysBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86400000;

  it('Camino 1 - el periodo es week y el rango es de siete dias', () => {
    const range = rangeFor('week');

    expect(Math.round(daysBetween(range.from, range.to))).toBe(7);
  });

  it('Camino 2 - el periodo es month y el rango es de un mes', () => {
    const range = rangeFor('month');
    const days = daysBetween(range.from, range.to);

    expect(days).toBeGreaterThanOrEqual(28);
    expect(days).toBeLessThanOrEqual(31);
  });

  it('Camino 3 - el periodo es year y el rango es de un anio', () => {
    const range = rangeFor('year');
    const days = daysBetween(range.from, range.to);

    expect(days).toBeGreaterThanOrEqual(365);
    expect(days).toBeLessThanOrEqual(366);
  });

  it('Camino 4 - el periodo no es ninguno de los tres y el rango queda en cero', () => {
    // 'quarter' no existe en el tipo ReportPeriod: es el camino que solo se
    // alcanza en ejecucion, cuando llega un valor sin tipar.
    const range = rangeFor('quarter' as ReportPeriod);

    expect(range.from).toBe(range.to);
  });
});
