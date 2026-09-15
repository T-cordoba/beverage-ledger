import { describe, expect, it } from 'vitest';
import { rowsOnPage } from '@/lib/hooks/usePagination';

describe('rowsOnPage', () => {
  it('Camino 1 - sin total conocido devuelve el tamaño de pagina completo', () => {
    const page = 1;
    const pageSize = 10;
    const total = undefined;

    const filas = rowsOnPage(page, pageSize, total);

    expect(filas).toBe(10);
  });

  it('Camino 2 - con total conocido devuelve las filas que quedan en la ultima pagina', () => {
    const page = 3;
    const pageSize = 10;
    const total = 25;

    const filas = rowsOnPage(page, pageSize, total);

    expect(filas).toBe(5);
  });
});
