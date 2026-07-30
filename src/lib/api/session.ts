import { API_ORIGIN } from '@/config/api';
import type { components } from './schema';

export type Session = components['schemas']['SessionDto'];

/**
 * The access token lives here and nowhere else.
 *
 * Not in localStorage or a readable cookie: anything a script on the page can
 * read, an injected script can exfiltrate. Losing it on reload is the point —
 * the httpOnly refresh cookie is what survives, and it buys a new one.
 */
let accessToken: string | null = null;
let expiresAtMs = 0;

/** Refreshed slightly early, so a request never travels with a token about to lapse. */
const RENEW_MARGIN_MS = 30_000;

/**
 * Concurrent refreshes must collapse into one call: the API rotates refresh
 * tokens and treats a replayed one as theft, revoking every session of that
 * user. Two parallel 401s would do exactly that.
 */
let inFlight: Promise<Session | null> | null = null;

const sessionLostListeners = new Set<() => void>();

export const getAccessToken = (): string | null => accessToken;

export const hasFreshAccessToken = (): boolean =>
  accessToken !== null && Date.now() + RENEW_MARGIN_MS < expiresAtMs;

export function storeSession(session: Session): void {
  accessToken = session.accessToken;
  expiresAtMs = Date.now() + session.expiresIn * 1000;
}

export function forgetSession(): void {
  const hadSession = accessToken !== null;
  accessToken = null;
  expiresAtMs = 0;

  if (hadSession) {
    sessionLostListeners.forEach((listener) => listener());
  }
}

/** Lets the auth provider send the user back to the login screen. */
export function onSessionLost(listener: () => void): () => void {
  sessionLostListeners.add(listener);
  return () => sessionLostListeners.delete(listener);
}

async function requestRefresh(): Promise<Session | null> {
  try {
    const response = await fetch(`${API_ORIGIN}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      forgetSession();
      return null;
    }

    const session = (await response.json()) as Session;
    storeSession(session);
    return session;
  } catch {
    // A network failure is not an expired session: keep whatever token is left
    // and let the caller surface the error.
    return null;
  }
}

export function refreshSession(): Promise<Session | null> {
  inFlight ??= requestRefresh().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/** Returns a usable token, renewing it first when it is missing or stale. */
export async function ensureAccessToken(): Promise<string | null> {
  if (hasFreshAccessToken()) return accessToken;

  const session = await refreshSession();
  return session?.accessToken ?? null;
}
