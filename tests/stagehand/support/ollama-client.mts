import type { ClientLLM } from '@browserbasehq/stagehand';
import { ollamaSettings } from './env.mjs';
import { appendJsonl } from './evidence.mjs';

/**
 * Stagehand 4.3.0 has no native `ollama/...` provider, so, as in the course's
 * reference project (mauricioramirezv/Stagehand-E2E-AI, src/ollama-client.ts),
 * the model is a custom ClientLLM that talks to Ollama's OpenAI-compatible
 * endpoint. Stagehand asks for structured output with a JSON schema; Ollama
 * enforces it through `response_format`.
 */
type GenerateInput = Parameters<ClientLLM['generate']>[0];
type GenerateOutput = Awaited<ReturnType<ClientLLM['generate']>>;
type StructuredContent = Extract<GenerateOutput, { outputFormat: 'json_schema' }>['structuredContent'];

type OllamaResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

function contentAsText(content: GenerateInput['messages'][number]['content']): string {
  const blocks = Array.isArray(content) ? content : [content];
  return blocks
    .map((block) => {
      if (block.type === 'text') return block.text;
      if (block.type === 'image') return `[Imagen ${block.mimeType} omitida del mensaje]`;
      if (block.type === 'tool_use') return JSON.stringify({ tool: block.name, input: block.input });
      return JSON.stringify({ toolResult: block.toolUseId, content: block.content });
    })
    .join('\n');
}

/** Small local models sometimes wrap the JSON in a ```json fence despite the schema. */
function parseJson(text: string): StructuredContent {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return JSON.parse(fenced ? fenced[1]! : trimmed);
}

type Json = unknown;
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const ELEMENT_ID = /^\d+-\d+$/;

/**
 * Appended to Stagehand's system prompt. Measured on the real login page
 * (reports/debug-login): without it qwen2.5:7b copies the element's label
 * ("textbox: CORREO ELECTRÓNICO…") into elementId instead of its id ("0-4"),
 * and Ollama's grammar does not enforce the schema's `pattern`.
 */
const ELEMENT_ID_HINT =
  'The elementId is the pair of numbers inside square brackets at the start of a line of the accessibility tree, ' +
  'for example 0-4 for the line "[0-4] textbox: ...". Never copy the role or the text into elementId. ' +
  'Choose the element whose text best matches the instruction.';

const isObject = (value: Json): value is Record<string, Json> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const describesElement = (schema: Json) =>
  isObject(schema) && isObject(schema.properties) && 'elementId' in schema.properties;

/**
 * Stagehand lets act answer `action: null` when nothing matches. Under Ollama's
 * constrained decoding the 7B model takes that branch every time, even with the
 * field in plain sight (measured: null with the branch, "0-4" without it). So the
 * branch is dropped and the model must name an element; a wrong one is caught by
 * Stagehand, which only acts on ids present in the tree, and by the scenario's
 * own assertions on the DOM.
 */
function withoutNullElement(schema: Json): Json {
  if (Array.isArray(schema)) return schema.map(withoutNullElement);
  if (!isObject(schema)) return schema;
  const copy: Record<string, Json> = {};
  for (const [key, value] of Object.entries(schema)) copy[key] = withoutNullElement(value);
  const options = copy.anyOf;
  if (Array.isArray(options) && options.some(describesElement)) {
    const rest = options.filter((option) => !(isObject(option) && option.type === 'null'));
    if (rest.length === 1) {
      const { anyOf: _dropped, ...others } = copy;
      return { ...others, ...(rest[0] as Record<string, Json>) };
    }
    copy.anyOf = rest;
  }
  return copy;
}

/**
 * The model often names the right node in the wrong shape: "[0-4]" with the
 * tree's brackets, or "2827" without the frame. Both map to exactly one line of
 * the tree it was sent, so they are rewritten to "0-4" / "0-2827". Anything else
 * is left alone for the correction round.
 */
function normalizeElementIds(value: Json, tree: string): Json {
  if (Array.isArray(value)) return value.map((item) => normalizeElementIds(item, tree));
  if (!isObject(value)) return value;
  const copy: Record<string, Json> = {};
  for (const [key, item] of Object.entries(value)) copy[key] = normalizeElementIds(item, tree);
  if (typeof copy.elementId === 'string' && !ELEMENT_ID.test(copy.elementId)) {
    const bare = copy.elementId.trim().replace(/^\[|\]$/g, '');
    if (ELEMENT_ID.test(bare)) copy.elementId = bare;
    else if (/^\d+$/.test(bare)) {
      const matches = [...tree.matchAll(new RegExp(`\\[(\\d+-${bare})\\]`, 'g'))].map((m) => m[1]);
      if (new Set(matches).size === 1) copy.elementId = matches[0]!;
    }
  }
  return copy;
}

