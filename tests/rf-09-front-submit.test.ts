import { beforeAll, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { api, unwrap } from '@/lib/api';
import { storeSession } from '@/lib/api/session';

describe('submit (ProductFormDialog) - Front', () => {
  let product: any;

  beforeAll(async () => {
    const response = await fetch(`${API_ORIGIN}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      }),
    });

    storeSession(await response.json());

    const products = unwrap(
      await api.GET('/api/v1/products', {
        params: { query: { pageSize: 1 } },
      }),
    );

    product = products.data[0];
  });

  it('Camino 1 - producto existente actualizado exitosamente', async () => {
    const resultado = unwrap(
      await api.PATCH('/api/v1/products/{id}', {
        params: { path: { id: product.id } },
        body: { origin: 'Escocia Test' },
      }),
    );

    expect(resultado.id).toBe(product.id);
  });

  it('Camino 2 - actualizacion falla con producto inexistente', async () => {
    const response = await api.PATCH('/api/v1/products/{id}', {
      params: { path: { id: 'id-inexistente-rf09' } },
      body: { origin: 'Test' },
    });

    expect(response.error).toBeDefined();
  });

  it('Camino 3 - creacion exitosa de un producto nuevo', async () => {
    const categories = unwrap(
      await api.GET('/api/v1/categories', {
        params: { query: { pageSize: 1 } },
      }),
    );

    const resultado = unwrap(
      await api.POST('/api/v1/products', {
        body: {
          name: `Vitest-RF09-Front-${Date.now()}`,
          categoryId: categories.data[0].id,
          caseSize: 12,
        },
      }),
    );

    expect(resultado.id).toBeDefined();
    expect(resultado.name).toContain('Vitest-RF09-Front');

    // Desactivar para limpiar
    await api.PATCH('/api/v1/products/{id}', {
      params: { path: { id: resultado.id } },
      body: { isActive: false },
    });
  });

  it('Camino 4 - creacion falla por datos invalidos', async () => {
    const response = await api.POST('/api/v1/products', {
      body: { name: '', categoryId: '', caseSize: 0 } as any,
    });

    expect(response.error).toBeDefined();
  });
});
