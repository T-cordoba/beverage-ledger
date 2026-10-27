// Looks for credentials in the evidence before it goes near git: the account
// password from .env, JWTs, bearer headers, the refresh cookie and Google keys,
// in every file under reports/ (PDF text included, decompressed).
//
//   node scripts/scan-secrets.mjs            exit code 1 if anything is found
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { config } from 'dotenv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: join(ROOT, '.env'), quiet: true });

const patterns = [
  ['JWT', /eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/],
  ['Bearer', /Bearer\s+(?!<token>)[\w.-]{20,}/i],
  ['cookie de refresh', /bl_refresh=[^;<\s]{10,}/],
  ['clave de Google', /AIza[\w-]{30,}/],
];
const literals = [
  ['contraseña de TEST_USER_PASSWORD', process.env.TEST_USER_PASSWORD],
  ['clave GOOGLE_GENERATIVE_AI_API_KEY', process.env.GOOGLE_GENERATIVE_AI_API_KEY],
  // Not a secret, but the account has no business in published evidence either.
  ['correo de TEST_USER_EMAIL', process.env.TEST_USER_EMAIL],
].filter(([, value]) => value && value.trim().length >= 4);

function textOf(path) {
  const bytes = readFileSync(path);
  if (!path.endsWith('.pdf')) return bytes.toString('latin1') + bytes.toString('utf8');
  let text = bytes.toString('latin1');
  for (const match of text.matchAll(/stream\r?\n/g)) {
    const start = match.index + match[0].length;
    try {
      text += inflateSync(bytes.subarray(start, text.indexOf('endstream', start))).toString('latin1');
    } catch {
      // Not a compressed stream.
    }
  }
  return text;
}

function* files(folder) {
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else yield path;
  }
}

let findings = 0;
let scanned = 0;
for (const path of files(join(ROOT, 'reports'))) {
  if (/\.(png|jpe?g|webp)$/i.test(path)) continue; // screenshots: checked by eye, no text layer
  scanned++;
  const text = textOf(path);
  for (const [label, re] of patterns) {
    if (re.test(text)) {
      findings++;
      console.log(`✖ ${relative(ROOT, path)}: ${label}`);
    }
  }
  for (const [label, value] of literals) {
    if (text.includes(value)) {
      findings++;
      console.log(`✖ ${relative(ROOT, path)}: ${label}`);
    }
  }
}
console.log(findings === 0 ? `✔ Sin secretos en ${scanned} archivos de reports/` : `${findings} hallazgos en ${scanned} archivos`);
process.exit(findings === 0 ? 0 : 1);
