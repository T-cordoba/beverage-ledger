import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLowStock } from '@/features/stock/api';
import type { StockLevel } from '@/lib/api';

const { cliente } = vi.hoisted(() => ({ cliente: { GET: vi.fn() } }));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: cliente,
}));

describe('useLowStock', () => {
  const BAJO_MINIMO = [
    {
      productId: 'e3f1c0aa-0000-4000-8000-000000000001',
      productName: 'Absolut Blue 750ml',
      brandName: 'Absolut',
      categoryName: 'Vodka',
      quantityBase: 4,
      caseSize: 12,
      minimumStock: 10,
      isBelowMinimum: true,
    },
  ] as StockLevel[];

  const lowStock = (limit: number, enabled?: boolean) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return renderHook(() => useLowStock(limit, enabled), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }).result;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Camino 1 - la consulta llega deshabilitada y no sale ninguna peticion', () => {
    cliente.GET.mockResolvedValue({
      response: new Response(null, { status: 200 }),
      data: BAJO_MINIMO,
    });

    const result = lowStock(8, false);

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
    expect(cliente.GET).not.toHaveBeenCalled();
  });

  it('Camino 2 - el parametro se omite, la consulta se habilita y trae los productos', async () => {
    cliente.GET.mockResolvedValue({
      response: new Response(null, { status: 200 }),
      data: BAJO_MINIMO,
    });

    const result = lowStock(8);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(BAJO_MINIMO);
    expect(cliente.GET).toHaveBeenCalledWith('/api/v1/stock/low', {
      params: { query: { limit: 8 } },
    });
  });
});
