import { strict as assert } from 'node:assert';
import { z } from 'zod';
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
  pickerReady,
  stockOf,
  waitForButtons,
  waitForCard,
} from './support/flows.mjs';
import { goto } from './support/session.mjs';
import { defineSuite, type Ctx } from './support/suite.mjs';

const OUTBOUND = '/movements/new/outbound';

/**
 * The product with the least stock (above zero) on the first page, read by the
 * model and checked against the DOM: the cap is reached in a few clicks.
 */
async function lowestStockProduct(ctx: Ctx) {
  const cards = await pickerReady(ctx, true);
  const { products } = await ctx.ai.extractChecked(
    'Extrae de cada tarjeta de producto del listado: name = el texto del encabezado (heading) de la tarjeta, que es el nombre del producto (no la marca que aparece debajo); stock = el número que aparece justo antes de "en existencia"',
    z.object({ products: z.array(z.object({ name: z.string(), stock: z.number() })) }),
    (data) => {
      for (const real of cards) {
        const seen = data.products.find((p) => p.name.trim() === real.name);
        if (!seen) return `faltó la tarjeta «${real.name}»`;
        if (seen.stock !== real.stock) return `«${real.name}» tiene ${real.stock} en existencia, no ${seen.stock}`;
      }
      return null;
    },
  );
  for (const real of cards) {
    const seen = products.find((p) => p.name.trim() === real.name);
    assert.ok(seen, `La IA no extrajo la tarjeta «${real.name}»`);
    assert.equal(seen.stock, real.stock, `La IA leyó mal la existencia de «${real.name}»`);
  }
  const candidates = cards.filter((c) => c.stock! > 0);
  const lowest = candidates.reduce((min, c) => (c.stock! < min.stock! ? c : min));
  return { name: lowest.name, stock: lowest.stock! };
}

/** Resolves a stepper once with observe(), so it can be pressed N times without N inferences. */
async function stepper(ctx: Ctx, product: string, label: string) {
  return ctx.ai.resolve(`Encuentra el botón "${label}" de esta tarjeta de producto`, label, {
    within: await cardScope(ctx, product),
  });
}

