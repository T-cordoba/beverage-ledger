import { strict as assert } from 'node:assert';
import { read, waitFor } from './support/dom.mjs';
import { bodyHas, fold, settledRows, stockTable, waitForButtons } from './support/flows.mjs';
import { defineSuite } from './support/suite.mjs';

const SEARCH = 'Buscar existencias por producto';
const CATEGORY = 'Filtrar por categoría';
const NO_MATCH = 'Ningún producto coincide con esos filtros.';

defineSuite('RF23-stock-filters', 'RF-23 Filtrar las existencias', [
  {
    id: 'RF23-01',
    name: 'Buscar un producto y filtrar por su categoría acota el listado',
    run: async (ctx) => {
      await stockTable(ctx);
      // The second row, so the result is not just the page that was already on screen.
      const [, target] = await read(ctx.session.page, 'cells');
      assert.ok(target, 'El listado necesita al menos dos productos');
      const product = (await read(ctx.session.page, 'stockRows'))[1]!.name;
      const category = target[1]!;

      await ctx.ai.fill('Escribe %busqueda% en el buscador de existencias', SEARCH, { busqueda: product });
      assert.equal((await read(ctx.session.page, 'field', SEARCH))?.value, product);
      // The API matches every word, in any order and without accents, in name, brand or category.
      const words = fold(product).split(/\s+/);
      const found = await settledRows(ctx, `el resultado de buscar «${product}»`, (names) => names.includes(product));
      for (const row of found) {
        const haystack = fold(row.text);
        assert.ok(words.every((w) => haystack.includes(w)), `«${row.name}» no contiene todas las palabras de «${product}»`);
      }

      await ctx.ai.click(`Abre el selector "${CATEGORY}"`, CATEGORY, { prefix: true });
      await waitFor('la lista de categorías', () => read(ctx.session.page, 'options'), (o) => !!o?.includes(category));
      await ctx.ai.click(`Elige la opción "${category}" de la lista de categorías`, category);
      await waitFor(`«${category}» elegida`, () => read(ctx.session.page, 'combobox', CATEGORY), (c) => c?.text === category);

      await settledRows(ctx, `«${product}» en «${category}»`, (names) => names.includes(product));
      const cells = await read(ctx.session.page, 'cells');
      assert.ok(cells.every((c) => c[1] === category), `Hay filas fuera de «${category}»: ${JSON.stringify(cells.map((c) => c[1]))}`);
    },
  },
  {
    id: 'RF23-02',
    name: 'Una búsqueda con comodín no devuelve nada y Limpiar filtros restaura el listado',
    run: async (ctx) => {
      const all = await stockTable(ctx);

      await ctx.ai.fill('Escribe %busqueda% en el buscador de existencias', SEARCH, { busqueda: '%' });
      assert.equal((await read(ctx.session.page, 'field', SEARCH))?.value, '%');
      // DEF-01 in docs/black-box: '%' used to reach a LIKE and list the whole catalogue.
      await bodyHas(ctx, NO_MATCH, 20_000);
      assert.deepEqual(await read(ctx.session.page, 'stockRows'), []);

      await waitForButtons(ctx, 'Limpiar filtros', 1);
      await ctx.ai.click('Pulsa el botón "Limpiar filtros"', 'Limpiar filtros');
      await settledRows(ctx, 'el listado completo de nuevo', (names) => names[0] === all[0]!.name);
      assert.equal((await read(ctx.session.page, 'field', SEARCH))?.value, '');
    },
  },
]);
