import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { useLowStock } from '@/features/stock/api';
import { API_ORIGIN } from '@/config/api';
import { storeSession } from '@/lib/api/session';

/**
 * RF-27 - FRONT - useLowStock(limit, enabled)
 * Un test por cada camino de la tabla de docs/testing/RF-27-bajo-minimo.md.
 * Habla con la API de verdad, asi que hace falta tenerla levantada.
 */
describe('useLowStock', () => {
  beforeAll(async () => {
    const response = await fetch(`${API_ORIGIN}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      }),
    });

    // storeSession es la misma funcion que usa la pantalla de login: deja el
    // token en memoria y el cliente lo adjunta a cada peticion.
    storeSession(await response.json());
  });

  const lowStock = (limit: number, enabled?: boolean) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return renderHook(() => useLowStock(limit, enabled), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }).result;
  };

  it('Camino 1 - la consulta llega deshabilitada y no sale ninguna peticion', () => {
    const result = lowStock(8, false);

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('Camino 2 - el parametro se omite, la consulta se habilita y trae los productos', async () => {
    const result = lowStock(8);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data!.length).toBeLessThanOrEqual(8);
  });
});
