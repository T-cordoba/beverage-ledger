/**
 * Origin of beverage-ledger-api, without a path.
 *
 * The generated operation paths already carry the `/api/v1` prefix, so the base
 * URL must stop at the host or every request would ask for `/api/v1/api/v1/...`.
 */
export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? '';

if (!API_ORIGIN) {
  throw new Error('NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.');
}

/** Swagger mounts outside the global prefix, so this one is not under /api/v1. */
export const API_DOCS_URL = `${API_ORIGIN}/docs`;

export const GOOGLE_SIGN_IN_URL = `${API_ORIGIN}/api/v1/auth/google`;

/**
 * Google is optional: the API answers 501 on those routes when it has no
 * credentials configured, so the button stays hidden until it does.
 */
export const IS_GOOGLE_SIGN_IN_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === 'true';
