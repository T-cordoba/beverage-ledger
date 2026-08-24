import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { openDraft } from '@/features/movements/api';
import { api, unwrap } from '@/lib/api';
import { storeSession } from '@/lib/api/session';

/**
 * RF-19 - CONEXION - openDraft(input)
 * Un test por cada camino de la tabla de docs/testing/RF-19-borrador-movimiento.md.
 * Abre movimientos de verdad contra la API, asi que hace falta tenerla levantada.
 */
describe('openDraft', () => {
  // La nota marca lo que abrio la prueba, para poder anularlo al terminar y
  // borrarlo despues con el `pnpm test:clean` de la API.
  const NOTA = 'vitest';

  let productId = '';
  const abiertos: string[] = [];

  const salida = (draftId: string | null) => ({
    type: 'OUTBOUND' as const,
    items: [{ productId, quantity: 1, unit: 'BOTTLE' as const }],
    note: NOTA,
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

    // storeSession es la misma funcion que usa la pantalla de login: deja el
    // token en memoria y el cliente lo adjunta a cada peticion.
    storeSession(await response.json());

    const products = unwrap(
      await api.GET('/api/v1/products', { params: { query: { pageSize: 1 } } }),
    );

    productId = products.data[0].id;
  });

  afterAll(async () => {
    for (const id of abiertos) {
      await api.POST('/api/v1/movements/{id}/cancel', {
        params: { path: { id } },
        body: { reason: 'Borrador abierto por las pruebas' },
      });
    }
  });

  it('Camino 1 - no hay borrador previo y se abre un movimiento nuevo', async () => {
    const movement = await openDraft(salida(null));
    abiertos.push(movement.id);

    expect(movement.status).toBe('DRAFT');
  });

  it('Camino 2 - hay un borrador vivo y se reutiliza el mismo movimiento', async () => {
    const reutilizado = await openDraft(salida(abiertos[0]));

    expect(reutilizado.id).toBe(abiertos[0]);
  });

  it('Camino 3 - el borrador ya no existe y se abre un movimiento nuevo', async () => {
    const inventado = crypto.randomUUID();

    const movement = await openDraft(salida(inventado));
    abiertos.push(movement.id);

    expect(movement.id).not.toBe(inventado);
  });
});
