import createClient, { type Middleware } from 'openapi-fetch';
import { API_ORIGIN } from '@/config/api';
import { ApiError } from './errors';
import type { paths } from './schema';
import { ensureAccessToken, forgetSession } from './session';

/**
 * Routes that open a session. They carry no token, and asking for one there
 * would recurse: renewing a token is itself a call to /auth/refresh.
 */
const SESSION_ROUTES = new Set(['/api/v1/auth/login', '/api/v1/auth/register']);

/**
 * The token is renewed before it lapses rather than retried after a 401.
 *
 * Replaying a request after a refresh means re-sending a body that the first
 * attempt already consumed, so the retry path has to keep a clone of every
 * request alive. Checking the expiry up front costs nothing and leaves the 401
 * as what it actually means: this session is over.
 */
const authentication: Middleware = {
  async onRequest({ request, schemaPath }) {
    if (SESSION_ROUTES.has(schemaPath)) return request;

    const token = await ensureAccessToken();

    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }

    return request;
  },

  onResponse({ response, schemaPath }) {
    if (response.status === 401 && !SESSION_ROUTES.has(schemaPath)) {
      forgetSession();
    }

    return response;
  },
};

/** credentials: the refresh cookie is httpOnly and the API is a different origin. */
export const api = createClient<paths>({ baseUrl: API_ORIGIN, credentials: 'include' });

api.use(authentication);

interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/** Turns the `{ data, error }` pair into a value or a throw, which is what TanStack Query expects. */
export function unwrap<T>(result: FetchResult<T>): T {
  if (!result.response.ok || result.data === undefined) {
    throw new ApiError(result.response.status, result.error);
  }

  return result.data;
}

/** For the 204s: success carries no body. */
export function assertOk(result: Pick<FetchResult<never>, 'error' | 'response'>): void {
  if (!result.response.ok) {
    throw new ApiError(result.response.status, result.error);
  }
}
