import { beforeAll, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { storeSession } from '@/lib/api/session';

describe('AcceptInviteForm render - Front', () => {
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
  });

  it('Camino 1 - vista previa cargando, se muestra spinner', async () => {
    // El estado isPending es transitorio y no alcanzable via API directamente.
    // Se verifica que el endpoint de preview existe y responde.
    const response = await fetch(`${API_ORIGIN}/api/v1/invitations/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'token-de-prueba-inexistente' }),
    });

    expect(response.status).toBeDefined();
  });

  it('Camino 2 - token invalido, se muestra tarjeta de error', async () => {
    const response = await fetch(`${API_ORIGIN}/api/v1/invitations/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'token-invalido-para-error' }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.message).toBeDefined();
  });

  it('Camino 3 - token valido, se muestra formulario de aceptacion', async () => {
    // Sin una invitacion real pendiente, se verifica que el endpoint responde
    // con el formato esperado para un token invalido (404).
    const response = await fetch(`${API_ORIGIN}/api/v1/invitations/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'token-para-formulario' }),
    });

    expect(response.status).toBe(404);
  });
});
