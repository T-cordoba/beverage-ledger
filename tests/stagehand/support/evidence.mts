import { appendFileSync, writeFileSync } from 'node:fs';
import { runPath, secrets } from './env.mjs';

const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;
const BEARER = /(Bearer\s+)[\w.-]+/gi;
const GOOGLE_KEY = /AIza[\w-]{30,}/g;

/** Masks the password, the model key and anything shaped like a token. */
export function redact(text: string): string {
  let safe = text.replace(JWT, '<jwt>').replace(BEARER, '$1<token>').replace(GOOGLE_KEY, '<api-key>');
  for (const secret of secrets()) safe = safe.split(secret).join('<secreto>');
  return safe;
}

export function appendJsonl(file: string, entry: object): void {
  appendFileSync(runPath(file), `${redact(JSON.stringify(entry))}\n`);
}

export function writeJson(file: string, value: unknown): void {
  writeFileSync(runPath(file), `${redact(JSON.stringify(value, null, 2))}\n`);
}

export function log(message: string): void {
  console.log(redact(message));
}