type Correction = { from: string; to: string; why: string };

/**
 * The 7B model describes the right element but copies a neighbour's id: on a
 * product card it answered `{"elementId": "0-1457", "description": "button:
 * Añadir botella"}`, where 0-1457 is the "0" between the two bottle buttons and
 * the tree says `[0-1069] button: Añadir botella` (reports/probe-card). When the
 * description names exactly one line of the tree and the id points elsewhere,
 * the id is taken from that line: the element is still the one the model chose,
 * by its own words.
 *
 * It also drops the mouse button the model adds to clicks ("left", "right"):
 * no instruction of this suite asks for anything but a plain click, and a
 * stray "right" turned "Confirmar" into a right click (reports/04-rf15).
 */
function groundOnDescription(value: Json, tree: string, corrections: Correction[]): Json {
  if (Array.isArray(value)) return value.map((item) => groundOnDescription(item, tree, corrections));
  if (!isObject(value)) return value;
  const copy: Record<string, Json> = {};
  for (const [key, item] of Object.entries(value)) copy[key] = groundOnDescription(item, tree, corrections);

  if (typeof copy.elementId === 'string' && typeof copy.description === 'string') {
    const lines = new Map<string, string>();
    for (const [, id, text] of tree.matchAll(/^\s*\[(\d+-\d+)\] (.+)$/gm)) lines.set(id!, text!.trim());
    // The model sometimes echoes the instruction as the description ("Pulsa el
    // botón 'Añadir botella'") instead of naming the node, so a quoted name
    // inside it counts too (reports/11-suite-completa-DETENIDA-para-corregir, RF15-01).
    const description = copy.description.trim().toLowerCase();
    const quoted = [...description.matchAll(/["'«]([^"'»]+)["'»]/g)].map((m) => m[1]!.trim());
    const wantedNames = [description, ...quoted];
    const named = (text: string) => {
      const lower = text.toLowerCase();
      return wantedNames.some(
        (wanted) =>
          lower === wanted ||
          (!wanted.includes(':') &&
            /^(button|link|textbox|combobox|option|checkbox|searchbox): /.test(lower) &&
            lower.endsWith(`: ${wanted}`)),
      );
    };
    const chosen = lines.get(copy.elementId);
    const candidates = [...lines.entries()].filter(([, text]) => named(text));
    if (candidates.length === 1 && (!chosen || !named(chosen))) {
      corrections.push({ from: copy.elementId, to: candidates[0]![0], why: `descripción «${copy.description}»` });
      copy.elementId = candidates[0]![0];
    }
  }
  // The app's selects are Radix listboxes, not <select>: an option is clicked.
  // The model reached for selectOptionFromDropdown, which only drives a native
  // <select>, and the choice went nowhere (reports/05-rf15, RF15-04).
  if (copy.method === 'selectOptionFromDropdown' && typeof copy.elementId === 'string') {
    const line = new RegExp(`^\\s*\\[${copy.elementId}\\] (.+)$`, 'm').exec(tree)?.[1] ?? '';
    if (line.startsWith('option:')) {
      corrections.push({ from: 'selectOptionFromDropdown', to: 'click', why: `«${line}» no es un <select>` });
      copy.method = 'click';
      copy.arguments = [];
    }
  }
  // No instruction of this suite presses a key. The model once answered the
  // right button with `press ["left"]`, the left-arrow key, and nothing was
  // clicked (reports/10-suite-completa, RF15-02).
  if (copy.method === 'press' && typeof copy.elementId === 'string') {
    const line = new RegExp(`^\\s*\\[${copy.elementId}\\] (.+)$`, 'm').exec(tree)?.[1] ?? '';
    if (/^(button|link|option|combobox):/.test(line)) {
      corrections.push({ from: `press ${JSON.stringify(copy.arguments)}`, to: 'click', why: `«${line}» se pulsa con el ratón` });
      copy.method = 'click';
      copy.arguments = [];
    }
  }
  // "Escribe X en el campo" means the field ends up holding X. Stagehand's
  // `type` presses keys after whatever is already there, so a second reason
  // came out as "ab    " (reports/08-rf18-rf20-rf21); `fill` replaces it.
  if (copy.method === 'type' && typeof copy.elementId === 'string') {
    const line = new RegExp(`^\\s*\\[${copy.elementId}\\] (.+)$`, 'm').exec(tree)?.[1] ?? '';
    if (/^(textbox|searchbox):/.test(line)) {
      corrections.push({ from: 'type', to: 'fill', why: `«${line}» debe quedar con el valor indicado` });
      copy.method = 'fill';
    }
  }
  // Every act of this suite is one step: opening a select and picking from it
  // are two separate instructions. A twoStep answer made Stagehand click again
  // right after opening the list, which closed it on the current value.
  if (copy.twoStep === true) {
    corrections.push({ from: 'twoStep: true', to: 'twoStep: false', why: 'la suite abre y elige en acciones separadas' });
    copy.twoStep = false;
  }
  if (copy.method === 'click' && Array.isArray(copy.arguments) && copy.arguments.length > 0) {
    corrections.push({ from: JSON.stringify(copy.arguments), to: '[]', why: 'botón del ratón en un clic' });
    copy.arguments = [];
  }
  return copy;
}

