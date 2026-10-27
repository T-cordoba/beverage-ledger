import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Locator } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { read, waitFor, type Card } from './dom.mjs';
import { ROOT } from './env.mjs';
import { movementIdFrom } from './ledger.mjs';
import { currentPath, goto } from './session.mjs';
import type { Ctx } from './suite.mjs';

type TestData = {
  locations: { source: string; destination: string };
  notes: { outbound: string; inbound: string };
  reasons: { adjustment: string; cancellation: string; tooShort: string; blank: string };
  minReasonLength: number;
  receipt: { fileName: string; typeLabels: string[] };
};

export const DATA: TestData = JSON.parse(readFileSync(join(ROOT, 'support', 'data.json'), 'utf8'));

export const MOVEMENT_CODE = /^MOV-\d{4}-\d{6}$/;
const DETAIL_PATH = /^\/movements\/[0-9a-f-]{36}$/;

/** Waits for the product picker; `withStock` also waits for the on-hand line. */
export async function pickerReady(ctx: Ctx, withStock: boolean): Promise<Card[]> {
  return waitFor(
    'las tarjetas de producto del selector',
    () => read(ctx.session.page, 'cards'),
    (cards) => cards.length > 0 && (!withStock || cards.every((card) => card.stock !== null)),
    30_000,
  );
}

export async function card(ctx: Ctx, name: string): Promise<Card> {
  const found = (await read(ctx.session.page, 'cards')).find((c) => c.name === name);
  assert.ok(found, `No aparece la tarjeta de «${name}»`);
  return found;
}

/** A Stagehand locator on one product card, to scope the model to it. */
export async function cardScope(ctx: Ctx, name: string): Promise<Locator> {
  assert.ok(await read(ctx.session.page, 'tagCard', name, 'objetivo'), `No hay tarjeta de «${name}»`);
  return ctx.session.page.locator('[data-sh-card="objetivo"]');
}

export async function waitForCard(ctx: Ctx, name: string, ok: (card: Card) => boolean, what: string) {
  return waitFor(`${what} en la tarjeta de «${name}»`, () => card(ctx, name), ok);
}

/** The sticky bar with Ver el resumen, Descartar and Confirmar, to scope the model to it. */
export async function barScope(ctx: Ctx): Promise<Locator> {
  await waitFor('la barra inferior del movimiento', () => read(ctx.session.page, 'tagBar'), Boolean);
  return ctx.session.page.locator('[data-sh-bar]');
}

export async function dialogScope(ctx: Ctx, heading: string): Promise<Locator> {
  await waitFor(
    `el diálogo «${heading}»`,
    () => read(ctx.session.page, 'dialog'),
    (dialog) => dialog?.heading === heading,
  );
  return ctx.session.page.locator('[data-sh-dialog]');
}

export async function dialogClosed(ctx: Ctx) {
  await waitFor('que se cierre el diálogo', () => read(ctx.session.page, 'dialog'), (d) => d === null);
}

export async function bodyHas(ctx: Ctx, text: string | RegExp, timeout = 15_000) {
  const ok = (body: string) => (typeof text === 'string' ? body.includes(text) : text.test(body));
  return waitFor(`el texto «${String(text)}»`, () => read(ctx.session.page, 'text'), ok, timeout);
}

export async function bodyLacks(ctx: Ctx, text: string) {
  const body = await read(ctx.session.page, 'text');
  assert.ok(!body.includes(text), `No debería aparecer «${text}»`);
}

/** Visible buttons whose accessible name is exactly `name`. */
export async function buttons(ctx: Ctx, name: string) {
  return read(ctx.session.page, 'buttons', name);
}

export async function waitForButtons(ctx: Ctx, name: string, count: number) {
  return waitFor(`${count} botón(es) «${name}»`, () => buttons(ctx, name), (list) => list.length === count);
}

