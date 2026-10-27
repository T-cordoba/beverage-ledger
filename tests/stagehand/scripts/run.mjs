// Runs the Stagehand suite with node:test and leaves the evidence of the run in
// reports/<run>/: console output (salida.txt), JUnit, the AI call log, Stagehand
// metrics and a summary per functional requirement (resumen.md).
//
//   node scripts/run.mjs              all six requirements
//   node scripts/run.mjs RF15 RF20    only those spec files
//   STAGEHAND_RUN=05-final node scripts/run.mjs   names the run folder
import { spawn } from 'node:child_process';
import { appendFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { freemem } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: join(ROOT, '.env'), quiet: true });

const SECRETS = [process.env.TEST_USER_PASSWORD, process.env.GOOGLE_GENERATIVE_AI_API_KEY].filter(
  (value) => value && value.trim().length >= 4,
);
const redact = (text) => {
  let safe = text
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '<jwt>')
    .replace(/(Bearer\s+)[\w.-]+/gi, '$1<token>')
    .replace(/AIza[\w-]{30,}/g, '<api-key>');
  for (const secret of SECRETS) safe = safe.split(secret).join('<secreto>');
  return safe;
};

const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
const run = process.env.STAGEHAND_RUN?.trim() || stamp;
const runDir = join(ROOT, 'reports', run);
if (existsSync(join(runDir, 'junit.xml'))) {
  console.error(`reports/${run} ya tiene una ejecución: elige otro STAGEHAND_RUN para no sobrescribir evidencia.`);
  process.exit(2);
}
mkdirSync(runDir, { recursive: true });

const filters = process.argv.slice(2).map((arg) => arg.toUpperCase());
const specs = readdirSync(ROOT)
  .filter((name) => /^RF\d+-.+\.e2e\.mts$/.test(name))
  .filter((name) => filters.length === 0 || filters.some((f) => name.toUpperCase().startsWith(f)))
  .sort();
if (specs.length === 0) {
  console.error(`Ningún archivo coincide con: ${filters.join(', ')}`);
  process.exit(2);
}

const junit = join(runDir, 'junit.xml');
const output = createWriteStream(join(runDir, 'salida.txt'));
const started = new Date();
const header = `Ejecución ${run} — ${started.toISOString()}\nArchivos: ${specs.join(', ')}\n\n`;
process.stdout.write(header);
output.write(header);

// One file at a time: every spec signs in the same account and the API
// throttles logins and token refreshes per IP.
const child = spawn(
  process.execPath,
  [
    '--import',
    'tsx',
    '--test',
    '--test-concurrency=1',
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    '--test-reporter=junit',
    `--test-reporter-destination=${junit}`,
    ...specs,
  ],
  { cwd: ROOT, env: { ...process.env, STAGEHAND_RUN: run, FORCE_COLOR: '0' } },
);
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', (chunk) => {
    const text = redact(chunk.toString());
    process.stdout.write(text);
    output.write(text);
  });
}

// Memory watchdog. Below SOFT for 30 s it drops a stop mark: the scenario
// running finishes and voids its movements, and every later one fails with
// "detenida por memoria insuficiente" (support/suite.mts). Below HARD for 30 s
// the run is killed outright. Either way the summary says so.
const SOFT = 300 * 1024 * 1024;
const HARD = 120 * 1024 * 1024;
const stopMark = join(runDir, '.detener');
const memoryLog = [];
let lowSince = null;
let killedForMemory = false;
const watchdog = setInterval(() => {
  const free = freemem();
  memoryLog.push(free);
  if (free >= SOFT) {
    lowSince = null;
    return;
  }
  lowSince ??= Date.now();
  if (Date.now() - lowSince < 30_000) return;
  const mb = Math.round(free / 1024 / 1024);
  if (!existsSync(stopMark)) {
    writeFileSync(stopMark, `RAM libre ${mb} MB durante 30 s (${new Date().toISOString()})\n`);
    const note = `\n!! Memoria insuficiente (${mb} MB libres): se detiene la ejecución tras el escenario en curso.\n`;
    process.stdout.write(note);
    output.write(note);
  }
  if (free < HARD && !killedForMemory) {
    killedForMemory = true;
    appendFileSync(stopMark, `Corte forzado con ${mb} MB libres (${new Date().toISOString()})\n`);
    child.kill();
  }
}, 5_000);

child.on('close', (code) => {
  clearInterval(watchdog);
  output.end();
  const summary = summarize(started, new Date(), code ?? 1);
  writeFileSync(join(runDir, 'resumen.md'), redact(summary));
  console.log(`\n${summary}`);
  console.log(`Evidencia en reports/${run}/`);
  process.exit(code ?? 1);
});

function provider() {
  if ((process.env.AI_PROVIDER ?? 'ollama').toLowerCase() === 'gemini') {
    return `Google Gemini · modelo \`${process.env.STAGEHAND_MODEL || 'google/gemini-2.5-flash'}\``;
  }
  return `Ollama local · modelo \`${process.env.OLLAMA_MODEL || 'qwen2.5:7b'}\` en ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'}`;
}

