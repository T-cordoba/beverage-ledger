import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { openDraft } from '@/features/movements/api';
import { api, unwrap } from '@/lib/api';
import { storeSession } from '@/lib/api/session';
import { renderHook, act } from '@testing-library/react';
import { useMovementDraft } from '@/features/movements/useMovementDraft';

describe('Registrar entrada - Front', () => {
let product: any;
const movimientos: string[] = [];

beforeEach(() => {
window.localStorage.removeItem('beverage-ledger:movement-draft:INBOUND');
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

product = products.data[0];

});

afterAll(async () => {
for (const id of movimientos) {
await api.POST('/api/v1/movements/{id}/cancel', {
params: { path: { id } },
body: { reason: 'Entrada creada por las pruebas Front' },
});
}
});

it('Camino 1 - la entrada falla al confirmar el registro', async () => {
const { result } = renderHook(() => useMovementDraft('INBOUND'));

act(() => {
  result.current.adjust(product, 'BOTTLE', 1);
});

const movement = await openDraft({
  type: 'INBOUND',
  items: result.current.toItems(),
});

movimientos.push(movement.id);

expect(movement.status).toBe('DRAFT');

const response = await api.POST('/api/v1/movements/{id}/confirm', {
  params: { path: { id: 'id-inexistente' } },
});

expect(response.error).toBeDefined();

});

it('Camino 2 - la entrada se registra correctamente', async () => {
const { result } = renderHook(() => useMovementDraft('INBOUND'));

act(() => {
  result.current.adjust(product, 'BOTTLE', 1);
});

expect(result.current.isEmpty).toBe(false);
expect(result.current.productCount).toBe(1);
expect(result.current.totalBottles).toBe(1);

const items = result.current.toItems();

expect(items).toEqual([
  {
    productId: product.id,
    quantity: 1,
    unit: 'BOTTLE',
  },
]);

const movement = await openDraft({
  type: 'INBOUND',
  items,
});

movimientos.push(movement.id);

expect(movement.type).toBe('INBOUND');
expect(movement.status).toBe('DRAFT');

const confirmed = unwrap(
  await api.POST('/api/v1/movements/{id}/confirm', {
    params: { path: { id: movement.id } },
  }),
);

expect(confirmed.id).toBe(movement.id);

});
});
