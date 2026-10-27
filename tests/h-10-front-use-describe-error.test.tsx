import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { useDescribeError } from '@/lib/api/useDescribeError';
import messages from '@/i18n/messages/es.json';

const api = messages.errors.api;

const cuerpo = (statusCode: number, extra: { code?: string; params?: object } = {}) => ({
  statusCode,
  error: 'Error',
  message: 'Raw English message with column product_id',
  path: '/api/v1/movements',
  timestamp: '2026-10-26T00:00:00.000Z',
  ...extra,
});

describe('useDescribeError', () => {
  const describeError = () =>
    renderHook(() => useDescribeError(), {
      wrapper: ({ children }) => (
        <NextIntlClientProvider locale="es" messages={messages}>
          {children}
        </NextIntlClientProvider>
      ),
    }).result.current;

  it('Camino 1 - el codigo de la API tiene traduccion y se muestra traducido', () => {
    const describir = describeError();

    const frase = describir(new ApiError(401, cuerpo(401, { code: 'INVALID_CREDENTIALS' })));

    expect(frase).toBe(api.codes.INVALID_CREDENTIALS);
  });

  it('Camino 2 - el codigo traducido recibe los parametros de la API', () => {
    const describir = describeError();

    const frase = describir(
      new ApiError(409, cuerpo(409, { code: 'BRAND_IN_USE', params: { count: 3 } })),
    );

    expect(frase).toContain('3 productos');
    expect(frase).not.toContain('Raw English');
  });

  it.each([
    [401, api.status.unauthorized],
    [403, api.status.forbidden],
    [404, api.status.notFound],
    [409, api.status.conflict],
    [413, api.status.tooLarge],
    [429, api.status.tooManyRequests],
    [500, api.status.server],
    [503, api.status.server],
    [400, api.status.badRequest],
    [422, api.status.badRequest],
  ])(
    'Camino 3 - un codigo sin traduccion y estado %i cae al mensaje del estado',
    (status, esperado) => {
      const describir = describeError();

      const frase = describir(
        new ApiError(status, cuerpo(status, { code: 'CODE_NOT_TRANSLATED' })),
      );

      expect(frase).toBe(esperado);
    },
  );

  it('Camino 4 - el cuerpo no trae codigo y se usa el mensaje del estado', () => {
    const describir = describeError();

    const frase = describir(new ApiError(502, '<html>Bad Gateway</html>'));

    expect(frase).toBe(api.status.server);
  });

  it('Camino 5 - la peticion no llego al servidor y se muestra el error de red', () => {
    const describir = describeError();

    const frase = describir(new TypeError('Failed to fetch'));

    expect(frase).toBe(api.network);
  });

  it('Camino 6 - un error desconocido usa el mensaje de respaldo recibido', () => {
    const describir = describeError();

    const frase = describir(new Error('boom'), 'No se pudo guardar la marca.');

    expect(frase).toBe('No se pudo guardar la marca.');
  });

  it('Camino 7 - un error desconocido sin respaldo usa el mensaje generico del servidor', () => {
    const describir = describeError();

    const frase = describir('algo raro');

    expect(frase).toBe(api.status.server);
  });
});
