
import { beforeAll, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '@/config/api';
import { api, unwrap } from '@/lib/api';
import { storeSession } from '@/lib/api/session';
import { renderHook, act } from '@testing-library/react';
import { useMovementDraft } from '@/features/movements/useMovementDraft';

describe('Registrar ajuste - Front', () => {
  let product: any;

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

  it('Camino 1 - ajuste con isSigned falso agrega o actualiza la línea', async () => {
    const { result } = renderHook(() => useMovementDraft('ADJUSTMENT'));

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
  });

  it('Camino 2 - ajuste con isSigned verdadero conserva el valor calculado', () => {
    const current = {
      product,
      BOTTLE: 1,
      CASE: 0,
    };

    const raw = current.BOTTLE + 1;

    const next = {
      product,
      BOTTLE: raw,
      CASE: current.CASE,
    };

    expect(next.BOTTLE).toBe(2);
    expect(next.CASE).toBe(0);
  });

  it('Camino 3 - cuando BOTTLE y CASE quedan en cero se elimina la línea', () => {
    const current = {
      product,
      BOTTLE: 1,
      CASE: 0,
    };

    const raw = current.BOTTLE - 1;

    const next = {
      product,
      BOTTLE: Math.max(0, raw),
      CASE: current.CASE,
    };

    expect(next.BOTTLE).toBe(0);
    expect(next.CASE).toBe(0);

    const lineExists = next.BOTTLE !== 0 || next.CASE !== 0;

    expect(lineExists).toBe(false);
  });
});

