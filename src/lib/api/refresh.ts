import { API_ORIGIN } from '@/config/api';
import {
  forgetSession,
  getAccessToken,
  hasFreshAccessToken,
  storeSession,
  type Session,
} from './session';

/**
 * Concurrent refreshes must collapse into one call: the API rotates refresh
 * tokens and treats a replayed one as theft, revoking every session of that
 * user. Two parallel 401s would do exactly that.
 */
let inFlight: Promise<Session | null> | null = null;

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
  if (hasFreshAccessToken()) return getAccessToken();

  const session = await refreshSession();
  return session?.accessToken ?? null;
}
