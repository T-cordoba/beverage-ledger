import { readFileSync, writeFileSync } from 'node:fs';
import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript';

const OUTPUT = 'src/lib/api/schema.d.ts';

/**
 * Reads `.env` by hand: this runs outside Next, which is what normally loads the
 * file, and one variable does not justify a dependency. `--env-file` would, but
 * it needs a Node version this project does not pin.
 */
function fromEnvFile(key) {
  let contents;

  try {
    contents = readFileSync('.env', 'utf8');
  } catch {
    return undefined;
  }

  const match = contents.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm'));
  return match?.[1].trim().replace(/^["']|["']$/g, '') || undefined;
}

const origin = process.env.NEXT_PUBLIC_API_URL ?? fromEnvFile('NEXT_PUBLIC_API_URL');

if (!origin) {
  console.error('NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env, or export it.');
  process.exit(1);
}

// Swagger mounts outside the global prefix, so the document is at the root and
// not under /api/v1.
const document = new URL('/docs-json', origin);

console.log(`Reading the OpenAPI document from ${document}`);

const ast = await openapiTS(document);
writeFileSync(OUTPUT, COMMENT_HEADER + astToString(ast));

console.log(`Wrote ${OUTPUT}`);
