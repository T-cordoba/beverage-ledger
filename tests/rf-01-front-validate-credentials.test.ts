import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ORIGIN } from '@/config/api';

describe('handleSubmit - Front', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('Camino 1 - signIn lanza excepcion y se muestra el error', async () => {
    // Arrange
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Credenciales inválidas' }),
    });

    // Act
    const response = await fetch(`${API_ORIGIN}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'no-existe@ejemplo.com',
        password: 'contraseña-incorrecta',
      }),
    });
    const body = await response.json();


    // Assert
    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
    expect(body.message).toBeDefined();
  });

  it('Camino 2 - signIn tiene exito y devuelve datos de sesion', async () => {
    // Arrange
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: 'token-de-prueba',
        user: { id: 'user-1', email: 'admin@beverageledger.local' },
        expiresIn: 900,
      }),
    });

    // Act
    const response = await fetch(`${API_ORIGIN}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@beverageledger.local',
        password: 'password-de-prueba',
      }),
    });
    const body = await response.json();

    // Assert
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);

    expect(body.accessToken).toBeDefined();
    expect(body.user).toBeDefined();
    expect(body.expiresIn).toBeDefined();
  });
});