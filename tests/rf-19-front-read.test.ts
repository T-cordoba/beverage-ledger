import { afterEach, describe, expect, it, vi } from 'vitest';
import { read } from '@/features/movements/useMovementDraft';

describe('read', () => {
  const CLAVE = 'beverage-ledger:movement-draft:OUTBOUND';

  const BORRADOR_VACIO = {
    lines: {},
    occurredAt: '',
    locationId: '',
    destinationLocationId: '',
    reason: '',
    note: '',
    pendingMovementId: null,
  };

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('Camino 1 - el almacenamiento esta denegado y devuelve el borrador vacio', () => {
    // Arrange
    // Lo que hace un navegador en modo privado: la propiedad existe y leerla lanza.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    // Act
    const borrador = read('OUTBOUND');

    // Assert
    expect(borrador).toEqual(BORRADOR_VACIO);
  });

  it('Camino 2 - no hay nada guardado y devuelve el borrador vacio', () => {
    // Arrange
    window.localStorage.removeItem(CLAVE);

    // Act
    const borrador = read('OUTBOUND');

    // Assert
    expect(borrador).toEqual(BORRADOR_VACIO);
  });

  it('Camino 3 - lo guardado no es un JSON valido y devuelve el borrador vacio', () => {
    // Arrange
    window.localStorage.setItem(CLAVE, '{lines:');

    // Act
    const borrador = read('OUTBOUND');

    // Assert
    expect(borrador).toEqual(BORRADOR_VACIO);
  });

  it('Camino 4 - lo guardado es un JSON valido y devuelve el borrador restaurado', () => {
    // Arrange
    window.localStorage.setItem(CLAVE, '{"lines":{},"reason":"merma"}');

    // Act
    const borrador = read('OUTBOUND');

    // Assert
    expect(borrador).toEqual({ ...BORRADOR_VACIO, reason: 'merma' });
  });
});
