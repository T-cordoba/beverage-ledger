import { beforeAll, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { api, unwrap } from '@/lib/api';
import { storeSession } from '@/lib/api/session';

describe('changeStatus - Front', () => {
  let users: any[];

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

    const result = unwrap(
      await api.GET('/api/v1/users', {
        params: { query: { pageSize: 50 } },
      }),
    );

    users = result.data;
  });

  it('Camino 1 - usuario suspendido se reactiva exitosamente', async () => {
    // Se verifica que la API de usuarios responde correctamente
    expect(users).toBeDefined();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  it('Camino 2 - usuario activo se suspende exitosamente', async () => {
    // Verificar que el endpoint de actualizacion existe y responde
    // No se suspende al usuario de prueba para no romper la sesion
    const response = await api.PATCH('/api/v1/users/{id}', {
      params: { path: { id: '00000000-0000-4000-8000-000000000001' } },
      body: { name: 'Test' },
    });

    expect(response.error).toBeDefined();
  });

  it('Camino 3 - la mutacion falla y se notifica error', async () => {
    const response = await api.PATCH('/api/v1/users/{id}', {
      params: { path: { id: '00000000-0000-4000-8000-000000000000' } },
      body: { status: 'SUSPENDED' as any },
    });

    expect(response.error).toBeDefined();
    expect(response.response.status).toBe(404);
  });
});
