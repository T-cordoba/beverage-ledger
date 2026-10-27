import { strict as assert } from 'node:assert';
import { z } from 'zod';
import { read, waitFor } from './support/dom.mjs';
import { MOVEMENT_CODE, bodyHas, stockTable, toNumber } from './support/flows.mjs';
import { spendRefresh } from './support/budget.mjs';
import { BASE_URL } from './support/env.mjs';
import { currentPath } from './support/session.mjs';
import { defineSuite } from './support/suite.mjs';

const KARDEX_PATH = /^\/stock\/[0-9a-f-]{36}$/;
const MISSING_PRODUCT = '00000000-0000-4000-8000-000000000000';

defineSuite('RF24-kardex', 'RF-24 Consultar el kardex de un producto', [
  {
    id: 'RF24-01',
    name: 'Abrir el kardex desde existencias y recorrer el saldo corrido',
    run: async (ctx) => {
      const rows = await stockTable(ctx);
      // A product with stock has at least one confirmed movement to walk through.
      const target = rows.find((r) => (r.units ?? 0) > 0);
      assert.ok(target, 'Ningún producto de la primera página tiene existencia');

      assert.ok(await read(ctx.session.page, 'tagRow', target.name, 'producto'));
      await ctx.ai.click(`Pulsa el enlace "${target.name}" de esta fila`, target.name, {
        within: ctx.session.page.locator('[data-sh-row="producto"]'),
      });
      await waitFor('el kardex del producto', () => currentPath(ctx.session), (p) => KARDEX_PATH.test(p), 20_000);
      await waitFor(`el título «${target.name}»`, () => read(ctx.session.page, 'h1'), (h) => h === target.name);
      await bodyHas(ctx, 'Historial de movimientos');

      // The tile reads 0 until the availability query lands, so it counts once it matches or the wait runs out.
      const lines = await waitFor('las líneas del kardex', () => read(ctx.session.page, 'cells'), (c) => c.length > 0, 20_000);
      const onHand = await waitFor(
        `la tarjeta En existencia con ${target.units}`,
        () => read(ctx.session.page, 'statTile', 'En existencia'),
        (v) => v !== null && toNumber(v) === target.units,
        20_000,
      );
      assert.equal(toNumber(onHand), target.units, 'El kardex y el listado no coinciden en la existencia');
      const seen = await ctx.ai.extractChecked(
        'Extrae onHand = el número grande de la tarjeta "En existencia" del producto',
        z.object({ onHand: z.number() }),
        (data) => (data.onHand === target.units ? null : `la tarjeta dice ${target.units}, no ${data.onHand}`),
      );
      assert.equal(seen.onHand, target.units);

      // Columns: Ocurrió el · Movimiento · Capturado · Cambio · Saldo, newest first.
      for (const line of lines) assert.match(line[1]!.split(' ')[0]!, MOVEMENT_CODE);
      for (let i = 0; i + 1 < lines.length; i++) {
        const [newer, older] = [lines[i]!, lines[i + 1]!];
        assert.equal(
          toNumber(newer[4]),
          toNumber(older[4]) + toNumber(newer[3]),
          `El saldo de ${newer[1]} no es el saldo anterior más su cambio`,
        );
      }
    },
  },
  {
    id: 'RF24-02',
    name: 'El kardex de un producto inexistente avisa y deja volver a existencias',
    run: async (ctx) => {
      // Not goto(): it waits for an h1, and this empty state has none.
      await spendRefresh();
      await ctx.session.page.goto(`${BASE_URL}/stock/${MISSING_PRODUCT}`, { waitUntil: 'load' });
      await bodyHas(ctx, 'Ese producto no está disponible.', 20_000);
      await bodyHas(ctx, 'Puede que se haya eliminado, o que pertenezca a otra organización.');
      assert.deepEqual(await read(ctx.session.page, 'cells'), []);

      await ctx.ai.click('Pulsa el enlace "Existencias" que acompaña al aviso de producto no disponible', 'Existencias');
      await waitFor('volver a /stock', () => currentPath(ctx.session), (p) => p === '/stock', 20_000);
      await waitFor('la tabla de existencias', () => read(ctx.session.page, 'stockRows'), (r) => r.length > 0, 30_000);
    },
  },
]);
