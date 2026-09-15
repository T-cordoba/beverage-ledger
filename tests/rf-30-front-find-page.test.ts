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
  it.each([
    ['action vacia: no se limpia la accion', '', 'product', false],
    ['next vacio: no se limpia la accion', 'product.created', '', false],
    [
      'accion pertenece a la entidad seleccionada: no se limpia',
      'product.created',
      'product',
      false,
    ],
    [
      'accion no pertenece a la entidad seleccionada: se limpia',
      'product.created',
      'movement',
      true,
    ],
  ])('Camino 1-4 - %s', (_caso, action, next, expected) => {
    // Act
    const result = wouldClearAction(action, next);

    // Assert
    expect(result).toBe(expected);
  });
});