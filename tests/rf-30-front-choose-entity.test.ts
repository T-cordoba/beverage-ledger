import { describe, expect, it } from 'vitest';
import { auditEntityOf } from '@/features/admin/audit-actions';

/**
 * Mirrors the guard inside chooseEntity: returns true when setAction('')
 * would be called (i.e. the action should be cleared).
 */
function wouldClearAction(action: string, next: string): boolean {
  if (!action || !next) return false;
  return auditEntityOf(action as Parameters<typeof auditEntityOf>[0]) !== next;
}

describe('chooseEntity - logica de limpieza de accion', () => {
  it('Camino 1 - action vacia: no se limpia la accion', () => {
    expect(wouldClearAction('', 'product')).toBe(false);
  });

  it('Camino 2 - next vacio: no se limpia la accion', () => {
    expect(wouldClearAction('product.created', '')).toBe(false);
  });

  it('Camino 3 - accion pertenece a la entidad seleccionada: no se limpia', () => {
    expect(wouldClearAction('product.created', 'product')).toBe(false);
  });

  it('Camino 4 - accion no pertenece a la entidad seleccionada: se limpia', () => {
    expect(wouldClearAction('product.created', 'movement')).toBe(true);
  });
});
