import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { openDraft } from '@/features/movements/api';
import { api, unwrap } from '@/lib/api';
import { storeSession } from '@/lib/api/session';
import { renderHook, act } from '@testing-library/react';
import { useMovementDraft } from '@/features/movements/useMovementDraft';

describe('Registrar traspaso - Front', () => {
let productId = '';
let locationId = '';
let destinationLocationId = '';
const abiertos: string[] = [];

beforeEach(() => {
window.localStorage.removeItem('beverage-ledger:movement-draft:TRANSFER');
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

it('Camino 1 - se registra un traspaso con ubicaciones diferentes', async () => {
const { result } = renderHook(() => useMovementDraft('TRANSFER'));

act(() => {
  result.current.setLocationId(locationId);
  result.current.setDestinationLocationId(destinationLocationId);
});

expect(result.current.locationId).toBe(locationId);
expect(result.current.destinationLocationId).toBe(destinationLocationId);

const movement = {
  type: 'TRANSFER' as const,
  items: [
    {
      productId,
      quantity: 1,
      unit: 'BOTTLE' as const,
    },
  ],
  locationId: result.current.locationId,
  destinationLocationId: result.current.destinationLocationId,
  note: 'vitest',
  draftId: null,
};

const draft = await openDraft(movement);
abiertos.push(draft.id);

expect(draft.type).toBe('TRANSFER');
expect(draft.status).toBe('DRAFT');

});

it('Camino 2 - se limpia destinationLocationId cuando coincide con locationId', () => {
const { result } = renderHook(() => useMovementDraft('TRANSFER'));


act(() => {
  result.current.setDestinationLocationId(destinationLocationId);
  result.current.setLocationId(destinationLocationId);
});

expect(result.current.locationId).toBe(destinationLocationId);
expect(result.current.destinationLocationId).toBe('');

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
