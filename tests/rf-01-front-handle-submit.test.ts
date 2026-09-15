import { describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';

describe('handleSubmit - Front', () => {
  it('Camino 1 - signIn lanza excepcion y se muestra el error', async () => {
    const response = await fetch(`${API_ORIGIN}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'no-existe@ejemplo.com', password: 'contraseña-incorrecta' }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.message).toBeDefined();
  });

  // it('Camino 2 - signIn tiene exito y devuelve datos de sesion', async () => {
  //   const response = await fetch(`${API_ORIGIN}/api/v1/auth/login`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       email: process.env.TEST_USER_EMAIL,
  //       password: process.env.TEST_USER_PASSWORD,
  //     }),
  //   });

  //   expect(response.ok).toBe(true);
  //   expect(response.status).toBe(200);

  //   const body = await response.json();
  //   expect(body.accessToken).toBeDefined();
  //   expect(body.user).toBeDefined();
  //   expect(body.expiresIn).toBeDefined();
  // });
});
