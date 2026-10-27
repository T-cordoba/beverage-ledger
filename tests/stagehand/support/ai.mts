import type { Action, Locator, Page, Stagehand } from '@browserbasehq/stagehand';
import type { z } from 'zod';
import { read } from './dom.mjs';
import { appendJsonl, log } from './evidence.mjs';

type Usage = { inputTokens?: number; outputTokens?: number; inferenceTimeMs?: number };

const RATE_LIMIT = /429|RESOURCE_EXHAUSTED|rate.?limit|quota|overloaded|503|UNAVAILABLE/i;
const MAX_RATE_LIMIT_RETRIES = 6;

/**
 * Every call the suite makes to Stagehand's AI goes through here, so each one
 * lands in reports/<run>/ai-log.jsonl with its instruction, what the model
 * chose (selector, method) and the tokens it spent. That file is the evidence
 * that the model, not a hard-coded selector, drove the interaction.
 *
 * Every action follows the same path: observe() lets the model pick the
 * element, the code checks the pick against the DOM, and act() runs it.
 * A result Stagehand reports as a failure throws: the scenario never goes on
 * after an action that did not happen. A reported success proves nothing on its
 * own, though; every scenario checks the outcome against the DOM afterwards.
 */
export class Ai {
  scenario = '';

  constructor(
    private readonly stagehand: Stagehand,
    private readonly page: Page,
  ) {}

  /**
   * The element the model picks for `instruction`, checked before anyone uses
   * it: its accessible name in the DOM must be `expected`. A wrong pick is
   * logged, never acted on, and the model is asked again with what it got wrong.
   */
  async resolve(
    instruction: string,
    expected: string,
    options: { within?: Locator; prefix?: boolean } = {},
  ): Promise<Action> {
    let prompt = instruction;
    // `prefix` is for labelled controls such as a select, whose name carries "(obligatorio)".
    const matches = (name: string | null) =>
      name === expected || (options.prefix === true && name !== null && name.startsWith(expected));
    for (let attempt = 1; attempt <= 3; attempt++) {
      const [candidate] = await this.observe(prompt, { within: options.within });
      const name = await read(this.page, 'nameAt', candidate!.selector);
      if (matches(name)) return candidate!;
      appendJsonl('ai-log.jsonl', {
        at: new Date().toISOString(),
        scenario: this.scenario,
        kind: 'rechazo',
        instruction: prompt,
        ok: false,
        error: `La IA eligió «${name}» y se esperaba «${expected}»: no se ejecutó`,
        detail: candidate,
      });
      log(`    [IA rechazada] eligió «${name}», se esperaba «${expected}»; se vuelve a preguntar`);
      prompt = `${instruction}. El elemento correcto se llama exactamente "${expected}"; no es "${name}".`;
    }
    throw new Error(`La IA no encontró «${expected}» en 3 intentos: ${instruction}`);
  }