/**
 * Confirms the captured movement through the bar and its dialog, both driven
 * by the model, and checks the landing: the detail URL, the success toast and a
 * code the model extracts that has to match the page's own heading.
 */
export async function confirmCapture(ctx: Ctx, dialogHeading: string, dialogText?: string) {
  await ctx.ai.click('Pulsa el botón "Confirmar"', 'Confirmar', { within: await barScope(ctx) });
  const dialog = await dialogScope(ctx, dialogHeading);
  if (dialogText) {
    const shown = await read(ctx.session.page, 'dialog');
    assert.ok(shown?.text.includes(dialogText), `Texto del diálogo inesperado: ${shown?.text}`);
  }
  await ctx.ai.click('Pulsa el botón "Confirmar" del diálogo', 'Confirmar', { within: dialog });

  await waitFor('el detalle del movimiento', () => currentPath(ctx.session), (p) => DETAIL_PATH.test(p), 30_000);
  const id = movementIdFrom(await ctx.session.page.url());
  ctx.track(id);
  await bodyHas(ctx, 'Movimiento registrado');
  await bodyHas(ctx, /MOV-\d{4}-\d+ se confirmó y se aplicó a las existencias\./);
  const code = await movementCode(ctx);
  return { id, code };
}

/** The code of the movement on screen, read by the model and checked against the h1. */
export async function movementCode(ctx: Ctx): Promise<string> {
  const heading = await waitFor('el código en el título', () => read(ctx.session.page, 'h1'), (h) => MOVEMENT_CODE.test(h));
  const { code } = await ctx.ai.extractChecked(
    'Extrae el código del movimiento que se muestra como título principal de la página (formato MOV-AAAA-NNNNNN)',
    z.object({ code: z.string() }),
    (data) => (data.code.trim() === heading ? null : `el título no es «${data.code}»`),
  );
  assert.equal(code.trim(), heading, 'El código extraído por la IA no coincide con el título de la página');
  return heading;
}

/** Units of `product` in /stock, optionally filtered by location. Deterministic: it is setup, not a step under test. */
export async function stockOf(ctx: Ctx, product: string, location?: string): Promise<number> {
  const page = ctx.session.page;
  await goto(ctx.session, '/stock');
  await waitFor('la tabla de existencias', () => read(page, 'stockRows'), (rows) => rows.length > 0, 30_000);
  assert.ok(await read(page, 'tagField', 'Buscar existencias', 'busqueda'), 'No está el buscador de existencias');
  await page.locator('[data-sh-field="busqueda"]').fill(product);
  if (location) await chooseOption(ctx, 'Filtrar por bodega', location);
  // The search is debounced and a new filter keeps the previous rows on screen
  // until the answer arrives, so the value counts once it stops changing.
  const readings: number[] = [];
  await waitFor(
    `la fila de «${product}» en existencias${location ? ` de ${location}` : ''}`,
    async () => {
      const row = (await read(page, 'stockRows')).find((r) => r.name === product && r.units !== null);
      if (row) readings.push(row.units!);
      return readings.slice(-4);
    },
    (last) => last.length === 4 && last.every((units) => units === last[0]),
    20_000,
  );
  return readings.at(-1)!;
}

/** Picks an option of a Radix select by clicking, for setup steps outside the scenario's actions. */
export async function chooseOption(ctx: Ctx, combobox: string, option: string) {
  const page = ctx.session.page;
  await waitFor(`el selector «${combobox}» habilitado`, () => read(page, 'combobox', combobox), (c) => !!c && !c.disabled, 20_000);
  assert.ok(await read(page, 'tagCombobox', combobox, 'selector'));
  await page.locator('[data-sh-combobox="selector"]').click();
  await waitFor(`la opción «${option}»`, () => read(page, 'tagOption', option, 'opcion'), Boolean);
  await page.locator('[data-sh-option="opcion"]').click();
  await waitFor('que se cierre la lista', () => read(page, 'options'), (o) => o === null);
  await waitFor(`«${option}» elegido en «${combobox}»`, () => read(page, 'combobox', combobox), (c) => !!c?.text.includes(option));
}

