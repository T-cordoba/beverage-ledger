import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './env.mjs';

/**
 * The API throttles POST /auth/login and /auth/refresh to 10 per minute per IP,
 * and the front buys an access token from /auth/refresh on every cold load,
 * because the token lives only in memory. Past that, the API answers 429 and the
 * app reads it as a lost session: the scenario lands on /login.
 *
 * So every cold load and every refresh the suite sends itself first waits for
 * room under the limit. The log is a file, not module state, because each spec
 * runs in its own process and the API keeps counting the previous one's calls.
 */
const LIMIT = 8;
const WINDOW_MS = 61_000;
const FOLDER = join(ROOT, 'reports');
const LOG = join(FOLDER, '.refresh-log.json');

function readLog(): number[] {
  if (!existsSync(LOG)) return [];
  const now = Date.now();
  return (JSON.parse(readFileSync(LOG, 'utf8')) as number[]).filter((t) => now - t < WINDOW_MS);
}

/** Waits for room under the limit and books the call. Returns how long it waited. */
export async function spendRefresh(): Promise<number> {
  const started = Date.now();
  for (let entries = readLog(); entries.length >= LIMIT; entries = readLog()) {
    await new Promise((resolve) => setTimeout(resolve, entries[0]! + WINDOW_MS - Date.now() + 250));
  }
  if (!existsSync(FOLDER)) mkdirSync(FOLDER, { recursive: true });
  writeFileSync(LOG, JSON.stringify([...readLog(), Date.now()]));
  return Date.now() - started;
}
