
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { openDraft } from '@/features/movements/api';
import { api, unwrap } from '@/lib/api';
import { storeSession } from '@/lib/api/session';

describe('Anular un movimiento confirmado - Front', () => {
  let productId = '';
  let locationId = '';

  const movimientos: string[] = [];

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

    const products = unwrap(
      await api.GET('/api/v1/products', {
        params: { query: { pageSize: 1 } },
      }),
    );

    productId = products.data[0].id;

    const locations = unwrap(
      await api.GET('/api/v1/locations', {
        params: { query: { pageSize: 1 } },
      }),
    );

    locationId = locations.data[0].id;
  });

  afterAll(async () => {
    for (const id of movimientos) {
      try {
        await api.POST('/api/v1/movements/{id}/cancel', {
          params: { path: { id } },
          body: { reason: 'Movimiento creado por las pruebas' },
        });
      } catch {}
    }
  });

  it('Camino 1 - la cancelación falla y se obtiene un error', async () => {
    const response = await api.POST('/api/v1/movements/{id}/cancel', {
      params: { path: { id: 'id-inexistente' } },
      body: {
        reason: 'Error en el registro',
      },
    });

    expect(response.error).toBeDefined();
  });

  it('Camino 2 - la cancelación es exitosa y el movimiento queda cancelado', async () => {
    const draft = await openDraft({
      type: 'OUTBOUND',
      items: [
        {
          productId,
          quantity: 1,
          unit: 'BOTTLE',
        },
      ],
      locationId,
      note: 'Movimiento creado por prueba RF-20',
      draftId: null,
    });

    movimientos.push(draft.id);

    const confirmado = unwrap(
      await api.POST('/api/v1/movements/{id}/confirm', {
        params: { path: { id: draft.id } },
      }),
    );

    expect(confirmado.status).toBe('CONFIRMED');

    const cancelado = unwrap(
      await api.POST('/api/v1/movements/{id}/cancel', {
        params: { path: { id: draft.id },
        },
        body: {
          reason: 'Anulación de prueba RF-20',
        },
      }),
    );

    expect(cancelado.status).toBe('CANCELLED');
  });
});

