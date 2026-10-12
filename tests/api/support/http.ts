import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { vi } from 'vitest';
import type { Movement, Session } from '@/lib/api';

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

  return { fetchMock, ...lib, ...movements };
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