  /**
   * extract() whose answer the code checks against the page. `problem` returns
   * what is wrong with the data (or null when it matches the DOM). A wrong read
   * is logged and the model is asked again with what it got wrong, up to three
   * times; the third wrong answer fails the scenario with the model's reading.
   */
  async extractChecked<S extends z.ZodType>(
    instruction: string,
    schema: S,
    problem: (data: z.output<S>) => Promise<string | null> | string | null,
    options: { within?: Locator } = {},
  ): Promise<z.output<S>> {
    let prompt = instruction;
    let last = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      const data = await this.extract(prompt, schema, options);
      const wrong = await problem(data);
      if (wrong === null) return data;
      last = wrong;
      appendJsonl('ai-log.jsonl', {
        at: new Date().toISOString(),
        scenario: this.scenario,
        kind: 'rechazo',
        instruction: prompt,
        ok: false,
        error: `Lectura de la IA rechazada: ${wrong}`,
        detail: data,
      });
      log(`    [IA rechazada] ${wrong}; se vuelve a preguntar`);
      prompt = `${instruction}. Tu respuesta anterior era incorrecta: ${wrong}. Léelo de nuevo en la página.`;
    }
    throw new Error(`La IA no extrajo el dato correcto en 3 intentos (${instruction}): ${last}`);
  }

  /**
   * Types into a field the same way a click is made: observe() picks the field,
   * the DOM must confirm its label starts with `field`, and only then Stagehand
   * fills it. The value travels as a Stagehand variable, so the model never
   * sees it. Without this the model once chose the field's error message, and
   * `type` appended to whatever field had focus (reports/13-suite-completa, RF20-02).
   */
  async fill(
    instruction: string,
    field: string,
    variables: Record<string, string>,
    options: { within?: Locator } = {},
  ) {
    const [key] = Object.keys(variables);
    // Asked as "find the text box", not as the typing instruction: with
    // "Escribe %motivo%…" observe answered "fill" as the description and picked
    // the "(obligatorio)" span of the label (reports/14-rf17-rf20-validacion).
    const locate = `Encuentra el cuadro de texto "${field}" (${instruction.replace(/%\w+%/g, 'el valor')})`;
    let prompt = locate;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const [candidate] = await this.observe(prompt, options);
      // Only a text box counts: a label or an error message under it shares its words.
      const name =
        (await read(this.page, 'fieldAt', candidate!.selector)) ??
        `${await read(this.page, 'nameAt', candidate!.selector)} (no es un cuadro de texto)`;
      if (name.startsWith(field)) {
        // The model picks the field; the text is the scenario's, always replacing what is there.
        await this.replay({ ...candidate!, method: 'fill', arguments: [`%${key}%`] }, variables);
        return;
      }
      appendJsonl('ai-log.jsonl', {
        at: new Date().toISOString(),
        scenario: this.scenario,
        kind: 'rechazo',
        instruction: prompt,
        ok: false,
        error: `La IA eligió «${name}» y se esperaba el campo «${field}»: no se escribió`,
        detail: candidate,
      });
      log(`    [IA rechazada] eligió «${name}», se esperaba el campo «${field}»; se vuelve a preguntar`);
      prompt = `${locate}. Debe ser el cuadro de texto (textbox) "${field}"; no es "${name}".`;
    }
    throw new Error(`La IA no encontró el campo «${field}» en 3 intentos: ${instruction}`);
  }

  /** A click the model resolves and the code checks before it happens. */
  async click(instruction: string, expected: string, options: { within?: Locator; prefix?: boolean } = {}) {
    // The element is the model's, checked above; the action is a click, whatever
    // method it proposed: "Hacia" came back as selectOptionFromDropdown and the
    // list never opened (reports/14-rf17-rf20-validacion).
    await this.replay({ ...(await this.resolve(instruction, expected, options)), method: 'click', arguments: [] });
  }

  /**
   * Replays an action that observe() resolved earlier. No model call: Stagehand
   * runs the stored selector and method, which is how a repeated click (a
   * stepper pressed N times) avoids paying for N inferences.
   */
  async replay(action: Action, variables?: Record<string, string>) {
    return this.call('act(observe)', action.description, async () => {
      const result = await this.stagehand.act(action, { page: this.page, ...(variables ? { variables } : {}) });
      if (!result.data.success) {
        throw new Error(`act no pudo repetir «${action.description}»: ${result.data.message}`);
      }
      return { value: result, usage: result.metadata.usage, detail: result.data.actions };
    });
  }

  /** Asks the model which elements match; at least one, or it throws. */
  async observe(instruction: string, options: { within?: Locator } = {}) {
    return this.call('observe', instruction, async () => {
      const result = await this.stagehand.observe(instruction, {
        page: this.page,
        ...(options.within ? { locator: options.within } : {}),
      });
      if (result.data.length === 0) throw new Error(`observe no encontró nada para «${instruction}»`);
      return { value: result.data, usage: result.metadata.usage, detail: result.data };
    });
  }

  /** Structured read of the page, validated by the zod schema. */
  async extract<S extends z.ZodType>(instruction: string, schema: S, options: { within?: Locator } = {}) {
    return this.call('extract', instruction, async () => {
      const result = await this.stagehand.extract(instruction, schema, {
        page: this.page,
        ...(options.within ? { locator: options.within } : {}),
      });
      return { value: result.data as z.output<S>, usage: result.metadata.usage, detail: result.data };
    });
  }

  private async call<T>(
    kind: string,
    instruction: string,
    run: () => Promise<{ value: T; usage?: Usage; detail: unknown }>,
  ): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      const started = Date.now();
      try {
        const { value, usage, detail } = await run();
        appendJsonl('ai-log.jsonl', {
          at: new Date().toISOString(),
          scenario: this.scenario,
          kind,
          instruction,
          ok: true,
          ms: Date.now() - started,
          usage,
          detail,
        });
        log(`    [IA ${kind}] ${instruction}`);
        return value;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        appendJsonl('ai-log.jsonl', {
          at: new Date().toISOString(),
          scenario: this.scenario,
          kind,
          instruction,
          ok: false,
          attempt,
          ms: Date.now() - started,
          error: message.slice(0, 1000),
        });
        // The free Gemini tier answers 429 past its requests per minute. That is
        // the provider, not the scenario: wait and ask again, a bounded number of times.
        if (RATE_LIMIT.test(message) && attempt <= MAX_RATE_LIMIT_RETRIES) {
          const wait = Math.min(60_000, 10_000 * attempt);
          log(`    [IA ${kind}] límite del proveedor; reintento ${attempt} en ${wait / 1000}s`);
          await new Promise((resolve) => setTimeout(resolve, wait));
          continue;
        }
        throw error;
      }
    }
  }
}
