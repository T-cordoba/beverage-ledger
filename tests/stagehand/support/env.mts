import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

/** tests/stagehand, wherever the suite is launched from. */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Only this folder's .env: the repo root one belongs to the app and may point at Render.
config({ path: join(ROOT, '.env'), quiet: true });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Falta ${name}. Copia tests/stagehand/.env.example como .env y complétalo, o defínela en la shell.`,
    );
  }
  return value;
}

function flag(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} debe ser true o false; se recibió: ${value}`);
}

export const BASE_URL = (process.env.STAGEHAND_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
/** The API the front talks to: the teardown voids the suite's movements there. */
export const API_URL = (process.env.STAGEHAND_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

const isLocal = (url: string) => ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

/**
 * Most scenarios confirm or void movements, so the whole suite refuses to run
 * unless both ends are a disposable local stack: it can never write to the
 * Vercel/Render deploy.
 */
export function assertLocalStack(): void {
  if (!isLocal(BASE_URL) || !isLocal(API_URL)) {
    throw new Error(
      `La suite escribe en el historial de movimientos: solo corre contra localhost (front ${BASE_URL}, API ${API_URL}).`,
    );
  }
}

export const credentials = () => ({
  email: required('TEST_USER_EMAIL'),
  password: required('TEST_USER_PASSWORD'),
});

export type Provider = 'ollama' | 'gemini';

/** AI_PROVIDER, as in the course's reference project: local Ollama unless told otherwise. */
export function selectedProvider(): Provider {
  const value = (process.env.AI_PROVIDER ?? 'ollama').trim().toLowerCase();
  if (value === 'ollama' || value === 'gemini') return value;
  throw new Error(`AI_PROVIDER debe ser ollama o gemini; se recibió: ${value}`);
}

export function ollamaSettings() {
  return {
    baseUrl: (process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434/v1').replace(/\/$/, ''),
    apiKey: process.env.OLLAMA_API_KEY?.trim() || 'ollama',
    model: process.env.OLLAMA_MODEL?.trim() || 'qwen2.5:7b',
  };
}

export type GeminiSettings = { modelName: `google/${string}`; apiKey: string };

export function geminiSettings(): GeminiSettings {
  const modelName = process.env.STAGEHAND_MODEL?.trim() || 'google/gemini-2.5-flash';
  if (!modelName.startsWith('google/')) {
    throw new Error(`STAGEHAND_MODEL debe ser un modelo de Gemini (google/...); se recibió ${modelName}.`);
  }
  return {
    modelName: modelName as `google/${string}`,
    apiKey: required('GOOGLE_GENERATIVE_AI_API_KEY'),
  };
}

/** Provider and model, for the logs and the run summary. Never the key. */
export function modelLabel(): string {
  return selectedProvider() === 'ollama'
    ? `ollama/${ollamaSettings().model} (${ollamaSettings().baseUrl})`
    : `${geminiSettings().modelName}`;
}

export const HEADLESS = flag('HEADLESS', false);
export const CHROME_PATH = process.env.CHROME_PATH?.trim() || undefined;
export const LOG_LEVEL = process.env.STAGEHAND_LOG_LEVEL === 'debug' ? 'debug' : 'info';

/** reports/<run>: the runner names it; a spec launched by hand writes to reports/manual. */
export const RUN_NAME = process.env.STAGEHAND_RUN?.trim() || 'manual';
export const RUN_DIR = join(ROOT, 'reports', RUN_NAME);

export function runPath(...parts: string[]): string {
  const path = join(RUN_DIR, ...parts);
  const folder = parts.length > 1 ? dirname(path) : RUN_DIR;
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });
  return path;
}

/** Values that must never reach a report: they are masked wherever text is written. */
export function secrets(): string[] {
  return [
    process.env.TEST_USER_PASSWORD,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  ].filter((value): value is string => Boolean(value && value.trim().length >= 4));
}
