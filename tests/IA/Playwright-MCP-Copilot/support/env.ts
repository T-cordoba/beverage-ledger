import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The same `.env` the Playwright MCP server reads with `--secrets`, so the
 * browser Copilot drives and the suite sign in as the same Manager. It is
 * gitignored; variables already set in the shell win over it.
 */
const ENV_FILE = join(__dirname, '..', '.env');
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

export const BASE_URL = process.env.IA_BASE_URL ?? 'http://localhost:3000';

/** Has to be the same API the front talks to, or the cleanup voids nothing. */
export const API_URL = process.env.IA_API_URL ?? 'http://localhost:3001';

export const MANAGER = {
  email: process.env.TEST_USER_EMAIL ?? '',
  password: process.env.TEST_USER_PASSWORD ?? '',
};

const isLocal = (url: string) => ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

/**
 * Scenarios that confirm or void movements only run when both ends are the
 * disposable local stack, so a run can never write to Render or Vercel.
 */
export const WRITES_ALLOWED = isLocal(BASE_URL) && isLocal(API_URL);

export const WRITES_SKIPPED_REASON =
  'Escribe en el ledger: solo corre con IA_BASE_URL e IA_API_URL en localhost.';
