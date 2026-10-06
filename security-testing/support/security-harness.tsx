import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { NotificationsProvider } from '@/components/ui';
import { formats } from '@/i18n/formats';
import es from '@/i18n/messages/es.json';
import type { Movement, Session } from '@/lib/api';

/**
 * Security testing harness: the real client, the real hooks, a fake network.
 *
 * Only `fetch` is replaced, so the auth middleware (bearer token, 401 handling),
 * the path serializer, `unwrap` and `ApiError` run exactly as in the browser and
 * every assertion reads the request the frontend would really put on the wire.
 * Nothing ever reaches beverage-ledger-api or any other server: the "attacks"
 * here are crafted inputs and canned hostile answers, never live traffic.
 *
 * Kept here rather than imported from tests/support: the @/ alias only reaches
 * src/, and the lint rule forbids climbing out of this directory.
 *
 * Must be awaited at module scope, before anything imports `@/lib/api`:
 * openapi-fetch captures `globalThis.fetch` when the client is created.
 */
export async function loadClientUnderTest() {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);

  const lib = await import('@/lib/api');
  const session = await import('@/lib/api/session');
  const movements = await import('@/features/movements/api');

  return { fetchMock, ...lib, ...session, ...movements };
}

export type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

export const API_ORIGIN = 'http://localhost:3001';
export const ACCESS_TOKEN = 'access-token-de-prueba';

/** The Request openapi-fetch handed to the transport on a given call. */
export const requestOf = (fetchMock: FetchMock, call = 0): Request => {
  // The refresh call is a plain `fetch(url, init)`; the client hands over a Request.
  const [input, init] = fetchMock.mock.calls[call];
  return input instanceof Request ? input : new Request(String(input), init);
};

/** Method and path of every request sent, in order: the wire-level trace. */
export const trace = (fetchMock: FetchMock) =>
  fetchMock.mock.calls.map((_, call) => {
    const { method, url } = requestOf(fetchMock, call);
    return `${method} ${new URL(url).pathname}`;
  });

/** The JSON body a request carried. */
export const bodyOf = async (fetchMock: FetchMock, call = 0): Promise<Record<string, unknown>> =>
  requestOf(fetchMock, call).clone().json() as Promise<Record<string, unknown>>;

/** The raw text a request carried, to look for anything that should not travel. */
export const rawBodyOf = async (fetchMock: FetchMock, call = 0): Promise<string> =>
  requestOf(fetchMock, call).clone().text();

/** A canned JSON answer, rebuilt per call because a body can only be read once. */
export const answer = (status: number, body?: unknown) => async () =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** A canned non-JSON answer: what a crashing proxy or a debug page would send. */
export const rawAnswer = (status: number, text: string, contentType: string) => async () =>
  new Response(text, { status, headers: { 'Content-Type': contentType } });

/** A canned binary answer, for the PDF route. */
export const blobAnswer =
  (bytes: string, contentType = 'application/pdf') =>
  async () =>
    new Response(new Blob([bytes], { type: contentType }), {
      status: 200,
      headers: { 'Content-Type': contentType },
    });

/** The body NestJS sends on any failure, matching ApiErrorBody. */
export const errorBody = (
  statusCode: number,
  error: string,
  message: string | string[],
  path = '/api/v1/movements',
) => ({
  statusCode,
  error,
  message,
  path,
  timestamp: '2026-01-01T00:00:00.000Z',
});

/**
 * A server error page as an unhardened backend or proxy might leak it: stack
 * trace, file paths, a connection string. None of it may reach the user.
 */
export const LEAKY_ERROR_PAGE = [
  '<!DOCTYPE html><html><body><h1>Internal Server Error</h1>',
  '<pre>PrismaClientKnownRequestError at /app/dist/movements/movements.service.js:212:17',
  'DATABASE_URL=postgresql://admin:s3cr3t@db.internal:5432/ledger</pre>',
  '</body></html>',
].join('\n');

/** Fragments of LEAKY_ERROR_PAGE that would prove a leak if they surfaced. */
export const LEAK_MARKERS = [
  '<pre>',
  'movements.service.js',
  'DATABASE_URL',
  's3cr3t',
  'db.internal',
];

/** Hostile strings a user could type into a free-text field. */
export const XSS_PAYLOAD = '<img src=x onerror="alert(document.cookie)">';
export const SQLI_PAYLOAD = "'; DROP TABLE movements; --";

/** Ids crafted to climb out of /movements/{id} or smuggle a query string. */
export const TRAVERSAL_ID = '../../auth/logout';
export const QUERY_SMUGGLING_ID = 'movement-1?createdByUserId=other-user#frag';

/** Every key CreateMovementDto declares: anything else is a field the client must not invent. */
export const CREATE_MOVEMENT_KEYS = [
  'type',
  'locationId',
  'destinationLocationId',
  'occurredAt',
  'reason',
  'note',
  'items',
];

/** Every key UpdateMovementDto declares: type and locations are fixed once a draft exists. */
export const UPDATE_MOVEMENT_KEYS = ['occurredAt', 'reason', 'note', 'items'];

/** Fields only the server may set on a movement. */
export const SERVER_OWNED_KEYS = [
  'id',
  'code',
  'status',
  'createdBy',
  'createdByUserId',
  'confirmedAt',
  'cancelledAt',
  'createdAt',
  'organizationId',
];

/** A token in memory, so the auth middleware never spends a call on /auth/refresh. */
export const session = (): Session => ({
  accessToken: ACCESS_TOKEN,
  expiresIn: 900,
  user: {
    id: 'user-1',
    email: 'operario@beverageledger.local',
    name: 'Operario de prueba',
    avatarUrl: null,
    role: 'OPERATOR',
    status: 'ACTIVE',
  },
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
  createdBy: { id: 'user-1', name: 'Operario de prueba' },
  confirmedAt: null,
  cancelledAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  items: [],
  ...overrides,
});

/** Whether the access token was written anywhere a script on the page can read. */
export const tokenInBrowserStorage = (token = ACCESS_TOKEN): boolean => {
  const stores = [window.localStorage, window.sessionStorage];
  const persisted = stores.flatMap((store) =>
    Array.from({ length: store.length }, (_, i) => {
      const key = store.key(i) ?? '';
      return `${key}=${store.getItem(key) ?? ''}`;
    }),
  );

  return [...persisted, document.cookie].some((entry) => entry.includes(token));
};

/** A fresh QueryClient per test, never retrying: a retry would hide what one call did. */
export function queryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function queryWrapper() {
  const client = queryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return { client, wrapper };
}

/** Everything a movements screen needs around it: query cache, messages, toasts. */
export function AppProviders({
  client,
  children,
}: Readonly<{ client: QueryClient; children: ReactNode }>) {
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es" messages={es} formats={formats} timeZone="UTC">
        <NotificationsProvider>{children}</NotificationsProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
