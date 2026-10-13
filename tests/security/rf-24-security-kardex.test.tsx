import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ACCESS_TOKEN,
  QUERY_SMUGGLING_ID,
  TRAVERSAL_ID,
  answer,
  errorBody,
  loadClientUnderTest,
  pageOf,
  queryWrapper,
  requestOf,
  session,
  trace,
} from './support/security-harness';

const { fetchMock, useKardex, storeSession, forgetSession, getAccessToken } =
  await loadClientUnderTest();

const PAGE = { page: 1, pageSize: 10 };

async function kardexOf(productId: string, locationId?: string) {
  const { wrapper } = queryWrapper();
  const { result } = renderHook(() => useKardex(productId, locationId, PAGE), { wrapper });
  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
  return result;
}

describe('RF-24 Security - Consultar el kardex de un producto', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    forgetSession();
    storeSession(session());
  });

  it('un productId con ../ queda codificado en la ruta y no alcanza otro endpoint', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(400, errorBody(400, 'Bad Request', 'Validation failed (uuid is expected)')),
    );

    // Act
    await kardexOf(TRAVERSAL_ID);

    // Assert
    expect(new URL(requestOf(fetchMock).url).pathname).toBe(
      '/api/v1/stock/..%2F..%2Fauth%2Flogout/kardex',
    );
    expect(trace(fetchMock)).not.toContain('POST /api/v1/auth/logout');
  });

  it('un productId con ? y # no puede colar parámetros en la consulta', async () => {
    // Arrange
    fetchMock.mockImplementation(
      answer(400, errorBody(400, 'Bad Request', 'Validation failed (uuid is expected)')),
    );

    // Act
    await kardexOf(QUERY_SMUGGLING_ID);

    // Assert
    const url = new URL(requestOf(fetchMock).url);
    expect(url.pathname).toBe(
      '/api/v1/stock/movement-1%3FcreatedByUserId%3Dother-user%23frag/kardex',
    );
    expect(url.searchParams.get('createdByUserId')).toBeNull();
  });

  it('el producto de otra organización responde 404 y no se muestra ningún dato', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(404, errorBody(404, 'Not Found', 'Product not found')));

    // Act
    const result = await kardexOf('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

    // Assert
    expect(result.current.error).toMatchObject({ status: 404 });
    expect(result.current.data).toBeUndefined();
    expect(getAccessToken()).toBe(ACCESS_TOKEN);
  });

  it('la bodega viaja como un parámetro y un valor hostil no rompe la consulta', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf([])));

    // Act
    await kardexOf('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'x&page=999');

    // Assert
    const params = new URL(requestOf(fetchMock).url).searchParams;
    expect(params.get('locationId')).toBe('x&page=999');
    expect(params.get('page')).toBe('1');
  });

  it('el token viaja solo en la cabecera Authorization, nunca en la URL', async () => {
    // Arrange
    fetchMock.mockImplementation(answer(200, pageOf([])));

    // Act
    await kardexOf('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

    // Assert
    expect(requestOf(fetchMock).headers.get('Authorization')).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(requestOf(fetchMock).url).not.toContain(ACCESS_TOKEN);
  });
});
