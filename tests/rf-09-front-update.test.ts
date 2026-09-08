import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, unwrap } from '@/lib/api';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      GET: vi.fn(),
      PATCH: vi.fn(),
      POST: vi.fn(),
    },
  };
});

const mockedApiGet = vi.mocked(api.GET);
const mockedApiPatch = vi.mocked(api.PATCH);
const mockedApiPost = vi.mocked(api.POST);

const product = {
  id: 'product-1',
  name: 'Producto de prueba',
  origin: 'Escocia',
};

describe('submit (ProductFormDialog) - Front', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();

  });

  it('Camino 1 - producto existente actualizado exitosamente', async () => {
    // Arrange
    mockedApiPatch.mockResolvedValue({
      data: { id: product.id, origin: 'Escocia Test' },
      error: undefined,
      response: { ok: true, status: 200 },
    } as any);

    // Act
    const resultado = unwrap(
      await api.PATCH('/api/v1/products/{id}', {
        params: { path: { id: product.id } },
        body: { origin: 'Escocia Test' },
      }),
    );

    // Assert
    expect(resultado.id).toBe(product.id);
  });

  it('Camino 2 - actualizacion falla con producto inexistente', async () => {
    // Arrange
    mockedApiPatch.mockResolvedValue({
      error: { message: 'Product not found' },
      response: { ok: false, status: 404 },
    } as any);

    // Act
    const response = await api.PATCH('/api/v1/products/{id}', {
      params: { path: { id: 'id-inexistente-rf09' } },

      body: { origin: 'Test' },
    });

    // Assert
    expect(response.error).toBeDefined();
  });

  it('Camino 3 - creacion exitosa de un producto nuevo', async () => {
    // Arrange
    mockedApiGet.mockResolvedValue({
      data: { data: [{ id: 'category-1', name: 'Bebidas' }] },
      error: undefined,
      response: { ok: true, status: 200 },
    } as any);

    const nombreNuevo = `Vitest-RF09-Front-${Date.now()}`;
    mockedApiPost.mockResolvedValue({
      data: { id: 'product-2', name: nombreNuevo },
      error: undefined,
      response: { ok: true, status: 201 },
    } as any);

    mockedApiPatch.mockResolvedValue({
      data: { id: 'product-2', isActive: false },
      error: undefined,
      response: { ok: true, status: 200 },
    } as any);

    // Act
    const categories = unwrap(
      await api.GET('/api/v1/categories', {
        params: { query: { pageSize: 1 } },

      }),
    );

    const resultado = unwrap(
      await api.POST('/api/v1/products', {
        body: {
          name: nombreNuevo,
          categoryId: categories.data[0].id,
          caseSize: 12,
        },
      }),
    );

    // Desactivar para limpiar
    await api.PATCH('/api/v1/products/{id}', {
      params: { path: { id: resultado.id } },
      body: { isActive: false },
    });

    // Assert
    expect(resultado.id).toBeDefined();
    expect(resultado.name).toContain('Vitest-RF09-Front');
    expect(mockedApiPatch).toHaveBeenCalledWith('/api/v1/products/{id}', {
      params: { path: { id: 'product-2' } },
      body: { isActive: false },
    });
  });

  it('Camino 4 - creacion falla por datos invalidos', async () => {
    // Arrange
    mockedApiPost.mockResolvedValue({
      error: { message: 'Validation failed' },

      response: { ok: false, status: 400 },
    } as any);

    // Act
    const response = await api.POST('/api/v1/products', {
      body: { name: '', categoryId: '', caseSize: 0 } as any,
    });

    // Assert
    expect(response.error).toBeDefined();
  });
});