import { expect } from 'chai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, it, vi } from 'vitest';
import { useLowStock } from '@/features/stock/low-stock';
import type { StockLevel } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';

const { client } = vi.hoisted(() => ({ client: { GET: vi.fn() } }));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: client,
}));

const level = (productName: string, quantityBase: number) =>
  ({
    productId: productName,
    productName,
    quantityBase,
    minimumStock: 10,
    isBelowMinimum: true,
  }) as StockLevel;

const ok = (data: StockLevel[]) => ({ response: new Response(null, { status: 200 }), data });

const withQueryClient = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return QueryWrapper;
};

describe('RF-27 regression - products below the minimum stock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the worst offenders in the order the API ranked them', async () => {
    client.GET.mockResolvedValue(
      ok([level('Absolut', 0), level('Havana', 2), level('Jameson', 7)]),
    );

    const { result } = renderHook(() => useLowStock(3), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).to.equal(true));

    expect(
      result.current.data?.map((row) => row.productName),
      'ranked products',
    ).to.have.ordered.members(['Absolut', 'Havana', 'Jameson']);
    expect(result.current.data, 'every row').to.satisfy((rows: StockLevel[]) =>
      rows.every((row) => row.quantityBase < (row.minimumStock ?? 0)),
    );
  });

  it('an API failure reaches the card as an ApiError with its status', async () => {
    client.GET.mockResolvedValue({
      response: new Response(null, { status: 403 }),
      error: { statusCode: 403, message: 'Forbidden resource' },
    });

    const { result } = renderHook(() => useLowStock(8), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isError).to.equal(true));

    expect(result.current.error, 'query error')
      .to.be.instanceOf(ApiError)
      .and.to.include({ status: 403, message: 'Forbidden resource' });
    expect(result.current.data, 'query data').to.be.undefined;
  });

  it('two cards asking for the same limit share a single request', async () => {
    client.GET.mockResolvedValue(ok([level('Absolut', 0)]));
    const wrapper = withQueryClient();

    const first = renderHook(() => useLowStock(5), { wrapper });
    const second = renderHook(() => useLowStock(5), { wrapper });
    await waitFor(() =>
      expect(first.result.current.isSuccess && second.result.current.isSuccess).to.equal(true),
    );

    expect(client.GET.mock.calls, 'requests sent').to.have.lengthOf(1);
  });

  it('enabling the query later sends the request it held back', async () => {
    client.GET.mockResolvedValue(ok([]));
    const { result, rerender } = renderHook(({ enabled }) => useLowStock(8, enabled), {
      wrapper: withQueryClient(),
      initialProps: { enabled: false },
    });
    const requestsWhileDisabled = client.GET.mock.calls.length;

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.isSuccess).to.equal(true));

    expect(requestsWhileDisabled, 'requests while disabled').to.equal(0);
    expect(client.GET.mock.calls, 'requests once enabled').to.deep.equal([
      ['/api/v1/stock/low', { params: { query: { limit: 8 } } }],
    ]);
  });
});
