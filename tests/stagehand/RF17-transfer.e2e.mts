import { strict as assert } from 'node:assert';
import { z } from 'zod';
import { read, waitFor } from './support/dom.mjs';
import {
  DATA,
  bodyHas,
  cardScope,
  confirmCapture,
  pickerReady,
  stockOf,
  waitForButtons,
  waitForCard,
} from './support/flows.mjs';
import { goto } from './support/session.mjs';
import { defineSuite, type Ctx } from './support/suite.mjs';

const TRANSFER = '/movements/new/transfer';
const { source: SOURCE, destination: DESTINATION } = DATA.locations;

async function comboboxReady(ctx: Ctx, label: string) {
  return waitFor(`el selector «${label}» habilitado`, () => read(ctx.session.page, 'combobox', label), (c) => !!c && !c.disabled, 30_000);
}

/** Opens one end's selector and picks an option, both through the model. */
async function chooseEnd(ctx: Ctx, label: 'Desde' | 'Hacia', option: string) {
  await comboboxReady(ctx, label);
  await ctx.ai.click(`Abre el selector de bodega "${label}"`, label, { prefix: true });
  await waitFor(`la lista de «${label}»`, () => read(ctx.session.page, 'options'), (o) => !!o?.includes(option));
  await ctx.ai.click(`Elige la opción "${option}" de la lista de bodegas abierta`, `${option}`);
  await waitFor('que se cierre la lista', () => read(ctx.session.page, 'options'), (o) => o === null);
  await waitFor(`«${option}» en «${label}»`, () => read(ctx.session.page, 'combobox', label), (c) => !!c?.text.includes(option));
}

/** The options of the open list, read by the model and checked against the DOM. */
async function openOptions(ctx: Ctx) {
  const shown = await waitFor('la lista de bodegas abierta', () => read(ctx.session.page, 'options'), (o) => o !== null && o.length > 0);
  const expected = [...shown!].sort();
  const { options } = await ctx.ai.extractChecked(
    'Extrae los nombres de todas las opciones de la lista desplegable de bodegas que está abierta',
    z.object({ options: z.array(z.string()) }),
    (data) => {
      const seen = data.options.map((o) => o.trim()).sort();
      return JSON.stringify(seen) === JSON.stringify(expected) ? null : `la lista no es ${JSON.stringify(seen)}`;
    },
  );
  assert.deepEqual([...options.map((o) => o.trim())].sort(), [...shown!].sort(), 'La IA leyó otras opciones de las que hay');
  return shown!;
}

