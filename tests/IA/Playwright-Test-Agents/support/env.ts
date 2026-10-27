/**
 * Where the suite points and who it signs in as. Read from the shell, never from
 * a committed file: the account is a real user of the organization.
 */
export const BASE_URL =
  process.env.IA_BASE_URL ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000';

/** Has to be the same API the front talks to, or the cleanup voids nothing. */
export const API_URL =
  process.env.IA_API_URL ||
  process.env.E2E_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

export const MANAGER = {
  email: process.env.TEST_USER_EMAIL ?? '',
  password: process.env.TEST_USER_PASSWORD ?? '',
};

const isLocal = (url: string) => ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

/**
 * The scenarios that confirm or void movements write to the ledger. They only
 * run when both ends are a disposable local stack, so a run can never touch
 * Render or the Vercel deploy.
 */
export const WRITES_ALLOWED = isLocal(BASE_URL) && isLocal(API_URL);

export const WRITES_SKIPPED_REASON =
  'Escribe en el ledger: solo corre con IA_BASE_URL e IA_API_URL en localhost.';
