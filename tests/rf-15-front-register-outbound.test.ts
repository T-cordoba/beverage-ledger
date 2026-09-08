import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMovementDraft } from '@/features/movements/useMovementDraft';
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

const product = {
  id: 'product-1',
  name: 'Producto de prueba',
  category: { id: 'category-1', name: 'Bebidas' },
  brand: { id: 'brand-1', name: 'Marca prueba' },
  subcategory: 'Destilados',
  abv: 40,
  origin: 'Argentina',
  age: '5 años',
  caseSize: 12,
  minimumStock: 10,
  isActive: true,
};

describe('Registrar salida - Front', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Camino 1 - la salida falla al confirmar el registro', async () => {
    // Arrange
    mockedOpenDraft.mockResolvedValue({
      id: 'movement-1',
      type: 'OUTBOUND',
      status: 'DRAFT',
    } as any);

    mockedApiPost.mockResolvedValue({
      data: undefined,
      error: { message: 'Movimiento no encontrado' },
      response: { ok: false, status: 404 },
    } as any);

    const { result } = renderHook(() => useMovementDraft('OUTBOUND'));

    act(() => {
      result.current.adjust(product, 'BOTTLE', 1);
    });

    // Act
    const movement = await openDraft({
      type: 'OUTBOUND',
      items: result.current.toItems(),
    });

    const response = await api.POST('/api/v1/movements/{id}/confirm', {
      params: { path: { id: 'id-inexistente' } },
    });

    // Assert
    expect(movement.status).toBe('DRAFT');
    expect(response.error).toBeDefined();
    expect(mockedApiPost).toHaveBeenCalledWith(
      '/api/v1/movements/{id}/confirm',
      { params: { path: { id: 'id-inexistente' } } },
    );
  });

  it('Camino 2 - la salida se registra correctamente', async () => {
    // Arrange
    mockedOpenDraft.mockResolvedValue({
      id: 'movement-2',
      type: 'OUTBOUND',
      status: 'DRAFT',
    } as any);

    mockedApiPost.mockResolvedValue({
      data: { id: 'movement-2', status: 'CONFIRMED' },
      error: undefined,
      response: { ok: true, status: 200 },
    } as any);

    const { result } = renderHook(() => useMovementDraft('OUTBOUND'));

    // Act
    act(() => {
      result.current.adjust(product, 'BOTTLE', 1);
    });

    const items = result.current.toItems();
    const movement = await openDraft({ type: 'OUTBOUND', items });
    const confirmed = unwrap(
      await api.POST('/api/v1/movements/{id}/confirm', {
        params: { path: { id: movement.id } },
      }),
    );

    // Assert
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.productCount).toBe(1);
    expect(result.current.totalBottles).toBe(1);
    expect(items).toEqual([
      { productId: product.id, quantity: 1, unit: 'BOTTLE' },
    ]);
    expect(movement.type).toBe('OUTBOUND');
    expect(movement.status).toBe('DRAFT');
    expect(confirmed.id).toBe(movement.id);
  });
});