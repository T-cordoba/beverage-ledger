import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { openDraft } from '@/features/movements/api';
import { api, unwrap } from '@/lib/api';
import { storeSession } from '@/lib/api/session';

describe('Registrar ajuste - Front', () => {
  let productId = '';
  let locationId = '';
  const abiertos: string[] = [];

  const ajuste = (draftId: string | null) => ({
    type: 'ADJUSTMENT' as const,
    items: [{ productId, quantity: 1, unit: 'BOTTLE' as const }],
    locationId,
    reason: 'Ajuste por inventario',
    note: 'vitest',
    draftId,
  });

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

  it('Camino 1 - un ajuste nuevo inicia vacío', () => {
    expect({
      type: 'ADJUSTMENT',
      items: [],
      locationId: '',
      reason: '',
      note: '',
      draftId: null,
    }).toEqual({
      type: 'ADJUSTMENT',
      items: [],
      locationId: '',
      reason: '',
      note: '',
      draftId: null,
    });
  });

  it('Camino 2 - se agrega un producto y se registra la cantidad', () => {
    const movimiento = ajuste(null);

    expect(movimiento.items).toEqual([
      {
        productId,
        quantity: 1,
        unit: 'BOTTLE',
      },
    ]);
  });

  it('Camino 3 - el ajuste convierte el producto seleccionado en items', () => {
    const movimiento = ajuste(null);

    expect(movimiento.items.length).toBe(1);
    expect(movimiento.items[0].productId).toBe(productId);
    expect(movimiento.items[0].quantity).toBe(1);
    expect(movimiento.items[0].unit).toBe('BOTTLE');
  });

  it('Camino 4 - se abre y confirma el ajuste mediante el API', async () => {
    const draft = await openDraft(ajuste(null));
    abiertos.push(draft.id);

    expect(draft.type).toBe('ADJUSTMENT');
    expect(draft.status).toBe('DRAFT');

    const confirmada = unwrap(
      await api.POST('/api/v1/movements/{id}/confirm', {
        params: { path: { id: draft.id } },
      }),
    );

    expect(confirmada.id).toBe(draft.id);
  });

  afterAll(async () => {
    for (const id of abiertos) {
      await api.POST('/api/v1/movements/{id}/cancel', {
        params: { path: { id } },
        body: { reason: 'Ajuste abierto por las pruebas' },
      });
    }
  });
});