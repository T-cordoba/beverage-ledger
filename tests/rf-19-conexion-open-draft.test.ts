import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openDraft } from '@/features/movements/api';
import type { Movement } from '@/lib/api';

// Solo el cliente HTTP se sustituye: unwrap sigue siendo el real, que es lo que
// convierte el par { data, error } en el movimiento o en un ApiError.
const { cliente } = vi.hoisted(() => ({
  cliente: { PATCH: vi.fn(), POST: vi.fn() },
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: cliente,
}));

describe('openDraft', () => {
  const BORRADOR_VIVO = 'd1000000-0000-4000-8000-000000000001';
  const PRODUCTO = 'e3f1c0aa-0000-4000-8000-000000000001';

  const movimiento = (id: string) => ({ id, status: 'DRAFT', type: 'OUTBOUND' }) as Movement;

  const respuesta = (status: number, data?: Movement) => ({
    response: new Response(null, { status }),
    data,
  });

  const salida = (draftId: string | null) => ({
    type: 'OUTBOUND' as const,
    items: [{ productId: PRODUCTO, quantity: 1, unit: 'BOTTLE' as const }],
    draftId,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Camino 1 - no hay borrador previo y se abre un movimiento nuevo', async () => {
    // Arrange
    const nuevo = movimiento('d1000000-0000-4000-8000-000000000009');
    cliente.POST.mockResolvedValue(respuesta(201, nuevo));

    // Act
    const abierto = await openDraft(salida(null));

    // Assert
    expect(abierto).toEqual(nuevo);
    expect(cliente.PATCH).not.toHaveBeenCalled();
    expect(cliente.POST).toHaveBeenCalledTimes(1);
  });

  it('Camino 2 - hay un borrador vivo y se reutiliza el mismo movimiento', async () => {
    // Arrange
    const vivo = movimiento(BORRADOR_VIVO);
    cliente.PATCH.mockResolvedValue(respuesta(200, vivo));

    // Act
    const abierto = await openDraft(salida(BORRADOR_VIVO));

    // Assert
    expect(abierto.id).toBe(BORRADOR_VIVO);
    expect(cliente.PATCH).toHaveBeenCalledTimes(1);
    expect(cliente.POST).not.toHaveBeenCalled();
  });

  it('Camino 3 - el borrador ya no existe y se abre un movimiento nuevo', async () => {
    // Arrange
    const nuevo = movimiento('d1000000-0000-4000-8000-000000000009');
    cliente.PATCH.mockResolvedValue(respuesta(409));
    cliente.POST.mockResolvedValue(respuesta(201, nuevo));

    // Act
    const abierto = await openDraft(salida(BORRADOR_VIVO));

    // Assert
    expect(abierto).toEqual(nuevo);
    expect(abierto.id).not.toBe(BORRADOR_VIVO);
    expect(cliente.PATCH).toHaveBeenCalledTimes(1);
    expect(cliente.POST).toHaveBeenCalledTimes(1);
  });
});
