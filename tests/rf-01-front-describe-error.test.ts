import { describe, expect, it } from 'vitest';
import { ApiError, describeError, isUnauthorized } from '@/lib/api/errors';

const cuerpo = (statusCode: number, message: string | string[]) => ({
  statusCode,
  error: 'Bad Request',
  message,
  path: '/api/v1/auth/login',
  timestamp: '2026-09-14T00:00:00.000Z',
});

describe('ApiError.messages', () => {
  it('Camino 1 - el cuerpo es un error de la API y devuelve sus mensajes', () => {
    const error = new ApiError(
      400,
      cuerpo(400, ['email must be an email', 'password is required']),
    );

    expect(error.messages).toEqual(['email must be an email', 'password is required']);
  });

  it('Camino 2 - el cuerpo no tiene la forma de la API y devuelve el mensaje generico', () => {
    const error = new ApiError(502, '<html>Bad Gateway</html>');

    expect(error.messages).toEqual(['Request failed with status 502']);
  });
});

describe('isUnauthorized', () => {
  it('Camino 1 - no es un ApiError y devuelve false', () => {
    expect(isUnauthorized(new Error('connect ECONNREFUSED'))).toBe(false);
  });

  it('Camino 2 - es un ApiError de otro estado y devuelve false', () => {
    expect(isUnauthorized(new ApiError(403, cuerpo(403, 'Forbidden')))).toBe(false);
  });

  it('Camino 3 - es un ApiError 401 y devuelve true', () => {
    expect(isUnauthorized(new ApiError(401, cuerpo(401, 'Unauthorized')))).toBe(true);
  });
});

describe('describeError', () => {
  const RESPALDO = 'No se pudo completar la operacion';

  it('Camino 1 - es un ApiError y devuelve sus mensajes unidos', () => {
    const error = new ApiError(
      400,
      cuerpo(400, ['quantity must not be zero', 'reason is required']),
    );

    expect(describeError(error, RESPALDO)).toBe('quantity must not be zero. reason is required');
  });

  it('Camino 2 - es un Error con mensaje y devuelve ese mensaje', () => {
    expect(describeError(new Error('Network request failed'), RESPALDO)).toBe(
      'Network request failed',
    );
  });

  it('Camino 3 - es un Error sin mensaje y devuelve el respaldo', () => {
    expect(describeError(new Error(''), RESPALDO)).toBe(RESPALDO);
  });

  it('Camino 4 - no es un Error y devuelve el respaldo', () => {
    expect(describeError({ reason: 'desconocido' }, RESPALDO)).toBe(RESPALDO);
  });
});
