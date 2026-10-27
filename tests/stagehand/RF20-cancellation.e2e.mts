import { strict as assert } from 'node:assert';
import { z } from 'zod';
import { read, waitFor } from './support/dom.mjs';
import {
  DATA,
  bodyHas,
  bodyLacks,
  dialogClosed,
  dialogScope,
  openFromHistory,
  registerOwnInbound,
  stockOf,
  waitForButtons,
} from './support/flows.mjs';
import { defineSuite, type Ctx } from './support/suite.mjs';

/** Status of the movement on screen, extracted by the model and checked against the page. */
async function status(ctx: Ctx, expected: 'confirmado' | 'anulado') {
  // The badge is on screen before the model reads it (run 12 read "null").
  await waitFor(`el estado «${expected}» en la página`, () => read(ctx.session.page, 'text'), (body) =>
    new RegExp(`\\b${expected}\\b`).test(body),
  );
  const { status: seen } = await ctx.ai.extractChecked(
    'Extrae el estado del movimiento de esta página de detalle: la etiqueta que aparece junto al tipo de movimiento',
    // The three labels the app can show (movements.status in es.json). As free
    // text the 7B model answered "confirmed" three times in a row (reports/15).
    z.object({ status: z.enum(['borrador', 'confirmado', 'anulado']) }),
    (data) => (data.status.trim().toLowerCase() === expected ? null : `el estado no es «${data.status}»`),
  );
  assert.equal(seen.trim().toLowerCase(), expected, `La IA leyó el estado «${seen}»`);
  const body = await read(ctx.session.page, 'text');
  assert.match(body, new RegExp(`\\b${expected}\\b`));
}

async function openCancelDialog(ctx: Ctx, code: string) {
  await ctx.ai.click('Pulsa el botón "Anular" del movimiento', 'Anular');
  return dialogScope(ctx, `¿Anular ${code}?`);
}

defineSuite('RF20-cancellation', 'RF-20 Anulación de un movimiento confirmado', [
  {
    id: 'RF20-01',
    name: 'Conservarlo cierra el diálogo sin anular',
    run: async (ctx) => {
      const { code } = await registerOwnInbound(ctx);
      await openFromHistory(ctx, code);
      await status(ctx, 'confirmado');

      const dialog = await openCancelDialog(ctx, code);
      const shown = await read(ctx.session.page, 'dialog');
      assert.match(shown!.text, /Lo que este movimiento tomó de las existencias vuelve/);
      assert.equal((await read(ctx.session.page, 'field', 'Motivo'))?.placeholder, '¿Por qué se anula?');

      await ctx.ai.click('Pulsa el botón "Conservarlo" del diálogo', 'Conservarlo', { within: dialog });
      await dialogClosed(ctx);
      await status(ctx, 'confirmado');
      await bodyLacks(ctx, 'Movimiento anulado');
      await waitForButtons(ctx, 'Anular', 1);
    },
  },
  {
    id: 'RF20-02',
    name: 'El motivo es obligatorio al anular',
    run: async (ctx) => {
      const { code } = await registerOwnInbound(ctx);
      const dialog = await openCancelDialog(ctx, code);
      const submit = 'Pulsa el botón "Anular" dentro del diálogo para confirmar la anulación';

      await ctx.ai.click(submit, 'Anular', { within: dialog });
      await bodyHas(ctx, 'Este campo no puede quedar vacío.');
      assert.equal((await read(ctx.session.page, 'field', 'Motivo'))?.invalid, true);

      await ctx.ai.fill('Escribe %motivo% en el campo "Motivo" del diálogo', 'Motivo', { motivo: DATA.reasons.blank }, { within: dialog });
      assert.equal((await read(ctx.session.page, 'field', 'Motivo'))?.value, DATA.reasons.blank);
      await ctx.ai.click(submit, 'Anular', { within: dialog });
      await bodyHas(ctx, 'Este campo no puede quedar vacío.');

      assert.ok(DATA.reasons.tooShort.length < DATA.minReasonLength);
      await ctx.ai.fill('Escribe %motivo% en el campo "Motivo" del diálogo', 'Motivo', { motivo: DATA.reasons.tooShort }, { within: dialog });
      assert.equal((await read(ctx.session.page, 'field', 'Motivo'))?.value, DATA.reasons.tooShort);
      await ctx.ai.click(submit, 'Anular', { within: dialog });
      await bodyHas(ctx, `Escribe al menos ${DATA.minReasonLength} caracteres.`);

      assert.ok(await read(ctx.session.page, 'dialog'), 'El diálogo debería seguir abierto');
      await bodyLacks(ctx, 'Movimiento anulado');
      await ctx.ai.click('Pulsa el botón "Conservarlo" del diálogo', 'Conservarlo', { within: dialog });
      await dialogClosed(ctx);
      await status(ctx, 'confirmado');
    },
  },
  {
    id: 'RF20-03',
    name: 'Anular con motivo válido revierte la existencia',
    run: async (ctx) => {
      const { code, product } = await registerOwnInbound(ctx);
      const withInbound = await stockOf(ctx, product);

      await openFromHistory(ctx, code);
      await status(ctx, 'confirmado');
      const dialog = await openCancelDialog(ctx, code);
      await ctx.ai.fill('Escribe %motivo% en el campo "Motivo" del diálogo', 'Motivo', { motivo: DATA.reasons.cancellation }, { within: dialog });
      await ctx.ai.click('Pulsa el botón "Anular" dentro del diálogo para confirmar la anulación', 'Anular', { within: dialog });

      await bodyHas(ctx, 'Movimiento anulado');
      await bodyHas(ctx, `${code} se revirtió y las existencias volvieron.`);
      assert.ok(await read(ctx.session.page, 'detail', 'Anulado el'), 'El detalle no muestra la fecha de anulación');
      await status(ctx, 'anulado');
      await waitForButtons(ctx, 'Anular', 0);
      const body = await read(ctx.session.page, 'text');
      assert.doesNotMatch(body, /\bconfirmado\b/);

      // The inbound added one bottle; voiding it takes that bottle back out.
      await waitFor('la existencia revertida', () => stockOf(ctx, product), (units) => units === withInbound - 1, 30_000);
    },
  },
]);
