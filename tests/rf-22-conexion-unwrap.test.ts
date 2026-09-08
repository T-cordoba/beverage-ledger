import { describe, expect, it } from 'vitest';
import { unwrap } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

describe('unwrap', () => {
  it('Camino 1 - la respuesta no es correcta y lanza ApiError', () => {
    const result = {
      response: new Response(null, { status: 500 }),
      error: { statusCode: 500, message: 'Internal server error' },
    };

    const desenvolver = () => unwrap(result);

    expect(desenvolver).toThrow(ApiError);
  });

  it('Camino 2 - la respuesta es correcta pero no trae cuerpo y lanza ApiError', () => {
    const result = { response: new Response(null, { status: 200 }), data: undefined };

    const desenvolver = () => unwrap(result);

    expect(desenvolver).toThrow(ApiError);
  });

  it('Camino 3 - la respuesta es correcta y trae cuerpo, que es lo que retorna', () => {
    const page = { data: [], meta: { page: 1, pageSize: 10, total: 0, pageCount: 0 } };
    const result = { response: new Response(null, { status: 200 }), data: page };

    const desenvuelto = unwrap(result);

    expect(desenvuelto).toEqual(page);
  });
});
