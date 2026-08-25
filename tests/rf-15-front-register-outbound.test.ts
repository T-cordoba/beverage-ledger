import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { openDraft } from '@/features/movements/api';
import { api, unwrap } from '@/lib/api';
import { storeSession } from '@/lib/api/session';
import { renderHook, act } from '@testing-library/react';
import { useMovementDraft } from '@/features/movements/useMovementDraft';

describe('Registrar salida - Front', () => {
  let product: any;
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

    product = products.data[0];
  });

  afterAll(async () => {
    for (const id of movimientos) {
      await api.POST('/api/v1/movements/{id}/cancel', {
        params: { path: { id } },
        body: { reason: 'Salida creada por las pruebas Front' },
      });
    }
  });

  it('Camino 1 - una salida nueva inicia vacía', () => {
    const { result } = renderHook(() => useMovementDraft('OUTBOUND'));

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.productCount).toBe(0);
    expect(result.current.totalBottles).toBe(0);
    expect(result.current.totalCases).toBe(0);
  });

  it('Camino 2 - se agrega un producto y se registra la cantidad', () => {
    const { result } = renderHook(() => useMovementDraft('OUTBOUND'));

    act(() => {
      result.current.adjust(product, 'BOTTLE', 1);
    });

    expect(result.current.isEmpty).toBe(false);
    expect(result.current.productCount).toBe(1);
    expect(result.current.totalBottles).toBe(1);
    expect(result.current.quantityOf(product.id).BOTTLE).toBe(1);
  });

  it('Camino 3 - la salida convierte el producto seleccionado en items', () => {
    const { result } = renderHook(() => useMovementDraft('OUTBOUND'));

    act(() => {
      result.current.adjust(product, 'BOTTLE', 1);
    });

    const items = result.current.toItems();

    expect(items).toEqual([
      {
        productId: product.id,
        quantity: 2,
        unit: 'BOTTLE',
      },
    ]);
  });

  it('Camino 4 - se abre y confirma la salida mediante el API', async () => {
    const { result } = renderHook(() => useMovementDraft('OUTBOUND'));

    act(() => {
      result.current.adjust(product, 'BOTTLE', 1);
    });

    const movement = await openDraft({
      type: 'OUTBOUND',
      items: result.current.toItems(),
    });

    movimientos.push(movement.id);

    expect(movement.status).toBe('DRAFT');

    const confirmed = unwrap(
      await api.POST('/api/v1/movements/{id}/confirm', {
        params: { path: { id: movement.id } },
      }),
    );

    expect(confirmed.id).toBe(movement.id);
  });
});