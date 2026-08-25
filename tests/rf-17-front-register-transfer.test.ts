import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { openDraft } from '@/features/movements/api';
import { api, unwrap } from '@/lib/api';
import { storeSession } from '@/lib/api/session';

describe('Registrar traspaso - Front', () => {
  let productId = '';
  let locationId = '';
  let destinationLocationId = '';
  const abiertos: string[] = [];

  const traspaso = (draftId: string | null) => ({
    type: 'TRANSFER' as const,
    items: [{ productId, quantity: 1, unit: 'BOTTLE' as const }],
    locationId,
    destinationLocationId,
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
        params: { query: { pageSize: 2 } },
      }),
    );

    locationId = locations.data[0].id;
    destinationLocationId = locations.data[1].id;
  });

  it('Camino 1 - un traspaso nuevo inicia vacío', () => {
    expect({
      type: 'TRANSFER',
      items: [],
      locationId: '',
      destinationLocationId: '',
      note: '',
      draftId: null,
    }).toEqual({
      type: 'TRANSFER',
      items: [],
      locationId: '',
      destinationLocationId: '',
      note: '',
      draftId: null,
    });
  });

  it('Camino 2 - se agrega un producto y se registra la cantidad', () => {
    const movimiento = traspaso(null);

    expect(movimiento.items).toEqual([
      {
        productId,
        quantity: 1,
        unit: 'BOTTLE',
      },
    ]);
  });

  it('Camino 3 - el traspaso convierte el producto seleccionado en items', () => {
    const movimiento = traspaso(null);

    expect(movimiento.items.length).toBe(1);
    expect(movimiento.items[0].productId).toBe(productId);
    expect(movimiento.items[0].quantity).toBe(1);
    expect(movimiento.items[0].unit).toBe('BOTTLE');
  });

  it('Camino 4 - se abre y confirma el traspaso mediante el API', async () => {
    const draft = await openDraft(traspaso(null));
    abiertos.push(draft.id);

    expect(draft.type).toBe('TRANSFER');
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
        body: { reason: 'Traspaso abierto por las pruebas' },
      });
    }
  });
});