function readJsonl(name) {
  const path = join(runDir, name);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function summarize(start, end, exitCode) {
  const xml = existsSync(junit) ? readFileSync(junit, 'utf8') : '';
  const cases = [...xml.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)].map((m) => {
    const name = /name="([^"]*)"/.exec(m[1])?.[1] ?? '?';
    const body = m[3] ?? '';
    const status = /<failure\b/.test(body) ? 'fallida' : /<skipped\b/.test(body) ? 'omitida' : 'aprobada';
    return { name: name.replace(/&quot;/g, '"').replace(/&amp;/g, '&'), status };
  });
  const scenarios = cases.filter((c) => /^RF\d{2}-\d{2} /.test(c.name));
  const count = (status) => scenarios.filter((c) => c.status === status).length;

  const byRf = new Map();
  for (const c of scenarios) {
    const rf = c.name.slice(0, 4);
    const row = byRf.get(rf) ?? { aprobada: 0, fallida: 0, omitida: 0 };
    row[c.status]++;
    byRf.set(rf, row);
  }

  const calls = readJsonl('ai-log.jsonl');
  const kinds = new Map();
  for (const call of calls) {
    const row = kinds.get(call.kind) ?? { ok: 0, error: 0 };
    row[call.ok ? 'ok' : 'error']++;
    kinds.set(call.kind, row);
  }

  const metrics = readdirSync(runDir)
    .filter((name) => name.startsWith('metrics-'))
    .map((name) => JSON.parse(readFileSync(join(runDir, name), 'utf8')));
  const total = (key) => metrics.reduce((sum, m) => sum + (m[key] ?? 0), 0);
  const stagehand = JSON.parse(
    readFileSync(join(ROOT, 'node_modules', '@browserbasehq', 'stagehand', 'package.json'), 'utf8'),
  ).version;
  const failures = readJsonl('escenarios.jsonl').filter((s) => s.status === 'failed');
  const extra = cases.filter((c) => !/^RF\d{2}-\d{2} /.test(c.name) && c.status === 'fallida');

  return [
    `# Ejecución ${run}`,
    '',
    `- Inicio: ${start.toISOString()} · Fin: ${end.toISOString()} · Duración: ${Math.round((end - start) / 60000)} min`,
    `- Stagehand ${stagehand} · Node ${process.version} · navegador local (Chrome, headless=${process.env.HEADLESS ?? 'false'})`,
    `- Proveedor de IA: ${provider()}`,
    `- Front ${process.env.STAGEHAND_BASE_URL ?? 'http://localhost:3000'} · API ${process.env.STAGEHAND_API_URL ?? 'http://localhost:3001'}`,
    `- Código de salida de node:test: ${exitCode}`,
    `- RAM libre durante la ejecución: mínima ${Math.round(Math.min(...memoryLog, freemem()) / 1048576)} MB · media ${Math.round(memoryLog.reduce((a, b) => a + b, 0) / Math.max(memoryLog.length, 1) / 1048576)} MB`,
    ...(existsSync(stopMark) ? [`- **Ejecución detenida:** ${readFileSync(stopMark, 'utf8').trim().replace(/\n/g, ' · ')}`] : []),
    '',
    `**Escenarios: ${scenarios.length} · aprobados ${count('aprobada')} · fallidos ${count('fallida')} · omitidos ${count('omitida')}**`,
    '',
    '| Requisito | Aprobados | Fallidos | Omitidos |',
    '|---|---|---|---|',
    ...[...byRf.entries()].map(([rf, r]) => `| ${rf.replace('RF', 'RF-')} | ${r.aprobada} | ${r.fallida} | ${r.omitida} |`),
    '',
    '| Escenario | Resultado |',
    '|---|---|',
    ...scenarios.map((c) => `| ${c.name} | ${c.status} |`),
    ...(extra.length > 0 ? ['', 'Fallos fuera de un escenario (hooks):', ...extra.map((c) => `- ${c.name}`)] : []),
    '',
    '## Llamadas a la IA de Stagehand (ai-log.jsonl)',
    '',
    '| Tipo | Correctas | Con error |',
    '|---|---|---|',
    ...[...kinds.entries()].map(([kind, r]) => `| ${kind} | ${r.ok} | ${r.error} |`),
    '',
    `Tokens (stagehand.metrics()): entrada ${total('totalPromptTokens')} · salida ${total('totalCompletionTokens')} · razonamiento ${total('totalReasoningTokens')} · inferencia ${Math.round(total('totalInferenceTimeMs') / 1000)} s`,
    ...(failures.length > 0
      ? ['', '## Fallos', '', ...failures.map((f) => `- **${f.id}** ${f.name}: ${String(f.error).replace(/\n/g, ' ')}`)]
      : []),
    '',
  ].join('\n');
}
