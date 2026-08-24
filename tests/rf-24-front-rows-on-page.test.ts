import { describe, expect, it } from 'vitest';
import { rowsOnPage } from '@/lib/hooks/usePagination';

describe('rowsOnPage', () => {
  it('Camino 1 - sin total conocido devuelve el tamaño de pagina completo', () => {
    expect(rowsOnPage(1, 10, undefined)).toBe(10);
  });

  it('Camino 2 - con total conocido devuelve las filas que quedan en la ultima pagina', () => {
    expect(rowsOnPage(3, 10, 25)).toBe(5);
  });
});
