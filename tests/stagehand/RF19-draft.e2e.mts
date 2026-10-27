import { strict as assert } from 'node:assert';
import { read } from './support/dom.mjs';
import {
  barScope,
  bodyHas,
  bodyLacks,
  cardScope,
  dialogClosed,
  dialogScope,
  latestMovementCode,
  pickerReady,
  waitForButtons,
  waitForCard,
} from './support/flows.mjs';
import { goto } from './support/session.mjs';
import { defineSuite, type Ctx } from './support/suite.mjs';

const OUTBOUND = '/movements/new/outbound';
const INBOUND = '/movements/new/inbound';
const NOTE = 'Borrador Stagehand RF-19';

/** Captures one bottle of the first product with stock, the way every scenario here starts. */
async function captureOneBottle(ctx: Ctx) {
  await goto(ctx.session, OUTBOUND);
  const cards = await pickerReady(ctx, true);
  const product = cards.find((c) => (c.stock ?? 0) > 0)?.name;
  assert.ok(product, 'Ningún producto de la primera página tiene existencia en la bodega de origen');
  await ctx.ai.click('Pulsa el botón "Añadir botella" de esta tarjeta de producto', 'Añadir botella', {
    within: await cardScope(ctx, product),
  });
  await waitForCard(ctx, product, (c) => c.total === 1, '1 unidad en total');
  return product;
}

async function discard(ctx: Ctx) {
  await ctx.ai.click('Pulsa el botón "Descartar"', 'Descartar', { within: await barScope(ctx) });
  const dialog = await dialogScope(ctx, '¿Descartar lo que capturaste?');
  await ctx.ai.click('Pulsa el botón "Descartar" del diálogo para confirmar el descarte', 'Descartar', { within: dialog });
  await bodyHas(ctx, 'Borrador descartado');
}

defineSuite('RF19-draft', 'RF-19 Guardar y retomar un borrador de movimiento', [
  {
    id: 'RF19-01',
    name: 'El borrador sobrevive a salir de la vista y a recargar, y es propio de su tipo',
    run: async (ctx) => {
      const product = await captureOneBottle(ctx);
      await ctx.ai.fill('Escribe %nota% en el campo "Nota"', 'Nota', { nota: NOTE });
      assert.equal((await read(ctx.session.page, 'field', 'Nota'))?.value, NOTE);

      // Leaves the capture for another view, then comes back.
      await goto(ctx.session, '/stock');
      await goto(ctx.session, OUTBOUND);
      await pickerReady(ctx, true);
      await waitForCard(ctx, product, (c) => c.total === 1, 'la línea recuperada tras salir');
      assert.equal((await read(ctx.session.page, 'field', 'Nota'))?.value, NOTE, 'La nota no se recuperó');

      // A cold load is a reload: the access token is gone, only localStorage remains.
      await goto(ctx.session, OUTBOUND);
      await pickerReady(ctx, true);
      await waitForCard(ctx, product, (c) => c.total === 1, 'la línea recuperada tras recargar');
      await waitForButtons(ctx, 'Confirmar', 1);

      // One draft per movement type: an inbound starts empty.
      await goto(ctx.session, INBOUND);
      const inbound = await pickerReady(ctx, false);
      assert.ok(inbound.every((c) => c.total === 0), 'La entrada no debería heredar el borrador de la salida');
      await waitForButtons(ctx, 'Confirmar', 0);

      await goto(ctx.session, OUTBOUND);
      await pickerReady(ctx, true);
      await waitForCard(ctx, product, (c) => c.total === 1, 'el borrador de salida intacto');
      await discard(ctx);
    },
  },
  {
    id: 'RF19-02',
    name: 'Un borrador vacío no se confirma, Volver no lo pierde y Descartar sí lo borra',
    run: async (ctx) => {
      const lastCode = await latestMovementCode(ctx);

      await goto(ctx.session, OUTBOUND);
      await pickerReady(ctx, true);
      for (const name of ['Confirmar', 'Descartar', 'Ver el resumen']) await waitForButtons(ctx, name, 0);

      const product = await captureOneBottle(ctx);
      await ctx.ai.click('Pulsa el botón "Confirmar"', 'Confirmar', { within: await barScope(ctx) });
      const confirm = await dialogScope(ctx, '¿Confirmar esta salida?');
      await ctx.ai.click('Pulsa el botón "Volver" del diálogo', 'Volver', { within: confirm });
      await dialogClosed(ctx);
      await bodyLacks(ctx, 'Movimiento registrado');

      await goto(ctx.session, OUTBOUND);
      await pickerReady(ctx, true);
      await waitForCard(ctx, product, (c) => c.total === 1, 'el borrador conservado tras Volver');

      await discard(ctx);
      await goto(ctx.session, OUTBOUND);
      const cards = await pickerReady(ctx, true);
      assert.ok(cards.every((c) => c.total === 0), 'El borrador descartado no debería volver');
      await waitForButtons(ctx, 'Confirmar', 0);

      assert.equal(await latestMovementCode(ctx), lastCode, 'Ningún paso debería registrar un movimiento');
    },
  },
]);