/** Code of the newest movement in the history, to prove later that nothing was written. */
export async function latestMovementCode(ctx: Ctx): Promise<string> {
  await goto(ctx.session, '/movements');
  const articles = await waitFor('el historial de movimientos', () => read(ctx.session.page, 'articles'), (a) => a.length > 0 && MOVEMENT_CODE.test(a[0]!.code), 30_000);
  return articles[0]!.code;
}

/**
 * Registers an inbound of one bottle of the first product, owned by the
 * scenario, so RF-20 and RF-21 never void a movement someone else made.
 */
export async function registerOwnInbound(ctx: Ctx) {
  await goto(ctx.session, '/movements/new/inbound');
  const [first] = await pickerReady(ctx, false);
  const product = first!.name;
  await ctx.ai.click('Pulsa el botón "Añadir botella" de esta tarjeta de producto', 'Añadir botella', {
    within: await cardScope(ctx, product),
  });
  await waitForCard(ctx, product, (c) => c.total === 1, '1 unidad en total');
  const { id, code } = await confirmCapture(ctx, '¿Confirmar esta entrada?');
  return { id, code, product };
}

/** Opens a movement's detail from the history through its "Detalle" link, as a user would. */
export async function openFromHistory(ctx: Ctx, code: string) {
  await goto(ctx.session, '/movements');
  await waitFor('el historial de movimientos', () => read(ctx.session.page, 'articles'), (a) => a.length > 0 && MOVEMENT_CODE.test(a[0]!.code), 30_000);
  await ctx.ai.fill('Escribe %codigo% en el buscador de movimientos por código', 'Buscar movimientos', { codigo: code });
  await waitFor(`la fila de ${code}`, () => read(ctx.session.page, 'tagArticle', code, 'fila'), Boolean);
  await waitFor(`solo la fila de ${code}`, () => read(ctx.session.page, 'articles'), (a) => a.length >= 1 && a[0]!.code === code);
  await read(ctx.session.page, 'tagArticle', code, 'fila');
  await ctx.ai.click('Pulsa el enlace "Detalle" de esta fila del historial', 'Detalle', {
    within: ctx.session.page.locator('[data-sh-article="fila"]'),
  });
  await waitFor('el detalle del movimiento', () => currentPath(ctx.session), (p) => DETAIL_PATH.test(p), 20_000);
  await waitFor(`el título ${code}`, () => read(ctx.session.page, 'h1'), (h) => h === code);
}

/** A number as next-intl prints it in Spanish: "12.345", "+3", "−2". */
export function toNumber(text: string | null | undefined): number {
  const value = Number((text ?? '').replace(/[.\s]/g, '').replace('−', '-').replace(/^\+/, ''));
  assert.ok(Number.isFinite(value), `«${text}» no es un número`);
  return value;
}

/** Opens /stock and waits for its first rows. */
export async function stockTable(ctx: Ctx) {
  await goto(ctx.session, '/stock');
  return waitFor('la tabla de existencias', () => read(ctx.session.page, 'stockRows'), (rows) => rows.length > 0, 30_000);
}

/** Rows once a debounced filter settles: the same names four reads in a row. */
export async function settledRows(ctx: Ctx, what: string, ok: (names: string[]) => boolean = () => true) {
  const readings: string[] = [];
  await waitFor(
    what,
    async () => {
      readings.push(JSON.stringify((await read(ctx.session.page, 'stockRows')).map((r) => r.name)));
      return readings.slice(-4);
    },
    (last) => last.length === 4 && last.every((r) => r === last[0]) && ok(JSON.parse(last[0]!)),
    20_000,
  );
  return read(ctx.session.page, 'stockRows');
}

/** Lower case without accents, as the API compares search words. */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
