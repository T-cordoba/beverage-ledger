// Minimal check that the configured AI provider answers before spending a whole
// suite run. With Ollama: the service is up, the model is pulled, and it returns
// JSON that follows a schema, which is how Stagehand talks to it. Never prints keys.
//
//   node scripts/check-model.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: join(ROOT, '.env'), quiet: true });

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const provider = (process.env.AI_PROVIDER ?? 'ollama').trim().toLowerCase();

if (provider === 'ollama') {
  const baseUrl = (process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434/v1').replace(/\/$/, '');
  const model = process.env.OLLAMA_MODEL?.trim() || 'qwen2.5:7b';
  const native = baseUrl.replace(/\/v1$/, '');

  const tags = await fetch(`${native}/api/tags`).catch(() => null);
  if (!tags?.ok) fail(`Ollama no responde en ${native}. ¿Está instalado y abierto?`);
  const pulled = ((await tags.json()).models ?? []).map((m) => m.name);
  console.log(`Ollama responde. Modelos descargados: ${pulled.join(', ') || '(ninguno)'}`);
  if (!pulled.includes(model) && !pulled.includes(`${model}:latest`)) fail(`Falta el modelo ${model}: ollama pull ${model}`);

  const started = Date.now();
  const answer = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OLLAMA_API_KEY || 'ollama'}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      stream: false,
      messages: [{ role: 'user', content: 'Devuelve el estado "listo" y el número 19.' }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'check',
          strict: true,
          schema: {
            type: 'object',
            properties: { estado: { type: 'string' }, numero: { type: 'number' } },
            required: ['estado', 'numero'],
          },
        },
      },
    }),
  });
  if (!answer.ok) fail(`${model} no respondió: HTTP ${answer.status} ${(await answer.text()).slice(0, 300)}`);
  const body = await answer.json();
  const text = body.choices?.[0]?.message?.content ?? '';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail(`${model} no devolvió JSON: ${text.slice(0, 200)}`);
  }
  console.log(
    `ollama/${model} respondió en ${Date.now() - started} ms con JSON ${JSON.stringify(parsed)} (tokens: ${body.usage?.total_tokens ?? '?'})`,
  );
} else if (provider === 'gemini') {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  const model = (process.env.STAGEHAND_MODEL?.trim() || 'google/gemini-2.5-flash').replace(/^google\//, '');
  if (!key) fail('GOOGLE_GENERATIVE_AI_API_KEY está vacía en tests/stagehand/.env');
  const base = 'https://generativelanguage.googleapis.com/v1beta';
  const headers = { 'x-goog-api-key': key, 'content-type': 'application/json' };
  const started = Date.now();
  const answer = await fetch(`${base}/models/${model}:generateContent`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Responde solo con la palabra: listo' }] }] }),
  });
  const body = await answer.json();
  if (!answer.ok) fail(`google/${model} no respondió: HTTP ${answer.status} ${JSON.stringify(body.error ?? body).slice(0, 300)}`);
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  console.log(`google/${model} respondió en ${Date.now() - started} ms: "${text.trim()}"`);
} else {
  fail(`AI_PROVIDER debe ser ollama o gemini; se recibió: ${provider}`);
}
