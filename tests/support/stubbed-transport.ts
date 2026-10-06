import { vi } from 'vitest';
import { jsonResponse } from './api-result';

/**
 * Loads the real API client over a stubbed transport.
 *
 * The point is to mock the network, not the module under test. Mocking
 * `@/lib/api` replaces the client wholesale, so nothing in `client.ts` runs —
 * not the auth middleware that attaches the bearer token, not the 401 handling,
 * not `unwrap`. Stubbing `fetch` instead leaves all of it executing against a
 * canned response.
 *
 * It has to be awaited at module scope, before anything else pulls in
 * `@/lib/api`: openapi-fetch reads `globalThis.fetch` when `createClient` runs,
 * which happens as that module is evaluated, so the stub has to already be in
 * place. That is what the dynamic imports are for.
 */
export async function stubbedTransport() {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);

  const { api, unwrap, assertOk } = await import('@/lib/api');
  const { storeSession, forgetSession } = await import('@/lib/api/session');

  return { fetchMock, api, unwrap, assertOk, storeSession, forgetSession };
}

/** The Request openapi-fetch handed to the transport on a given call. */
export const requestOf = (fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, call = 0) =>
  fetchMock.mock.calls[call][0] as Request;

/**
 * A canned answer, rebuilt on every call.
 *
 * openapi-fetch reads the response body and a body can only be read once, so
 * two calls cannot share one Response instance. Worth remembering that a single
 * `api.*` call can spend two: when no fresh token is in memory the auth
 * middleware refreshes first, and that refresh is a fetch of its own.
 *
 * Pass to `mockImplementation` for every call, or `mockImplementationOnce` to
 * queue a sequence.
 */
export const answer = (status: number, body?: unknown) => async () => jsonResponse(status, body);
