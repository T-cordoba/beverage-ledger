import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BrowserContext } from '@playwright/test';

/**
 * The API throttles POST /auth/refresh to 10 per minute per IP (AUTH_THROTTLE
 * in beverage-ledger-api), and the front buys a token there on every cold load,
 * because the access token lives only in memory. A suite that runs `page.goto`
 * a few times per test goes past that in half a minute, the API answers 429 and
 * the app reads it as a lost session: the test lands on /login.
 *
 * So every cold load waits for room under the limit first. The log is a file,
 * not module state, because Playwright replaces the worker after a failure and
 * the API keeps counting the old worker's calls.
 */
const LIMIT = 8; // of 10: the login page and a cleanup also spend from it
const WINDOW_MS = 61_000;
const LOG = join(__dirname, '..', 'reports', '.refresh-log.json');

function readLog(): number[] {
  if (!existsSync(LOG)) return [];
  const now = Date.now();
  return (JSON.parse(readFileSync(LOG, 'utf8')) as number[]).filter((t) => now - t < WINDOW_MS);
}

/** Records every refresh the browser context sends, whoever triggers it. */
export function recordRefreshes(context: BrowserContext) {
  context.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/v1/auth/refresh')) {
      writeFileSync(LOG, JSON.stringify([...readLog(), Date.now()]));
    }
  });
}

/** Records a refresh sent outside the browser, by an API request client. */
export function recordRefresh() {
  writeFileSync(LOG, JSON.stringify([...readLog(), Date.now()]));
}

/**
 * Resolves once one more refresh fits under the limit. Returns how long it
 * waited, so the caller can add it to the test's timeout.
 */
export async function waitForRefreshBudget(): Promise<number> {
  const started = Date.now();
  for (let log = readLog(); log.length >= LIMIT; log = readLog()) {
    await new Promise((resolve) => setTimeout(resolve, log[0] + WINDOW_MS - Date.now() + 250));
  }
  return Date.now() - started;
}
