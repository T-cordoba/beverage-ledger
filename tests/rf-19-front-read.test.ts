import { afterEach, describe, expect, it } from 'vitest';
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

  const almacenamiento = window.localStorage;

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', { value: almacenamiento, configurable: true });
    window.localStorage.clear();
  });

  it('Camino 1 - el almacenamiento esta denegado y devuelve el borrador vacio', () => {
    delete (window as { localStorage?: Storage }).localStorage;

    expect(read('OUTBOUND')).toEqual(BORRADOR_VACIO);
  });

  it('Camino 2 - no hay nada guardado y devuelve el borrador vacio', () => {
    expect(read('OUTBOUND')).toEqual(BORRADOR_VACIO);
  });

  it('Camino 3 - lo guardado no es un JSON valido y devuelve el borrador vacio', () => {
    window.localStorage.setItem(CLAVE, '{lines:');

    expect(read('OUTBOUND')).toEqual(BORRADOR_VACIO);
  });

  it('Camino 4 - lo guardado es un JSON valido y devuelve el borrador restaurado', () => {
    window.localStorage.setItem(CLAVE, '{"lines":{},"reason":"merma"}');

    expect(read('OUTBOUND')).toEqual({ ...BORRADOR_VACIO, reason: 'merma' });
  });
});
