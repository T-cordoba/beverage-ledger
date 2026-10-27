import { strict as assert } from 'node:assert';
import { z } from 'zod';
import { read, waitFor } from './support/dom.mjs';
import { toNumber } from './support/flows.mjs';
import { currentPath, goto } from './support/session.mjs';
import { defineSuite, type Ctx } from './support/suite.mjs';

const PERIOD = 'Periodo:';
const GROUP = 'Agrupar:';
const SUBTITLE = /Lo que salió de la bodega entre (\S+) y (\S+)\./;

const pressed = async (ctx: Ctx, group: string) =>
  (await read(ctx.session.page, 'segmented', group))?.find((o) => o.pressed)?.name;

const subtitle = async (ctx: Ctx) => SUBTITLE.exec(await read(ctx.session.page, 'text'))?.slice(1, 3).join(' – ');

/** Ranking and tiles once the report for the chosen controls has landed. */
async function settledReport(ctx: Ctx) {
  return waitFor(
    'el reporte cargado',
    async () => ({
      ranking: await read(ctx.session.page, 'section', 'Ranking', 'ranking'),
      empty: (await read(ctx.session.page, 'text')).includes('No se despachó nada en este periodo.'),
      unitsOut: await read(ctx.session.page, 'statTile', 'Unidades despachadas'),
    }),
    (r) => r.unitsOut !== null && (r.empty || (!!r.ranking && r.ranking.items.length > 0)),
    30_000,
  );
}

async function choose(ctx: Ctx, group: string, option: string) {
  await ctx.ai.click(`Pulsa el botón "${option}" del control "${group}"`, option);
  await waitFor(`«${option}» marcado en «${group}»`, () => pressed(ctx, group), (p) => p === option);
}

defineSuite('RF28-consumption', 'RF-28 Generar el reporte de consumo', [
  {
    id: 'RF28-01',
    name: 'Cambiar el periodo y la agrupación actualiza resumen y ranking con cifras coherentes',
    run: async (ctx) => {
      await goto(ctx.session, '/reports');
      await waitFor('el título Consumo', () => read(ctx.session.page, 'h1'), (h) => h === 'Consumo');
      assert.equal(await pressed(ctx, PERIOD), 'Mes');
      assert.equal(await pressed(ctx, GROUP), 'Por producto');
      await settledReport(ctx);
      const monthRange = await subtitle(ctx);

      await choose(ctx, PERIOD, 'Año');
      await waitFor('el rango del año en el subtítulo', () => subtitle(ctx), (s) => !!s && s !== monthRange);
      await choose(ctx, GROUP, 'Por categoría');
      const report = await settledReport(ctx);

      const unitsOut = toNumber(report.unitsOut);
      const read0 = await ctx.ai.extractChecked(
        'Extrae unitsOut = el número de la tarjeta "Unidades despachadas"',
        z.object({ unitsOut: z.number() }),
        (data) => (data.unitsOut === unitsOut ? null : `la tarjeta dice ${unitsOut}, no ${data.unitsOut}`),
      );
      assert.equal(read0.unitsOut, unitsOut);

      if (report.empty) {
        assert.equal(unitsOut, 0, 'Sin ranking, no puede haber unidades despachadas');
        return;
      }
      const values = report.ranking!.items.map((i) => toNumber(i.value));
      assert.ok(values.every((v, i) => i === 0 || values[i - 1]! >= v), `El ranking no va de mayor a menor: ${values}`);
      // Each unit dispatched falls in one category, so the top groups never add up to more than the tile.
      assert.ok(values.reduce((a, b) => a + b, 0) <= unitsOut, `El ranking suma más que las ${unitsOut} unidades despachadas`);
    },
  },
  {
    // Expected to fail while DEF-03 stands: the period lives in component state, not in the URL.
    id: 'RF28-02',
    name: 'El periodo elegido se conserva al volver con el botón atrás (DEF-03)',
    run: async (ctx) => {
      await goto(ctx.session, '/reports');
      await settledReport(ctx);
      await choose(ctx, PERIOD, 'Año');
      const yearRange = await subtitle(ctx);

      await ctx.ai.click('Pulsa el enlace "Existencias" de la navegación principal', 'Existencias');
      await waitFor('llegar a /stock', () => currentPath(ctx.session), (p) => p === '/stock', 20_000);
      await ctx.session.page.evaluate('history.back()');
      await waitFor('volver a /reports', () => currentPath(ctx.session), (p) => p === '/reports', 20_000);
      await settledReport(ctx);

      const now = await pressed(ctx, PERIOD);
      assert.equal(now, 'Año', `Al volver, el periodo marcado es «${now}» y el rango ${await subtitle(ctx)}, no ${yearRange}`);
    },
  },
]);
