import { strict as assert } from 'node:assert';
import { z } from 'zod';
import { read, waitFor } from './support/dom.mjs';
import { settledRows, stockTable, toNumber } from './support/flows.mjs';
import { currentPath, goto } from './support/session.mjs';
import { defineSuite, type Ctx } from './support/suite.mjs';

const CARD = 'Bajo mínimo';
const EMPTY = 'Nada está por debajo de su mínimo.';

/** The dashboard's reorder card once it has loaded, tagged so the model can be scoped to it. */
async function lowStockCard(ctx: Ctx) {
  await goto(ctx.session, '/dashboard');
  const card = await waitFor('la tarjeta Bajo mínimo', () => read(ctx.session.page, 'section', CARD, 'bajo'), (s) => !!s && !s.loading, 30_000);
  return { card: card!, scope: ctx.session.page.locator('[data-sh-section="bajo"]') };
}

defineSuite('RF27-low-stock', 'RF-27 Consultar los productos bajo el stock mínimo', [
  {
    id: 'RF27-01',
    name: 'La tarjeta Bajo mínimo lista los productos y lleva al kardex y a existencias',
    run: async (ctx) => {
      const { card, scope } = await lowStockCard(ctx);
      if (card.items.length === 0) {
        assert.ok(card.text.includes(EMPTY), card.text);
      } else {
        const names = card.items.map((i) => i.name);
        const { products } = await ctx.ai.extractChecked(
          'Extrae products = los nombres de producto (enlaces) de la lista de esta tarjeta, en orden',
          z.object({ products: z.array(z.string()) }),
          (data) => (JSON.stringify(data.products.map((p) => p.trim())) === JSON.stringify(names) ? null : `la lista es ${JSON.stringify(names)}`),
          { within: scope },
        );
        assert.deepEqual(products.map((p) => p.trim()), names);
        // "existencia / mínimo unidades": every row is under its threshold.
        for (const item of card.items) {
          const [, onHand, minimum] = /([\d.]+) \/ ([\d.]+)/.exec(item.text) ?? [];
          // At the minimum counts as under it, as in the API (stock.mapper.ts).
          assert.ok(toNumber(onHand) <= toNumber(minimum),`«${item.name}» no está bajo su mínimo: ${item.text}`);
        }

        const first = names[0]!;
        await ctx.ai.click(`Pulsa el enlace "${first}" de la lista`, first, { within: scope });
        await waitFor('el kardex del producto', () => currentPath(ctx.session), (p) => /^\/stock\/[0-9a-f-]{36}$/.test(p), 20_000);
        await waitFor(`el título «${first}»`, () => read(ctx.session.page, 'h1'), (h) => h === first);
      }

      const again = await lowStockCard(ctx);
      await ctx.ai.click('Pulsa el enlace "Ver existencias" de la tarjeta', 'Ver existencias', { within: again.scope });
      await waitFor('llegar a /stock', () => currentPath(ctx.session), (p) => p === '/stock', 20_000);
    },
  },
  {
    id: 'RF27-02',
    name: 'La lista no trae de más: cada producto tiene mínimo y está marcado Bajo mínimo en existencias',
    run: async (ctx) => {
      const { card } = await lowStockCard(ctx);
      const tile = await waitFor('la cifra Bajo mínimo del resumen', () => read(ctx.session.page, 'statTile', CARD), Boolean);
      // The card is a shortlist of eight; the tile counts all of them.
      assert.ok(toNumber(tile) >= card.items.length, `El resumen dice ${tile} y la tarjeta lista ${card.items.length}`);
      assert.equal(card.items.length === 0, toNumber(tile) === 0, 'La tarjeta y el resumen discrepan sobre si hay algo bajo mínimo');

      await stockTable(ctx);
      for (const item of card.items) {
        await ctx.session.page.locator('input[type=search]').fill(item.name);
        const rows = await settledRows(ctx, `«${item.name}» en existencias`, (names) => names.includes(item.name));
        const cells = (await read(ctx.session.page, 'cells')).find((c) => c[0]!.startsWith(item.name));
        assert.ok(cells, `No aparece la fila de «${item.name}»`);
        assert.notEqual(cells[3], '—', `«${item.name}» no tiene mínimo y no debería listarse`);
        assert.equal(cells[4], 'Bajo mínimo', `«${item.name}» no está marcado Bajo mínimo en existencias`);
        assert.ok(rows.some((r) => r.name === item.name));
      }
    },
  },
]);
