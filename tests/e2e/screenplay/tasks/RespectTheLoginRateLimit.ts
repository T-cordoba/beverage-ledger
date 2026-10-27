import { Interaction } from '@serenity-js/core';

/**
 * The API throttles /auth/login and /auth/refresh to 10 requests a minute per IP
 * (AUTH_THROTTLE in beverage-ledger-api). Every scenario opens a fresh browser,
 * whose first page load already spends a refresh before the sign-in spends a
 * login. Spacing those pairs keeps a full run under the limit instead of failing
 * halfway through with a 429 that reads like a wrong password.
 */
const MIN_GAP_MS = 7_000;

let lastSignInAt = 0;

export const RespectTheLoginRateLimit = () =>
  Interaction.where('#actor espera su turno para iniciar sesión', async () => {
    const wait = lastSignInAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastSignInAt = Date.now();
  });
