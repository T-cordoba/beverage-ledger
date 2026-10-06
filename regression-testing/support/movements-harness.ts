import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { Movement, MovementItem, Product } from '@/lib/api';

/**
 * Builders for the movement regression suites that drive the real mutations
 * over a mocked `api` client.
 *
 * Kept here rather than imported from tests/support: the @/ alias only reaches
 * src/, and the lint rule forbids climbing out of this directory.
 */

export const productFixture = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-1',
  name: 'Test product',
  category: { id: 'category-1', name: 'Spirits' },
  brand: { id: 'brand-1', name: 'Test brand' },
  subcategory: 'Rum',
  abv: 40,
  origin: 'Colombia',
  age: null,
  caseSize: 12,
  minimumStock: 10,
  isActive: true,
  ...overrides,
});

export const itemFixture = (overrides: Partial<MovementItem> = {}): MovementItem => ({
  id: 'item-1',
  productId: 'product-1',
  locationId: 'location-1',
  quantity: 1,
  unit: 'BOTTLE',
  quantityBase: 1,
  productNameSnapshot: 'Test product',
  brandNameSnapshot: 'Test brand',
  ...overrides,
});

export const movementFixture = (overrides: Partial<Movement> = {}): Movement => ({
  id: 'movement-1',
  code: 'MOV-2026-000001',
  type: 'OUTBOUND',
  status: 'DRAFT',
  locationId: 'location-1',
  destinationLocationId: null,
  occurredAt: '2026-01-01T12:00:00.000Z',
  reason: null,
  note: null,
  createdBy: { id: 'user-1', name: 'Test user' },
  confirmedAt: null,
  cancelledAt: null,
  createdAt: '2026-01-01T12:00:00.000Z',
  items: [],
  ...overrides,
});

/** An openapi-fetch result over a real Response, so `ok` follows from `status`. */
export const apiReply = (status: number, payload: { data?: unknown; error?: unknown } = {}) => ({
  data: payload.data,
  error: payload.error,
  response: new Response(null, { status }),
});

/** The `{ data, meta }` envelope every list endpoint answers with. */
export const pageOf = <T>(data: T[]) => ({
  data,
  meta: { page: 1, pageSize: data.length, total: data.length, pageCount: 1, count: data.length },
});

/** A fresh QueryClient per test, with retries off so a failure surfaces at once. */
export function withQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return { queryClient, wrapper: QueryWrapper };
}

/** The query keys a QueryClient was asked to invalidate, in call order. */
export const invalidatedKeys = (calls: unknown[][]) =>
  calls.map(([filters]) => (filters as { queryKey: readonly unknown[] }).queryKey);
