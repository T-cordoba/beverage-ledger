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
