import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { defineConfig } from 'cypress';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

/**
 * Cypress Cloud + Studio AI suite (RF-15, 16, 17, 18, 20 and 21). Run it with
 * `--project tests/IA/Cypress-Studio-AI`, so every path here is relative to this
 * folder and nothing of it leaks into the repo's other Cypress suite.
 */
// Optional local secrets (TEST_USER_*, CYPRESS_PROJECT_ID) in this folder's .env,
// which the repo's `.env*` rule keeps out of git. Shell variables win over it.
const LOCAL_ENV = join(__dirname, '.env');
if (existsSync(LOCAL_ENV)) process.loadEnvFile(LOCAL_ENV);

const BASE_URL = process.env.IA_BASE_URL ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const API_URL =
  process.env.IA_API_URL ||
  process.env.E2E_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

// One folder per run inside reports/, so a new run never overwrites the evidence
// of an earlier one. IA_RUN names it; without it, the start time does.
const RUN = process.env.IA_RUN ?? new Date().toISOString().replace(/[:.]/g, '-');
const RUN_DIR = join(__dirname, 'reports', RUN);

/**
 * The API throttles POST /auth/refresh to 10 per minute per IP, and the front
 * buys a token there on every cold load (the access token lives only in memory).
 * Every cy.visit waits for room under the limit first. The log is a file so the
 * budget also holds between two `cypress run` launched back to back.
 */
const REFRESH_LIMIT = 8; // of 10: leaves room for a cleanup and for a slow clock
const REFRESH_WINDOW_MS = 61_000;
const REFRESH_LOG = join(__dirname, 'reports', '.refresh-log.json');

function readRefreshLog(): number[] {
  if (!existsSync(REFRESH_LOG)) return [];
  const now = Date.now();
  return (JSON.parse(readFileSync(REFRESH_LOG, 'utf8')) as number[]).filter(
    (t) => now - t < REFRESH_WINDOW_MS,
  );
}

async function takeRefreshTurn(): Promise<number> {
  const started = Date.now();
  for (let log = readRefreshLog(); log.length >= REFRESH_LIMIT; log = readRefreshLog()) {
    await new Promise((resolve) => setTimeout(resolve, log[0] + REFRESH_WINDOW_MS - Date.now() + 250));
  }
  mkdirSync(join(__dirname, 'reports'), { recursive: true });
  writeFileSync(REFRESH_LOG, JSON.stringify([...readRefreshLog(), Date.now()]));
  return Date.now() - started;
}

/**
 * The text of a receipt PDF. The API writes it with the standard Helvetica
 * fonts: plain ASCII as hex strings (`<4D4F...> Tj`) inside FlateDecode streams.
 */
function readPdf(path: string) {
  const bytes = readFileSync(path);
  const raw = bytes.toString('latin1');
  const texts: string[] = [];
  const streamStart = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streamStart.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf('endstream', start);
    try {
      const content = inflateSync(bytes.subarray(start, end)).toString('latin1');
      for (const [, hex] of content.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
        texts.push(Buffer.from(hex, 'hex').toString('latin1'));
      }
    } catch {
      // Not a compressed content stream (fonts, images…).
    }
  }
  return { isPdf: raw.startsWith('%PDF-'), text: texts.join(' ') };
}

const xml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** JUnit and a plain-text summary of the run, both in the run's own folder. */
function writeRunReport(results: CypressCommandLine.CypressRunResult) {
  mkdirSync(RUN_DIR, { recursive: true });
  const suites = results.runs.map((run) => {
    const cases = run.tests.map((test) => {
      const name = xml(test.title.join(' › '));
      const seconds = (test.duration / 1000).toFixed(3);
      const body =
        test.state === 'failed'
          ? `<failure message="${xml(test.displayError?.split('\n')[0] ?? '')}">${xml(test.displayError ?? '')}</failure>`
          : test.state === 'pending' || test.state === 'skipped'
            ? '<skipped/>'
            : '';
      return `    <testcase classname="${xml(run.spec.relative)}" name="${name}" time="${seconds}">${body}</testcase>`;
    });
    const s = run.stats;
    return [
      `  <testsuite name="${xml(run.spec.relative)}" tests="${s.tests}" failures="${s.failures}" skipped="${s.pending + s.skipped}" time="${((s.duration ?? 0) / 1000).toFixed(3)}" timestamp="${s.startedAt}">`,
      ...cases,
      '  </testsuite>',
    ].join('\n');
  });
  writeFileSync(
    join(RUN_DIR, 'junit.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="Cypress Studio AI" tests="${results.totalTests}" failures="${results.totalFailed}" time="${(results.totalDuration / 1000).toFixed(3)}">\n${suites.join('\n')}\n</testsuites>\n`,
  );

  const lines = [
    `Ejecución: ${RUN}`,
    `Inicio: ${results.startedTestsAt}  Fin: ${results.endedTestsAt}`,
    `Cypress ${results.cypressVersion} · ${results.browserName} ${results.browserVersion} · front ${BASE_URL} · API ${API_URL}`,
    `Total: ${results.totalTests} · aprobadas ${results.totalPassed} · fallidas ${results.totalFailed} · pendientes ${results.totalPending} · omitidas ${results.totalSkipped}`,
    '',
    ...results.runs.flatMap((run) => [
      `${run.spec.relative}: ${run.stats.passes}/${run.stats.tests} aprobadas`,
      ...run.tests.map((test) => `  [${test.state}] ${test.title.join(' › ')} (${test.duration} ms)`),
    ]),
  ];
  writeFileSync(join(RUN_DIR, 'resumen.txt'), `${lines.join('\n')}\n`);
}

export default defineConfig({
  // Cypress Cloud project "Beverage Ledger". cy.prompt needs it plus a logged-in
  // Cloud user: without a projectId `cypress run` never downloads its bundle.
  projectId: process.env.CYPRESS_PROJECT_ID || 'q79b5v',
  // Cypress 16 intercepts Chrome traffic through CDP Fetch; with it, ~1 load in
  // 50 left Next's script chunks pending forever (60 s pageLoadTimeout on
  // "Cargando tu sesión"). This routes Chrome back through the legacy proxy.
  forceHttp1: true,
  e2e: {
    baseUrl: BASE_URL,
    // Absolute, so the suite also runs with `--config-file` from the repo root,
    // where Cypress resolves relative paths against the root instead of here.
    specPattern: join(__dirname, '*.cy.ts').replace(/\\/g, '/'),
    supportFile: join(__dirname, 'support', 'e2e.ts'),
    fixturesFolder: join(__dirname, 'support'),
    screenshotsFolder: join(RUN_DIR, 'screenshots'),
    downloadsFolder: join(RUN_DIR, 'downloads'),
    // The run folders are the history; nothing is trashed between runs.
    trashAssetsBeforeRuns: false,
    video: false,
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 15_000,
    pageLoadTimeout: 60_000,
    // One manager session per spec, kept across its tests (support/session.ts):
    // refresh tokens rotate with reuse detection, so restoring a cached cookie in
    // every test would revoke the account's sessions.
    testIsolation: false,
    // Lower memory: the machine this runs on has ~2 GB free.
    numTestsKeptInMemory: 5,
    retries: 0,
    expose: { apiUrl: API_URL },
    env: {
      TEST_USER_EMAIL: process.env.TEST_USER_EMAIL,
      TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD,
    },
    setupNodeEvents(on) {
      on('file:preprocessor', createBundler());
      on('task', { takeRefreshTurn, readPdf });
      on('after:run', (results) => {
        if ('runs' in results) writeRunReport(results);
      });
    },
  },
});
