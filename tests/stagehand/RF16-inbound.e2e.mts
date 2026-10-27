import { strict as assert } from 'node:assert';
import { read, waitFor } from './support/dom.mjs';
import {
  DATA,
  bodyHas,
  barScope,
  bodyLacks,
  cardScope,
  confirmCapture,
  dialogClosed,
  dialogScope,
  latestMovementCode,
  openFromHistory,
  pickerReady,
  stockOf,
  waitForButtons,
  waitForCard,
} from './support/flows.mjs';
import { goto } from './support/session.mjs';
import { defineSuite } from './support/suite.mjs';

const INBOUND = '/movements/new/inbound';

defineSuite('RF16-inbound', 'RF-16 Entrada de inventario (INBOUND)', [
  {
    id: 'RF16-01',
    name: 'Registrar una entrada y verla en el detalle y el historial',
    run: async (ctx) => {
      await goto(ctx.session, INBOUND);
      const [first] = await pickerReady(ctx, false);
      const product = first!.name;
      const before = await stockOf(ctx, product);
      const user = await read(ctx.session.page, 'accountName');
      assert.ok(user, 'No se pudo leer el nombre de la cuenta en la barra superior');

      await goto(ctx.session, INBOUND);
      await pickerReady(ctx, false);
      await ctx.ai.click('Pulsa el botón "Añadir caja" de esta tarjeta de producto', 'Añadir caja', {
        within: await cardScope(ctx, product),
      });
      await waitForCard(ctx, product, (c) => c.total === 12, '12 unidades en total');

      const { code } = await confirmCapture(ctx, '¿Confirmar esta entrada?');
      assert.equal(await stockOf(ctx, product), before + 12, 'La existencia no subió en 12 unidades');

      await openFromHistory(ctx, code);
      await bodyHas(ctx, 'Líneas (1)');
      const body = await read(ctx.session.page, 'text');
      assert.match(body, /\bEntrada\b/);
      assert.match(body, /\bconfirmado\b/);
      assert.equal(await read(ctx.session.page, 'detail', 'Registrado por'), user);
    },
  },
  {
    id: 'RF16-02',
    name: 'Validación de la entrada: sin líneas no hay confirmación y Volver no registra',
    run: async (ctx) => {
      const lastCode = await latestMovementCode(ctx);

      await goto(ctx.session, INBOUND);
      await waitFor('el título de la captura', () => read(ctx.session.page, 'h1'), (h) => h === 'Registrar una entrada');
      const [first] = await pickerReady(ctx, false);
      await waitForButtons(ctx, 'Confirmar', 0);

      const product = first!.name;
      await ctx.ai.click('Pulsa el botón "Añadir botella" de esta tarjeta de producto', 'Añadir botella', {
        within: await cardScope(ctx, product),
      });
      await waitForCard(ctx, product, (c) => c.total === 1, '1 unidad en total');

      // The capture no longer asks for a date: it says it uses the current one.
      await bodyHas(ctx, 'Se registrará con la fecha y hora actuales.');
      await waitForButtons(ctx, 'Ahora', 0);
      await ctx.ai.fill('Escribe %nota% en el campo "Nota"', 'Nota', { nota: DATA.notes.inbound });
      assert.equal((await read(ctx.session.page, 'field', 'Nota'))?.value, DATA.notes.inbound);

      await ctx.ai.click('Pulsa el botón "Confirmar"', 'Confirmar', { within: await barScope(ctx) });
      const dialog = await dialogScope(ctx, '¿Confirmar esta entrada?');
      await ctx.ai.click('Pulsa el botón "Volver" del diálogo', 'Volver', { within: dialog });
      await dialogClosed(ctx);
      await waitForCard(ctx, product, (c) => c.total === 1, 'la captura intacta');
      await bodyLacks(ctx, 'Movimiento registrado');

      assert.equal(await latestMovementCode(ctx), lastCode, 'Volver no debería registrar una entrada');
    },
  },
]);
