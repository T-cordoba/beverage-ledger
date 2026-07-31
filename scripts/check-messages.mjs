import { readFileSync } from 'node:fs';

/**
 * Compares every catalogue against the source language.
 *
 * TypeScript already types `t('…')` against `es.json`, so a key that does not
 * exist there breaks the build. What it cannot see is the other way round: a
 * key present in `es` and missing in `en` only shows up as the raw key path on
 * screen, in the language nobody on the team reads first.
 */
const SOURCE = 'es';
const TARGETS = ['en'];

const read = (locale) =>
  JSON.parse(readFileSync(new URL(`../src/i18n/messages/${locale}.json`, import.meta.url), 'utf8'));

function pathsOf(value, prefix = '') {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    pathsOf(child, prefix ? `${prefix}.${key}` : key),
  );
}

const source = new Set(pathsOf(read(SOURCE)));
let failed = false;

for (const locale of TARGETS) {
  const target = new Set(pathsOf(read(locale)));
  const missing = [...source].filter((path) => !target.has(path));
  const extra = [...target].filter((path) => !source.has(path));

  for (const path of missing) console.error(`${locale}: missing ${path}`);
  for (const path of extra) console.error(`${locale}: not in ${SOURCE} — ${path}`);

  failed ||= missing.length > 0 || extra.length > 0;
}

if (failed) process.exit(1);

console.log(`${source.size} keys, ${TARGETS.length + 1} locales, all in sync.`);