defineSuite('RF15-outbound', 'RF-15 Salida de inventario (OUTBOUND)', [
  {
    id: 'RF15-01',
    name: 'Registrar una salida correcta descuenta la existencia',
    run: async (ctx) => {
      await goto(ctx.session, OUTBOUND);
      const [first] = await pickerReady(ctx, true);
      const product = first!.name;
      const before = await stockOf(ctx, product);

      await goto(ctx.session, OUTBOUND);
      await pickerReady(ctx, true);
      await ctx.ai.click('Pulsa el botón "Añadir botella" de esta tarjeta de producto', 'Añadir botella', {
        within: await cardScope(ctx, product),
      });
      await waitForCard(ctx, product, (c) => c.total === 1, '1 unidad en total');
      await ctx.ai.fill('Escribe %nota% en el campo "Nota"', 'Nota', { nota: DATA.notes.outbound });
      assert.equal((await read(ctx.session.page, 'field', 'Nota'))?.value, DATA.notes.outbound);

      const bar = await ctx.ai.observe('Encuentra los botones "Ver el resumen", "Descartar" y "Confirmar"', {
        within: await barScope(ctx),
      });
      const barButtons = ['Ver el resumen', 'Descartar', 'Confirmar'];
      for (const found of bar) {
        const name = await read(ctx.session.page, 'nameAt', found.selector);
        assert.ok(barButtons.includes(name ?? ''), `observe devolvió «${name}», que no es un botón de la barra`);
      }
      for (const name of barButtons) await waitForButtons(ctx, name, 1);

      const { code } = await confirmCapture(
        ctx,
        '¿Confirmar esta salida?',
        'Esto registra 1 producto en el historial de movimientos y mueve 1 unidad — las cajas cuentan según su tamaño.',
      );
      assert.equal(await read(ctx.session.page, 'detail', 'Nota'), DATA.notes.outbound);

      assert.equal(await stockOf(ctx, product), before - 1, 'La existencia no bajó en 1 unidad');

      await goto(ctx.session, '/movements');
      const row = await waitFor(
        `la fila de ${code} en el historial`,
        async () => (await read(ctx.session.page, 'articles')).find((a) => a.code === code),
        (a) => a !== undefined,
        30_000,
      );
      assert.match(row!.text, /\bSalida\b/);
      assert.match(row!.text, /\bconfirmado\b/);
    },
  },
  {
    id: 'RF15-02',
    name: 'Sin productos no aparece la barra Confirmar',
    run: async (ctx) => {
      await goto(ctx.session, OUTBOUND);
      const cards = await pickerReady(ctx, true);
      for (const name of ['Confirmar', 'Descartar', 'Ver el resumen']) await waitForButtons(ctx, name, 0);
      assert.ok(cards.every((c) => c.total === 0), 'Ninguna tarjeta debería tener unidades');

      const read0 = await ctx.ai.extractChecked(
        'De la primera tarjeta de producto del listado extrae: name = el texto de su encabezado (heading), que es el nombre del producto (no la marca); totalUnits = el número de la frase "unidades en total" de esa tarjeta',
        z.object({ name: z.string(), totalUnits: z.number() }),
        (data) =>
          data.name.trim() !== cards[0]!.name
            ? `el nombre de la primera tarjeta no es «${data.name}»`
            : data.totalUnits !== cards[0]!.total
              ? `la primera tarjeta no tiene ${data.totalUnits} unidades en total`
              : null,
      );
      assert.equal(read0.name.trim(), cards[0]!.name);
      assert.equal(read0.totalUnits, 0);

      const product = cards[0]!.name;
      await ctx.ai.click('Pulsa el botón "Añadir botella" de esta tarjeta de producto', 'Añadir botella', {
        within: await cardScope(ctx, product),
      });
      await waitForCard(ctx, product, (c) => c.total === 1, '1 unidad en total');
      await waitForButtons(ctx, 'Confirmar', 1);

      await ctx.ai.click('Pulsa el botón "Quitar botella" de esta tarjeta de producto', 'Quitar botella', {
        within: await cardScope(ctx, product),
      });
      await waitForCard(ctx, product, (c) => c.total === 0, '0 unidades en total');
      for (const name of ['Confirmar', 'Descartar', 'Ver el resumen']) await waitForButtons(ctx, name, 0);
    },
  },
  {
    id: 'RF15-03',
    name: 'Cantidades incorrectas: no baja de cero y el tope es la existencia',
    run: async (ctx) => {
      await goto(ctx.session, OUTBOUND);
      const { name, stock } = await lowestStockProduct(ctx);

      await ctx.ai.click('Pulsa el botón "Quitar botella" de esta tarjeta de producto', 'Quitar botella', {
        within: await cardScope(ctx, name),
      });
      await ctx.ai.click('Pulsa el botón "Quitar caja" de esta tarjeta de producto', 'Quitar caja', {
        within: await cardScope(ctx, name),
      });
      await waitForCard(ctx, name, (c) => c.total === 0, '0 unidades en total');

      const addBottle = await stepper(ctx, name, 'Añadir botella');
      for (let i = 0; i < stock; i++) {
        await ctx.ai.replay(addBottle);
        await waitForCard(ctx, name, (c) => c.total === i + 1, `${i + 1} unidades en total`);
      }

      const capped = await waitForCard(ctx, name, (c) => c.addBottle.disabled, 'el "+" de botella bloqueado');
      assert.equal(capped.total, stock);
      assert.equal(capped.addBottle.disabled, true);
      assert.equal(capped.addCase.disabled, true);
      assert.equal(capped.limit, `Ya tomaste las ${stock} unidades que hay en la bodega de origen.`);
      assert.ok(capped.text.includes(`${stock} en existencia · quedan 0`), capped.text);
    },
  },
  {
    id: 'RF15-04',
    name: 'Inventario insuficiente: botellas y cajas comparten el tope',
    run: async (ctx) => {
      await goto(ctx.session, OUTBOUND);
      const { name, stock } = await lowestStockProduct(ctx);
      const leftover = Math.min(stock, 11);

      const addBottle = await stepper(ctx, name, 'Añadir botella');
      for (let i = 0; i < stock - leftover; i++) {
        await ctx.ai.replay(addBottle);
        await waitForCard(ctx, name, (c) => c.total === i + 1, `${i + 1} unidades en total`);
      }

      const card = await waitForCard(ctx, name, (c) => c.addCase.disabled, 'el "+" de caja bloqueado');
      assert.ok(card.text.includes(`${stock} en existencia · quedan ${leftover}`) || stock === leftover, card.text);
      assert.equal(card.addCase.disabled, true);
      assert.equal(
        card.limit,
        leftover === 1
          ? 'Queda 1 unidad: no alcanza para otra caja, pero sí para botellas sueltas.'
          : `Quedan ${leftover} unidades: no alcanza para otra caja, pero sí para botellas sueltas.`,
      );

      await ctx.ai.click('Abre el selector "Bodega"', 'Bodega', { prefix: true });
      await waitFor('la lista de bodegas', () => read(ctx.session.page, 'options'), (o) => !!o?.includes(DATA.locations.destination));
      await ctx.ai.click(`Elige la opción "${DATA.locations.destination}" de la lista de bodegas`, `${DATA.locations.destination}`);
      await waitFor('Barra E2E elegida', () => read(ctx.session.page, 'combobox', 'Bodega'), (c) => c?.text === DATA.locations.destination);

      const moved = await waitForCard(ctx, name, (c) => c.stock !== null && !c.text.includes(`${stock} en existencia · quedan`), 'la existencia de la otra bodega');
      assert.notEqual(moved.stock, null);
    },
  },
  {
    id: 'RF15-05',
    name: 'Volver del diálogo y Descartar no escriben en el historial',
    run: async (ctx) => {
      const lastCode = await latestMovementCode(ctx);

      await goto(ctx.session, OUTBOUND);
      const [first] = await pickerReady(ctx, true);
      const product = first!.name;
      await ctx.ai.click('Pulsa el botón "Añadir botella" de esta tarjeta de producto', 'Añadir botella', {
        within: await cardScope(ctx, product),
      });
      await waitForCard(ctx, product, (c) => c.total === 1, '1 unidad en total');

      await ctx.ai.click('Pulsa el botón "Confirmar"', 'Confirmar', { within: await barScope(ctx) });
      const confirm = await dialogScope(ctx, '¿Confirmar esta salida?');
      await ctx.ai.click('Pulsa el botón "Volver" del diálogo', 'Volver', { within: confirm });
      await dialogClosed(ctx);
      await waitForCard(ctx, product, (c) => c.total === 1, 'la captura intacta');
      await bodyLacks(ctx, 'Movimiento registrado');

      assert.equal(await latestMovementCode(ctx), lastCode, 'Volver no debería registrar un movimiento');

      await goto(ctx.session, OUTBOUND);
      await pickerReady(ctx, true);
      await waitForCard(ctx, product, (c) => c.total === 1, 'el borrador recuperado');

      await ctx.ai.click('Pulsa el botón "Descartar"', 'Descartar', { within: await barScope(ctx) });
      let discard = await dialogScope(ctx, '¿Descartar lo que capturaste?');
      await ctx.ai.click('Pulsa el botón "Conservarlo" del diálogo', 'Conservarlo', { within: discard });
      await dialogClosed(ctx);
      await waitForCard(ctx, product, (c) => c.total === 1, 'la captura conservada');

      await ctx.ai.click('Pulsa el botón "Descartar"', 'Descartar', { within: await barScope(ctx) });
      discard = await dialogScope(ctx, '¿Descartar lo que capturaste?');
      await ctx.ai.click('Pulsa el botón "Descartar" del diálogo para confirmar el descarte', 'Descartar', { within: discard });
      await bodyHas(ctx, 'Borrador descartado');
      await bodyHas(ctx, 'No se registró nada.');
      await waitForCard(ctx, product, (c) => c.total === 0, '0 unidades en total');
      await waitForButtons(ctx, 'Confirmar', 0);

      assert.equal(await latestMovementCode(ctx), lastCode, 'Descartar no debería registrar un movimiento');
    },
  },
]);
