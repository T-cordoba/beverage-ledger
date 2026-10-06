import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { vi } from 'vitest';
import type { Movement, MovementItem, MovementLineInput, Product, Session } from '@/lib/api';

/**
 * Performance harness: the real client, the real hooks, a fake network.
 *
 * Only `fetch` is replaced, so everything the frontend does between the hook
 * and the wire — openDraft, openapi-fetch, the auth middleware, unwrap,
 * ApiError, the blob download — runs and is timed as it would in the browser.
 * No request ever reaches beverage-ledger-api: these are not load tests against
 * a live server.
 *
 * Must be awaited at module scope, before anything imports `@/lib/api`:
 * openapi-fetch captures `globalThis.fetch` when the client is created.
 */
export async function loadUnderTest() {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);

  const lib = await import('@/lib/api');
  const movements = await import('@/features/movements/api');
  const draft = await import('@/features/movements/useMovementDraft');

  return { fetchMock, ...lib, ...movements, ...draft };
}

export type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

/**
 * Budgets are deliberately generous: an order of magnitude above what a local
 * run takes, so a busy laptop or a CI agent does not turn them red. What they
 * catch is an algorithmic regression — a quadratic loop, a request per line —
 * not a few milliseconds of noise.
 */
export const BUDGET_MS = {
  /** One register/cancel round trip over the mocked transport. */
  singleOperation: 250,
  /** Building, sending and reading back a movement with hundreds of lines. */
  largePayload: 1_500,
  /** A batch of repeated or concurrent operations. */
  batch: 5_000,
  /** Pure in-memory transformation of a large draft. */
  transform: 1_000,
} as const;

/** Wall-clock duration of an async block, in milliseconds. */
export async function timed<T>(block: () => Promise<T> | T): Promise<{ ms: number; value: T }> {
  const start = performance.now();
  const value = await block();
  return { ms: performance.now() - start, value };
}

/** Median of a set of timings: one slow sample from a GC pause does not decide it. */
export function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** A canned JSON answer, rebuilt per call because a body can only be read once. */
export const answer = (status: number, body?: unknown) => async () => json(status, body);

/** The body NestJS sends on any failure, matching ApiErrorBody. */
export const errorBody = (statusCode: number, error: string, message: string | string[]) => ({
  statusCode,
  error,
  message,
  path: '/api/v1/movements',
  timestamp: '2026-01-01T00:00:00.000Z',
});

/** Deterministic UUID-shaped id, so large fixtures need no randomness. */
export const uuid = (n: number, prefix = 'c') =>
  `${prefix.repeat(8)}-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

export const LOCATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const DESTINATION_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

/** A complete MovementDto. Pass only what the assertion looks at. */
export const movementDto = (overrides: Partial<Movement> = {}): Movement => ({
  id: '11111111-1111-4111-8111-111111111111',
  code: 'MOV-2026-000001',
  type: 'OUTBOUND',
  status: 'DRAFT',
  locationId: LOCATION_ID,
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

/** A complete ProductDto. */
export const productDto = (n: number, caseSize = 12): Product => ({
  id: uuid(n, 'b'),
  name: `Producto ${n}`,
  category: { id: uuid(1, 'e'), name: 'Ron' },
  brand: null,
  subcategory: null,
  abv: 40,
  origin: null,
  age: null,
  caseSize,
  minimumStock: null,
  isActive: true,
});

/** `count` input lines alternating between bottles and cases. */
export const lineInputs = (count: number, sign = 1): MovementLineInput[] =>
  Array.from({ length: count }, (_, i) => ({
    productId: uuid(i + 1, 'b'),
    quantity: sign * ((i % 9) + 1),
    unit: i % 2 === 0 ? 'BOTTLE' : 'CASE',
  }));

/** The ledger lines the API writes back for a set of inputs. */
export const itemsFor = (lines: MovementLineInput[], locationId = LOCATION_ID): MovementItem[] =>
  lines.map((line, i) => ({
    id: uuid(i + 1, 'f'),
    productId: line.productId,
    locationId,
    quantity: line.quantity,
    unit: line.unit,
    quantityBase: line.unit === 'CASE' ? line.quantity * 12 : line.quantity,
    productNameSnapshot: `Producto ${i + 1}`,
    brandNameSnapshot: null,
  }));

/**
 * A fake API that answers by route, so concurrent calls each get their own
 * movement back instead of whatever happened to be queued next.
 *
 * POST /movements opens a draft with a fresh id, PATCH /movements/{id} reuses
 * it, POST .../confirm and .../cancel echo it back in the new status.
 */
export function movementRouter(fetchMock: FetchMock) {
  let next = 0;

  fetchMock.mockImplementation(async (input) => {
    const request = input as Request;
    const { pathname } = new URL(request.url);
    const [, id, action] = pathname.match(/^\/api\/v1\/movements(?:\/([^/]+))?(?:\/(\w+))?$/) ?? [];

    if (request.method === 'POST' && !id) {
      const body = (await request.clone().json()) as Partial<Movement> & {
        items: MovementLineInput[];
      };
      next += 1;
      return json(
        201,
        movementDto({
          ...body,
          id: uuid(next, '1'),
          code: `MOV-2026-${String(next).padStart(6, '0')}`,
          items: itemsFor(body.items, body.locationId),
        }),
      );
    }

    if (request.method === 'PATCH' && id) {
      const body = (await request.clone().json()) as { items: MovementLineInput[] };
      return json(200, movementDto({ id, items: itemsFor(body.items) }));
    }

    if (request.method === 'POST' && action === 'confirm') {
      return json(
        200,
        movementDto({ id, status: 'CONFIRMED', confirmedAt: '2026-01-01T00:00:01.000Z' }),
      );
    }

    if (request.method === 'POST' && action === 'cancel') {
      const { reason } = (await request.clone().json()) as { reason: string };
      return json(
        200,
        movementDto({
          id,
          status: 'CANCELLED',
          reason,
          cancelledAt: '2026-01-01T00:00:02.000Z',
        }),
      );
    }

    return json(404, errorBody(404, 'Not Found', `No route for ${request.method} ${pathname}`));
  });
}

/** Method and path of every request sent, in order: the wire-level trace. */
export const trace = (fetchMock: FetchMock) =>
  fetchMock.mock.calls.map(([request]) => {
    const { method, url } = request as Request;
    return `${method} ${new URL(url).pathname}`;
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
