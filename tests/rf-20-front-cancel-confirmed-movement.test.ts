import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDraft } from '@/features/movements/api';
import { api, unwrap } from '@/lib/api';

vi.mock('@/features/movements/api', () => ({
  openDraft: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      GET: vi.fn(),
      POST: vi.fn(),
    },
  };
});

const mockedOpenDraft = vi.mocked(openDraft);
const mockedApiPost = vi.mocked(api.POST);

const productId = 'product-1';
const locationId = 'location-1';

describe('Anular un movimiento confirmado - Front', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Camino 1 - la cancelación falla y se obtiene un error', async () => {
    // Arrange
    mockedApiPost.mockResolvedValue({
      error: { message: 'Movimiento no encontrado' },
      response: { ok: false, status: 404 },
    } as any);

    // Act
    const response = await api.POST('/api/v1/movements/{id}/cancel', {
      params: { path: { id: 'id-inexistente' } },
      body: {
        reason: 'Error en el registro',
      },
    });

    // Assert
    expect(response.error).toBeDefined();
    expect(mockedApiPost).toHaveBeenCalledWith(
      '/api/v1/movements/{id}/cancel',
      {
        params: { path: { id: 'id-inexistente' } },
        body: { reason: 'Error en el registro' },
      },
    );
  });

  it('Camino 2 - la cancelación es exitosa y el movimiento queda cancelado', async () => {
    // Arrange
    mockedOpenDraft.mockResolvedValue({
      id: 'movement-1',
      type: 'OUTBOUND',
      status: 'DRAFT',
    } as any);

    mockedApiPost
      .mockResolvedValueOnce({
        data: { id: 'movement-1', status: 'CONFIRMED' },
        error: undefined,
        response: { ok: true, status: 200 },
      } as any)
      .mockResolvedValueOnce({
        data: { id: 'movement-1', status: 'CANCELLED' },
        error: undefined,
        response: { ok: true, status: 200 },
      } as any);

    // Act
    const draft = await openDraft({
      type: 'OUTBOUND',
      items: [
        {
          productId,
          quantity: 1,
          unit: 'BOTTLE',
        },
      ],
      locationId,
      note: 'Movimiento creado por prueba RF-20',
      draftId: null,
    });

    const confirmado = unwrap(
      await api.POST('/api/v1/movements/{id}/confirm', {
        params: { path: { id: draft.id } },
      }),
    );

    const cancelado = unwrap(
      await api.POST('/api/v1/movements/{id}/cancel', {
        params: { path: { id: draft.id } },
        body: {
          reason: 'Anulación de prueba RF-20',
        },
      }),
    );

    // Assert
    expect(confirmado.status).toBe('CONFIRMED');
    expect(cancelado.status).toBe('CANCELLED');
  });
});