/** elementId values that are not "<frame>-<node>", anywhere in the answer. */
function badElementIds(value: Json): string[] {
  if (Array.isArray(value)) return value.flatMap(badElementIds);
  if (!isObject(value)) return [];
  const own = typeof value.elementId === 'string' && !ELEMENT_ID.test(value.elementId) ? [value.elementId] : [];
  return [...own, ...Object.values(value).flatMap(badElementIds)];
}

export function createOllamaClient(): ClientLLM {
  const { baseUrl, apiKey, model } = ollamaSettings();

  const chat = async (messages: ChatMessage[], input: GenerateInput, schema: Json) => {
    const responseFormat = input.responseFormat ?? { type: 'text' as const };
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: input.temperature ?? 0,
        stream: false,
        ...(responseFormat.type === 'json_schema'
          ? { response_format: { type: 'json_schema', json_schema: { name: responseFormat.name, schema, strict: true } } }
          : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(`Ollama respondió ${response.status}: ${await response.text()}`);
    }
    const result = (await response.json()) as OllamaResponse;
    const text = result.choices?.[0]?.message?.content;
    // Each exchange with the local model, so a wrong pick can be traced to what it answered.
    appendJsonl('ollama.jsonl', {
      at: new Date().toISOString(),
      model,
      schema: responseFormat.type === 'json_schema' ? responseFormat.name : 'text',
      promptChars: messages.reduce((sum, m) => sum + m.content.length, 0),
      usage: result.usage,
      response: text?.slice(0, 4000),
      ...(process.env.STAGEHAND_DUMP_PROMPTS === 'true' ? { messages, schema } : {}),
    });
    if (!text) throw new Error('Ollama no devolvió contenido.');
    return { text, usage: result.usage };
  };

  const generate = async (input: GenerateInput): Promise<GenerateOutput> => {
    const responseFormat = input.responseFormat ?? { type: 'text' as const };
    const structured = responseFormat.type === 'json_schema';
    const messages: ChatMessage[] = [
      ...(input.systemPrompt
        ? [{ role: 'system' as const, content: structured ? `${input.systemPrompt}\n${ELEMENT_ID_HINT}` : input.systemPrompt }]
        : []),
      ...input.messages.map((message) => ({ role: message.role, content: contentAsText(message.content) })),
    ];
    const schema = structured ? withoutNullElement(responseFormat.schema) : undefined;

    const tree = messages.map((m) => m.content).join('\n');
    let { text, usage } = await chat(messages, input, schema);
    let content: StructuredContent | undefined;
    if (structured) {
      content = normalizeElementIds(parseJson(text), tree) as StructuredContent;
      const bad = badElementIds(content);
      if (bad.length > 0) {
        // One correction round: tell the model what was wrong and ask again.
        ({ text, usage } = await chat(
          [
            ...messages,
            { role: 'assistant', content: text },
            {
              role: 'user',
              content: `"${bad[0]}" is not a valid elementId. ${ELEMENT_ID_HINT} Answer again with the same JSON format.`,
            },
          ],
          input,
          schema,
        ));
        content = normalizeElementIds(parseJson(text), tree) as StructuredContent;
      }
      const corrections: Correction[] = [];
      content = groundOnDescription(content, tree, corrections) as StructuredContent;
      if (corrections.length > 0) {
        appendJsonl('ollama.jsonl', { at: new Date().toISOString(), model, corrections, final: content });
      }
    }

    const tokens = usage
      ? { inputTokens: usage.prompt_tokens ?? 0, outputTokens: usage.completion_tokens ?? 0, totalTokens: usage.total_tokens ?? 0 }
      : undefined;
    if (structured) {
      return {
        role: 'assistant',
        content: { type: 'text', text },
        outputFormat: 'json_schema',
        structuredContent: content!,
        usage: tokens,
      };
    }
    return { role: 'assistant', content: { type: 'text', text }, outputFormat: 'text', usage: tokens };
  };

  return { generate };
}
