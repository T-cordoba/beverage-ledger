import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { vi } from 'vitest';
import type {
  ConsumptionRow,
  KardexEntry,
  Movement,
  PageMeta,
  Product,
  Session,
  StockLevel,
} from '@/lib/api';

/**
 * API testing harness: the real client, the real hooks, a fake network.
 *
 * Only `fetch` is replaced. Everything between the hook and the wire —
 * openDraft, the openapi-fetch client, the auth middleware, unwrap, ApiError —
 * runs as it does in the browser, so the assertions read the actual HTTP
 * request the frontend builds. No call ever reaches beverage-ledger-api.
 *
 * Kept here rather than imported from tests/support: the @/ alias only reaches
 * src/, and the lint rule forbids climbing out of this directory.
 *
 * Must be awaited at module scope, before anything imports `@/lib/api`:
 * openapi-fetch captures `globalThis.fetch` when the client is created.
 */
export async function loadApiUnderTest() {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);

  const lib = await import('@/lib/api');
  const movements = await import('@/features/movements/api');
  const openDraft = await import('@/features/movements/open-draft');
  const stock = await import('@/features/stock/api');
  const lowStock = await import('@/features/stock/low-stock');
  const reports = await import('@/features/reports/api');
  const range = await import('@/features/reports/range');

  return {
    fetchMock,
    ...lib,
    ...movements,
    ...openDraft,
    ...stock,
    ...lowStock,
    ...reports,
    ...range,
  };
}

export type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

/** The Request openapi-fetch handed to the transport on a given call. */
export const requestOf = (fetchMock: FetchMock, call = 0) =>
  fetchMock.mock.calls[call][0] as Request;

/** Method and path of every request sent, in order: the wire-level trace. */
export const trace = (fetchMock: FetchMock) =>
  fetchMock.mock.calls.map(([request]) => {
    const { method, url } = request as Request;
    return `${method} ${new URL(url).pathname}`;
  });

/** The JSON body a request carried. */
export const bodyOf = async (fetchMock: FetchMock, call = 0): Promise<unknown> =>
  requestOf(fetchMock, call).clone().json();

/** A canned JSON answer, rebuilt per call because a body can only be read once. */
export const answer = (status: number, body?: unknown) => async () =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** The body NestJS sends on any failure, matching ApiErrorBody. */
export const errorBody = (statusCode: number, error: string, message: string | string[]) => ({
  statusCode,
  error,
  message,
  path: '/api/v1/movements',
  timestamp: '2026-01-01T00:00:00.000Z',
});

/** A complete MovementDto. Pass only what the assertion looks at. */
export const movementDto = (overrides: Partial<Movement> = {}): Movement => ({
  id: '11111111-1111-4111-8111-111111111111',
  code: 'MOV-2026-000001',
  type: 'OUTBOUND',
  status: 'DRAFT',
  locationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  destinationLocationId: null,
  occurredAt: '2026-01-01T00:00:00.000Z',
  reason: null,
  note: null,
  createdBy: { id: 'user-1', name: 'Usuario de prueba' },
  confirmedAt: null,
  cancelledAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  items: [],
  ...overrides,
});

/** A token in memory, so the auth middleware never spends a call on /auth/refresh. */
export const session = (): Session => ({
  accessToken: 'access-token-de-prueba',
  expiresIn: 900,
  user: {
    id: 'user-1',
    email: 'admin@beverageledger.local',
    name: 'Administrador de prueba',
    avatarUrl: null,
    role: 'ORG_ADMIN',
    status: 'ACTIVE',
  },
});

/** A fresh QueryClient per test, wrapped for renderHook. */
export function queryWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);

  return { client, wrapper };
}

export const queryOf = (fetchMock: FetchMock, call = 0): Record<string, string> =>
  Object.fromEntries(new URL(requestOf(fetchMock, call).url).searchParams);

export const pageOf = <T>(data: T[], meta: Partial<PageMeta> = {}) => ({
  data,
  meta: {
    page: 1,
    pageSize: 10,
    total: data.length,
    pageCount: Math.max(1, Math.ceil(data.length / 10)),
    count: data.length,
    ...meta,
  },
});

export const stockLevelDto = (overrides: Partial<StockLevel> = {}): StockLevel => ({
  productId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  productName: 'Ron Viejo de Caldas',
  brandName: 'Viejo de Caldas',
  categoryName: 'Ron',
  quantityBase: 30,
  caseSize: 12,
  minimumStock: 12,
  isBelowMinimum: false,
  ...overrides,
});

export const kardexEntryDto = (overrides: Partial<KardexEntry> = {}): KardexEntry => ({
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  movementId: '11111111-1111-4111-8111-111111111111',
  movementCode: 'MOV-2026-000001',
  type: 'INBOUND',
  occurredAt: '2026-01-01T00:00:00.000Z',
  quantity: 2,
  unit: 'CASE',
  quantityBase: 24,
  balanceAfter: 24,
  ...overrides,
});

export const consumptionRowDto = (overrides: Partial<ConsumptionRow> = {}): ConsumptionRow => ({
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  name: 'Ron',
  quantityBase: 120,
  movementCount: 8,
  ...overrides,
});

export const productDto = (overrides: Partial<Product> = {}): Product => ({
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Ron Viejo de Caldas',
  category: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Ron' },
  brand: null,
  subcategory: null,
  abv: 35,
  origin: null,
  age: null,
  caseSize: 12,
  minimumStock: 12,
  isActive: true,
  ...overrides,
});