defineSuite('RF17-transfer', 'RF-17 Traspaso entre bodegas (TRANSFER)', [
  {
    id: 'RF17-01',
    name: 'Origen y destino son obligatorios para confirmar',
    run: async (ctx) => {
      await goto(ctx.session, TRANSFER);
      assert.ok((await comboboxReady(ctx, 'Desde'))!.text.includes('Elige un origen'));
      assert.ok((await comboboxReady(ctx, 'Hacia'))!.text.includes('Elige un destino'));
      const [first] = await pickerReady(ctx, false);

      await ctx.ai.click('Pulsa el botón "Añadir botella" de esta tarjeta de producto', 'Añadir botella', {
        within: await cardScope(ctx, first!.name),
      });
      await waitForButtons(ctx, 'Ver el resumen', 1);
      const [blocked] = await waitForButtons(ctx, 'Confirmar', 1);
      assert.equal(blocked!.disabled, true, 'Confirmar debería estar bloqueado sin origen ni destino');

      await chooseEnd(ctx, 'Desde', SOURCE);
      const [onlySource] = await waitForButtons(ctx, 'Confirmar', 1);
      assert.equal(onlySource!.disabled, true, 'Confirmar debería seguir bloqueado sin destino');

      await chooseEnd(ctx, 'Hacia', DESTINATION);
      await waitFor('Confirmar habilitado', async () => (await read(ctx.session.page, 'buttons', 'Confirmar'))[0], (b) => b?.disabled === false);
    },
  },
  {
    id: 'RF17-02',
    name: 'El destino excluye al origen y viceversa',
    run: async (ctx) => {
      await goto(ctx.session, TRANSFER);
      await chooseEnd(ctx, 'Desde', SOURCE);

      await comboboxReady(ctx, 'Hacia');
      await ctx.ai.click('Abre el selector de bodega "Hacia"', 'Hacia', { prefix: true });
      const destinations = await openOptions(ctx);
      assert.ok(destinations.includes(DESTINATION), `«${DESTINATION}» debería ofrecerse como destino`);
      assert.ok(!destinations.includes(SOURCE), 'El origen no debería ofrecerse como destino');
      await ctx.ai.click(`Elige la opción "${DESTINATION}" de la lista de bodegas abierta`, `${DESTINATION}`);
      await waitFor(`«${DESTINATION}» en «Hacia»`, () => read(ctx.session.page, 'combobox', 'Hacia'), (c) => !!c?.text.includes(DESTINATION));

      await ctx.ai.click('Abre el selector de bodega "Desde"', 'Desde', { prefix: true });
      const sources = await openOptions(ctx);
      assert.ok(sources.includes(SOURCE));
      assert.ok(!sources.includes(DESTINATION), 'El destino elegido no debería ofrecerse como origen');
      await ctx.session.page.keyPress('Escape');
      await waitFor('que se cierre la lista', () => read(ctx.session.page, 'options'), (o) => o === null);
      assert.ok((await read(ctx.session.page, 'combobox', 'Desde'))!.text.includes(SOURCE));
      assert.ok((await read(ctx.session.page, 'combobox', 'Hacia'))!.text.includes(DESTINATION));
    },
  },
  {
    id: 'RF17-03',
    name: 'Registrar un traspaso mueve la existencia entre las dos bodegas',
    run: async (ctx) => {
      await goto(ctx.session, TRANSFER);
      await comboboxReady(ctx, 'Desde');
      const [first] = await pickerReady(ctx, false);
      const product = first!.name;
      const sourceBefore = await stockOf(ctx, product, SOURCE);
      const destinationBefore = await stockOf(ctx, product, DESTINATION);
      assert.ok(sourceBefore > 0, `«${product}» no tiene existencia en el origen`);

      await goto(ctx.session, TRANSFER);
      await chooseEnd(ctx, 'Desde', SOURCE);
      await chooseEnd(ctx, 'Hacia', DESTINATION);
      await pickerReady(ctx, true);
      const card = await waitForCard(ctx, product, (c) => c.stock !== null, 'la existencia del origen');
      assert.equal(card.stock, sourceBefore, 'La tarjeta no muestra la existencia del origen');

      await ctx.ai.click('Pulsa el botón "Añadir botella" de esta tarjeta de producto', 'Añadir botella', {
        within: await cardScope(ctx, product),
      });
      await waitForCard(ctx, product, (c) => c.total === 1, '1 unidad en total');
      await confirmCapture(ctx, '¿Confirmar este traspaso?');

      await bodyHas(ctx, 'Líneas (2)');
      const body = await read(ctx.session.page, 'text');
      assert.match(body, /\bTraspaso\b/);
      assert.match(body, /\bconfirmado\b/);
      assert.match(body, /-1 unidad base/);
      assert.match(body, /(^|[^-\d])1 unidad base/);

      assert.equal(await stockOf(ctx, product, DESTINATION), destinationBefore + 1, 'El destino no subió en 1');
      assert.equal(await stockOf(ctx, product, SOURCE), sourceBefore - 1, 'El origen no bajó en 1');
    },
  },
  {
    id: 'RF17-04',
    name: 'Las cantidades del traspaso se topan con la existencia del origen',
    run: async (ctx) => {
      await goto(ctx.session, TRANSFER);
      await chooseEnd(ctx, 'Desde', SOURCE);
      const cards = await pickerReady(ctx, true);
      // The smallest stock that still fits a case: the cap comes in a few clicks
      // and shows that cases and bottles spend the same pool.
      const target = cards.filter((c) => c.stock! >= 12).reduce((min, c) => (c.stock! < min.stock! ? c : min));
      const { name } = target;
      const stock = target.stock!;
      const cases = Math.floor(stock / 12);
      const bottles = stock % 12;

      const scope = await cardScope(ctx, name);
      const addCase = await ctx.ai.resolve('Encuentra el botón "Añadir caja" de esta tarjeta de producto', 'Añadir caja', { within: scope });
      const addBottle = await ctx.ai.resolve('Encuentra el botón "Añadir botella" de esta tarjeta de producto', 'Añadir botella', { within: scope });
      const removeCase = await ctx.ai.resolve('Encuentra el botón "Quitar caja" de esta tarjeta de producto', 'Quitar caja', { within: scope });
      const removeBottle = await ctx.ai.resolve('Encuentra el botón "Quitar botella" de esta tarjeta de producto', 'Quitar botella', { within: scope });

      let taken = 0;
      for (let i = 0; i < cases; i++) {
        await ctx.ai.replay(addCase);
        taken += 12;
        const expected = taken;
        await waitForCard(ctx, name, (c) => c.total === expected, `${expected} unidades en total`);
      }
      for (let i = 0; i < bottles; i++) {
        await ctx.ai.replay(addBottle);
        taken += 1;
        const expected = taken;
        await waitForCard(ctx, name, (c) => c.total === expected, `${expected} unidades en total`);
      }

      const capped = await waitForCard(ctx, name, (c) => c.addBottle.disabled && c.addCase.disabled, 'los "+" bloqueados');
      assert.equal(capped.total, stock);
      assert.equal(capped.left, 0);
      assert.equal(capped.limit, `Ya tomaste las ${stock} unidades que hay en la bodega de origen.`);

      for (let i = 0; i < bottles; i++) await ctx.ai.replay(removeBottle);
      for (let i = 0; i < cases; i++) await ctx.ai.replay(removeCase);
      await waitForCard(ctx, name, (c) => c.total === 0, '0 unidades en total');
      // Once more at zero: the counters never go negative.
      await ctx.ai.replay(removeBottle);
      await ctx.ai.replay(removeCase);
      const empty = await waitForCard(ctx, name, (c) => c.total === 0, '0 unidades en total');
      assert.equal(empty.total, 0);
      await waitForButtons(ctx, 'Confirmar', 0);
    },
  },
]);
