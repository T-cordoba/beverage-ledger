import { strict as assert } from 'node:assert';
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

const ADJUSTMENT = '/movements/new/adjustment';
const REASON = 'Motivo';

async function reason(ctx: Ctx) {
  const field = await read(ctx.session.page, 'field', REASON);
  assert.ok(field, 'No aparece el campo Motivo');
  return field;
}

/** The validation shows once the field loses focus. */
async function typeReason(ctx: Ctx, value: string) {
  await ctx.ai.fill('Escribe %motivo% en el campo "Motivo"', 'Motivo', { motivo: value });
  await waitFor('el motivo escrito', () => reason(ctx), (f) => f.value === value);
  await ctx.session.page.keyPress('Tab');
}

defineSuite('RF18-adjustment', 'RF-18 Ajuste de inventario (ADJUSTMENT)', [
  {
    id: 'RF18-01',
    name: 'El motivo es obligatorio y de al menos 4 caracteres',
    run: async (ctx) => {
      await goto(ctx.session, ADJUSTMENT);
      await waitFor('el título de la captura', () => read(ctx.session.page, 'h1'), (h) => h === 'Registrar un ajuste');
      const [first] = await pickerReady(ctx, false);
      const product = first!.name;
      assert.equal(first!.total, 0);
      await waitForButtons(ctx, 'Confirmar', 0);

      await ctx.ai.click('Pulsa el botón "Quitar botella" de esta tarjeta de producto', 'Quitar botella', {
        within: await cardScope(ctx, product),
      });
      await waitForCard(ctx, product, (c) => c.total === -1, '-1 unidad en total');
      assert.equal((await reason(ctx)).value, '');
      const [empty] = await waitForButtons(ctx, 'Confirmar', 1);
      assert.equal(empty!.disabled, true, 'Sin motivo, Confirmar debería estar bloqueado');

      await typeReason(ctx, DATA.reasons.tooShort);
      await bodyHas(ctx, `Escribe al menos ${DATA.minReasonLength} caracteres.`);
      assert.equal((await reason(ctx)).invalid, true);
      assert.equal((await read(ctx.session.page, 'buttons', 'Confirmar'))[0]!.disabled, true);

      await typeReason(ctx, DATA.reasons.blank);
      await bodyHas(ctx, 'Este campo no puede quedar vacío.');
      assert.equal((await read(ctx.session.page, 'buttons', 'Confirmar'))[0]!.disabled, true);

      await typeReason(ctx, DATA.reasons.adjustment);
      await waitFor('Confirmar habilitado', async () => (await read(ctx.session.page, 'buttons', 'Confirmar'))[0], (b) => b?.disabled === false);

      await ctx.ai.click('Pulsa el botón "Añadir botella" de esta tarjeta de producto', 'Añadir botella', {
        within: await cardScope(ctx, product),
      });
      await waitForCard(ctx, product, (c) => c.total === 0, '0 unidades en total');
      await waitForButtons(ctx, 'Confirmar', 0);
    },
  },
  {
    id: 'RF18-02',
    name: 'Registrar un ajuste con motivo válido',
    run: async (ctx) => {
      await goto(ctx.session, ADJUSTMENT);
      const [first] = await pickerReady(ctx, false);
      const product = first!.name;
      const before = await stockOf(ctx, product);

      await goto(ctx.session, ADJUSTMENT);
      await pickerReady(ctx, false);
      await ctx.ai.click('Pulsa el botón "Quitar botella" de esta tarjeta de producto', 'Quitar botella', {
        within: await cardScope(ctx, product),
      });
      await waitForCard(ctx, product, (c) => c.total === -1, '-1 unidad en total');
      await typeReason(ctx, DATA.reasons.adjustment);
      await confirmCapture(ctx, '¿Confirmar este ajuste?');

      const body = await read(ctx.session.page, 'text');
      assert.match(body, /\bAjuste\b/);
      assert.match(body, /\bconfirmado\b/);
      assert.equal(await read(ctx.session.page, 'detail', 'Motivo'), DATA.reasons.adjustment);
      await bodyHas(ctx, 'Líneas (1)');
      await bodyHas(ctx, '-1 unidad base');
      await bodyHas(ctx, '-1 botella');

      assert.equal(await stockOf(ctx, product), before - 1, 'La existencia no bajó en 1 unidad');
    },
  },
]);
