import { strict as assert } from 'node:assert';
import { z } from 'zod';
import { read, waitFor } from './support/dom.mjs';
import { stockTable } from './support/flows.mjs';
import { currentPath, goto } from './support/session.mjs';
import { defineSuite } from './support/suite.mjs';

const COLUMNS = ['Producto', 'Categoría', 'En existencia', 'Mínimo', 'Estado'];

defineSuite('RF22-stock-levels', 'RF-22 Consultar las existencias actuales', [
  {
    id: 'RF22-01',
    name: 'El listado de existencias muestra sus columnas y filas',
    run: async (ctx) => {
      const rows = await stockTable(ctx);
      assert.equal(await read(ctx.session.page, 'h1'), 'Existencias');
      assert.deepEqual(await read(ctx.session.page, 'headers'), COLUMNS);
      assert.ok(rows.every((r) => r.units !== null && /\b(OK|Bajo mínimo)\b/.test(r.text)), 'Cada fila lleva existencia y estado');

      const [first] = rows;
      const seen = await ctx.ai.extractChecked(
        'De la primera fila de la tabla de existencias extrae: name = el nombre del producto (el enlace), units = el número de la columna "En existencia"',
        z.object({ name: z.string(), units: z.number() }),
        (data) =>
          data.name.trim() !== first!.name
            ? `la primera fila no es «${data.name}»`
            : data.units !== first!.units
              ? `«${first!.name}» tiene ${first!.units} unidades, no ${data.units}`
              : null,
      );
      assert.equal(seen.name.trim(), first!.name);
      assert.equal(seen.units, first!.units);
    },
  },
  {
    // Last on purpose: it signs out, and the file's session ends with it.
    id: 'RF22-02',
    name: 'Sin sesión, /stock redirige al login y no muestra existencias',
    run: async (ctx) => {
      await stockTable(ctx);
      const account = await read(ctx.session.page, 'accountName');
      assert.ok(account, 'No se pudo leer el nombre de la cuenta en la barra superior');
      await ctx.ai.click(`Pulsa el botón "Menú de la cuenta de ${account}"`, `Menú de la cuenta de ${account}`);
      await waitFor('el botón Cerrar sesión', () => read(ctx.session.page, 'buttons', 'Cerrar sesión'), (b) => b.length === 1);
      await ctx.ai.click('Pulsa el botón "Cerrar sesión"', 'Cerrar sesión');
      await waitFor('salir de la aplicación', () => read(ctx.session.page, 'accountName'), (a) => a === null, 20_000);

      await goto(ctx.session, '/stock');
      await waitFor('la redirección al login', () => currentPath(ctx.session), (p) => p === '/login', 20_000);
      assert.match(await ctx.session.page.url(), /[?&]next=%2Fstock/);
      assert.deepEqual(await read(ctx.session.page, 'stockRows'), []);
      assert.ok(await read(ctx.session.page, 'field', 'Correo electrónico'), 'Debería verse el formulario de login');
    },
  },
]);
