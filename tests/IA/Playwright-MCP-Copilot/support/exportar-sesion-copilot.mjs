// Copies a GitHub Copilot agent session (VS Code agent host, ~/.copilot/session-state/<id>)
// into evidencias/copilot/ and writes a readable transcript of its tool calls.
// Usage: node support/exportar-sesion-copilot.mjs <sessionId> <name>
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const [sessionId, name] = process.argv.slice(2);
if (!sessionId || !name) throw new Error('Uso: node support/exportar-sesion-copilot.mjs <sessionId> <nombre>');

const source = join(homedir(), '.copilot', 'session-state', sessionId);
const target = join(import.meta.dirname, '..', 'evidencias', 'copilot');
copyFileSync(join(source, 'events.jsonl'), join(target, `${name}.events.jsonl`));

const events = readFileSync(join(source, 'events.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
const models = new Set();
const calls = [];
let prompt = '';
let premiumRequests = 0;
let modelCalls = 0;
for (const { type, data = {} } of events) {
  if (type === 'user.message' && !prompt) prompt = data.content;
  if (type === 'session.usage_record') {
    models.add(data.usage?.modelDisplayName ?? data.usage?.model);
    modelCalls += 1;
  }
  // The checkpoint carries the session's running total of billed premium requests.
  if (type === 'session.usage_checkpoint') premiumRequests = data.totalPremiumRequests ?? premiumRequests;
  if (type === 'tool.execution_start') calls.push({ id: data.toolCallId, tool: data.toolName, args: data.arguments });
  if (type === 'tool.execution_complete') {
    const call = calls.find((c) => c.id === data.toolCallId);
    if (call) call.ok = data.success;
  }
}

const mcpCalls = calls.filter((c) => c.tool.startsWith('playwright-browser_'));
const count = (list) =>
  Object.entries(list.reduce((acc, c) => ({ ...acc, [c.tool]: (acc[c.tool] ?? 0) + 1 }), {}))
    .map(([tool, n]) => `| \`${tool}\` | ${n} |`)
    .join('\n');
const brief = (args) => JSON.stringify(args ?? {}).slice(0, 140).replaceAll('|', '\\|');

writeFileSync(
  join(target, `${name}.transcript.md`),
  `# Sesión de GitHub Copilot \`${sessionId}\`

- Cliente: VS Code agent host (GitHub Copilot, modo agente)
- Modelo(s): ${[...models].join(', ') || 'no registrado'}
- Solicitudes premium facturadas: ${premiumRequests} (llamadas internas al modelo: ${modelCalls})
- Llamadas a herramientas: ${calls.length}, de ellas ${mcpCalls.length} a Playwright MCP (\`playwright-browser_*\`)

## Prompt

\`\`\`text
${prompt.slice(0, 4000)}
\`\`\`

## Herramientas usadas

| Herramienta | Llamadas |
|---|---:|
${count(calls)}

## Secuencia de llamadas

| # | Herramienta | Resultado | Argumentos |
|---:|---|---|---|
${calls.map((c, i) => `| ${i + 1} | \`${c.tool}\` | ${c.ok === false ? 'falló' : 'ok'} | \`${brief(c.args)}\` |`).join('\n')}
`,
);
console.log(`${name}: ${calls.length} llamadas, ${mcpCalls.length} de Playwright MCP, modelos: ${[...models].join(', ')}`);
