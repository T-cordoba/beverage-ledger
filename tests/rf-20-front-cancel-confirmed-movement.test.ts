import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDraft } from '@/features/movements/open-draft';
import { api, unwrap } from '@/lib/api';
import { apiResult, movementStub } from './support/api-result';

vi.mock('@/features/movements/open-draft', () => ({
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

type PostResult = Awaited<ReturnType<typeof api.POST>>;

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
    mockedApiPost.mockResolvedValue(
      apiResult<PostResult>({ status: 404, error: { message: 'Movimiento no encontrado' } }),
    );

    // Act
    const response = await api.POST('/api/v1/movements/{id}/cancel', {
      params: { path: { id: 'id-inexistente' } },
      body: {
        reason: 'Error en el registro',
      },
    });

    // Assert
    expect(response.error).toBeDefined();
    expect(mockedApiPost).toHaveBeenCalledWith('/api/v1/movements/{id}/cancel', {
      params: { path: { id: 'id-inexistente' } },
      body: { reason: 'Error en el registro' },
    });
  });

  it('Camino 2 - la cancelación es exitosa y el movimiento queda cancelado', async () => {
    // Arrange
    mockedOpenDraft.mockResolvedValue(
      movementStub({ id: 'movement-1', type: 'OUTBOUND', status: 'DRAFT' }),
    );

    mockedApiPost
      .mockResolvedValueOnce(
        apiResult<PostResult>({ status: 200, data: { id: 'movement-1', status: 'CONFIRMED' } }),
      )
      .mockResolvedValueOnce(
        apiResult<PostResult>({ status: 200, data: { id: 'movement-1', status: 'CANCELLED' } }),
      );

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
