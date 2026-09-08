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
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    const borrador = read('OUTBOUND');

    expect(borrador).toEqual(BORRADOR_VACIO);
  });

  it('Camino 2 - no hay nada guardado y devuelve el borrador vacio', () => {
    window.localStorage.removeItem(CLAVE);

    const borrador = read('OUTBOUND');

    expect(borrador).toEqual(BORRADOR_VACIO);
  });

  it('Camino 3 - lo guardado no es un JSON valido y devuelve el borrador vacio', () => {
    window.localStorage.setItem(CLAVE, '{lines:');

    const borrador = read('OUTBOUND');

    expect(borrador).toEqual(BORRADOR_VACIO);
  });

  it('Camino 4 - lo guardado es un JSON valido y devuelve el borrador restaurado', () => {
    window.localStorage.setItem(CLAVE, '{"lines":{},"reason":"merma"}');

    const borrador = read('OUTBOUND');

    expect(borrador).toEqual({ ...BORRADOR_VACIO, reason: 'merma' });
  });
});
