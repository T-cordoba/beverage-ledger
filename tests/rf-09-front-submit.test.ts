import { beforeEach, describe, expect, it } from 'vitest';
import { page, productStub, sessionStub } from './support/api-result';
import { answer, requestOf, stubbedTransport } from './support/stubbed-transport';

const { fetchMock, api, unwrap, storeSession } = await stubbedTransport();

const product = productStub();
const category = { id: 'category-1', name: 'Bebidas' };

describe('submit (ProductFormDialog) - Front', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    // A token in memory keeps the auth middleware from spending the first call
    // on /auth/refresh, so each scenario below is exactly one request.
    storeSession(sessionStub());
  });

  it('Camino 1 - producto existente actualizado exitosamente', async () => {
    // Arrange
    const updated = productStub({ origin: 'Escocia Test' });
    fetchMock.mockImplementation(answer(200, updated));

    // Act
    const resultado = unwrap(
      await api.PATCH('/api/v1/products/{id}', {
        params: { path: { id: product.id } },
        body: { origin: 'Escocia Test' },
      }),
    );

    // Assert
    expect(resultado.id).toBe(product.id);
    expect(resultado.origin).toBe('Escocia Test');

    // The real client built the request, so the path param and the bearer token
    // are the ones production would send.
    const request = requestOf(fetchMock);
    expect(request.url).toContain(`/api/v1/products/${product.id}`);
    expect(request.headers.get('Authorization')).toBe(`Bearer ${sessionStub().accessToken}`);
  });

  it('Camino 2 - actualizacion falla con producto inexistente', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(404, { message: 'Product not found' }));

    // Act
    const response = await api.PATCH('/api/v1/products/{id}', {
      params: { path: { id: 'id-inexistente-rf09' } },
      body: { origin: 'Test' },
    });

    // Assert
    expect(response.error).toBeDefined();
    expect(response.response.status).toBe(404);
    expect(() => unwrap(response)).toThrow();
  });

  it('Camino 3 - creacion exitosa de un producto nuevo', async () => {
    // Arrange
    const nombreNuevo = 'Vitest-RF09-Front-nuevo';
    const creado = productStub({ id: 'product-2', name: nombreNuevo });

    fetchMock
      .mockImplementationOnce(answer(200, page([category])))
      .mockImplementationOnce(answer(201, creado))
      .mockImplementationOnce(answer(200, { ...creado, isActive: false }));

    // Act
    const categories = unwrap(
      await api.GET('/api/v1/categories', { params: { query: { pageSize: 1 } } }),
    );

    const resultado = unwrap(
      await api.POST('/api/v1/products', {
        body: { name: nombreNuevo, categoryId: categories.data[0].id, caseSize: 12 },
      }),
    );

    // Nothing is left enabled by a test run, same as against the real API.
    const desactivado = unwrap(
      await api.PATCH('/api/v1/products/{id}', {
        params: { path: { id: resultado.id } },
        body: { isActive: false },
      }),
    );

    // Assert
    expect(resultado.id).toBe('product-2');
    expect(resultado.name).toContain('Vitest-RF09-Front');
    expect(desactivado.isActive).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('Camino 4 - creacion falla por datos invalidos', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(400, { message: ['name should not be empty', 'caseSize must be a positive number'] }),
    );

    // Act
    const response = await api.POST('/api/v1/products', {
      // Shape-valid, value-invalid: that is what the API is expected to reject.
      body: { name: '', categoryId: '', caseSize: 0 },
    });

    // Assert
    expect(response.error).toBeDefined();
    expect(response.response.status).toBe(400);
  });
});
