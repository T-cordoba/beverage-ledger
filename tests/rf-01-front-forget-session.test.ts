import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  forgetSession,
  getAccessToken,
  hasFreshAccessToken,
  onSessionLost,
  storeSession,
} from '@/lib/api/session';

const SESION = { accessToken: 'jwt-de-prueba', expiresIn: 900 } as Parameters<
  typeof storeSession
>[0];

describe('forgetSession', () => {
  afterEach(() => {
    forgetSession();
  });

  it('Camino 1 - no hay sesion guardada y no avisa a los oyentes', () => {
    const oyente = vi.fn();
    const olvidar = onSessionLost(oyente);

    forgetSession();

    expect(oyente).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    olvidar();
  });

  it('Camino 2 - hay sesion guardada y avisa a los oyentes', () => {
    const oyente = vi.fn();
    const olvidar = onSessionLost(oyente);
    storeSession(SESION);

    expect(getAccessToken()).toBe('jwt-de-prueba');
    expect(hasFreshAccessToken()).toBe(true);

    forgetSession();

    expect(oyente).toHaveBeenCalledOnce();
    expect(getAccessToken()).toBeNull();
    expect(hasFreshAccessToken()).toBe(false);
    olvidar();
  });
});

describe('onSessionLost', () => {
  afterEach(() => {
    forgetSession();
  });

  it('Camino 1 - el oyente sigue suscrito y se le avisa', () => {
    const oyente = vi.fn();
    const olvidar = onSessionLost(oyente);
    storeSession(SESION);

    forgetSession();

    expect(oyente).toHaveBeenCalledOnce();
    olvidar();
  });

  it('Camino 2 - el oyente se dio de baja y ya no se le avisa', () => {
    const oyente = vi.fn();
    const olvidar = onSessionLost(oyente);
    storeSession(SESION);

    olvidar();
    forgetSession();

    expect(oyente).not.toHaveBeenCalled();
  });
});
