import { describe, expect, it } from 'vitest';
import { assertOk } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

describe('assertOk', () => {
  it('Camino 1 - la respuesta no es correcta y lanza ApiError', () => {
    const result = {
      response: new Response(null, { status: 409 }),
      error: { statusCode: 409, message: 'Movement is not confirmed' },
    };

    const comprobar = () => assertOk(result);

    expect(comprobar).toThrow(ApiError);
  });

  it('Camino 2 - la respuesta es correcta sin cuerpo y no lanza nada', () => {
    const result = { response: new Response(null, { status: 204 }) };

    const comprobar = () => assertOk(result);

    expect(comprobar).not.toThrow();
  });
});
