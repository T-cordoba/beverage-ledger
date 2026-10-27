import { strict as assert } from 'node:assert';
import { copyFileSync } from 'node:fs';
import { z } from 'zod';
import { read, waitFor } from './support/dom.mjs';
import { runPath } from './support/env.mjs';
import { log } from './support/evidence.mjs';
import {
  DATA,
  MOVEMENT_CODE,
  bodyLacks,
  dialogScope,
  registerOwnInbound,
} from './support/flows.mjs';
import { forgetDownload, isPdf, readPdfText, waitForDownload } from './support/pdf.mjs';
import { goto } from './support/session.mjs';
import { defineSuite, type Ctx } from './support/suite.mjs';

/**
 * Waits for Chrome to save `<code>.pdf` and checks it is a real receipt of that
 * movement: PDF signature, the code, the type and the status inside its text.
 */
async function expectReceipt(ctx: Ctx, code: string, status?: 'CONFIRMED' | 'CANCELLED') {
  const fileName = `${code}.pdf`;
  assert.match(fileName, new RegExp(DATA.receipt.fileName));
  const path = await waitForDownload(ctx.session.downloads, fileName);
  assert.equal(isPdf(path), true, `${fileName} no es un PDF válido`);

  const text = readPdfText(path).join(' ');
  assert.ok(text.includes(code), `El PDF no menciona ${code}`);
  assert.ok(text.includes('Tipo:'), 'El PDF no indica el tipo');
  assert.match(text, new RegExp(DATA.receipt.typeLabels.join('|')));
  assert.ok(text.includes('Estado:'), 'El PDF no indica el estado');
  assert.match(text, status ? new RegExp(status) : /CONFIRMED|CANCELLED/);
  await bodyLacks(ctx, 'No se pudo descargar el PDF');
  copyFileSync(path, runPath('comprobantes', fileName));
  log(`    PDF verificado: ${fileName} (${text.slice(0, 120)}…)`);
}

defineSuite('RF21-receipt', 'RF-21 Descarga del comprobante PDF', [
  {
    id: 'RF21-01',
    name: 'Descargar el PDF desde el historial',
    run: async (ctx) => {
      await goto(ctx.session, '/movements');
      const [first] = await waitFor('el historial', () => read(ctx.session.page, 'articles'), (a) => a.length > 0 && MOVEMENT_CODE.test(a[0]!.code), 30_000);
      const code = first!.code;
      assert.match(code, MOVEMENT_CODE);
      assert.equal(first!.pdf?.description, `Descargar ${code} en PDF`);

      const { code: seen } = await ctx.ai.extractChecked(
        'Extrae el código del primer movimiento de la lista del historial',
        z.object({ code: z.string() }),
        (data) => (data.code.trim() === code ? null : `el primer movimiento no es «${data.code}»`),
      );
      assert.equal(seen.trim(), code, 'La IA leyó otro movimiento como el primero');

      forgetDownload(ctx.session.downloads, `${code}.pdf`);
      await read(ctx.session.page, 'tagArticle', code, 'fila');
      await ctx.ai.click('Pulsa el botón "PDF" de esta fila del historial', 'PDF', {
        within: ctx.session.page.locator('[data-sh-article="fila"]'),
      });
      await expectReceipt(ctx, code);
    },
  },
  {
    id: 'RF21-02',
    name: 'Descargar el PDF desde el detalle',
    run: async (ctx) => {
      await goto(ctx.session, '/movements');
      const [first] = await waitFor('el historial', () => read(ctx.session.page, 'articles'), (a) => a.length > 0 && MOVEMENT_CODE.test(a[0]!.code), 30_000);
      await read(ctx.session.page, 'tagArticle', first!.code, 'fila');
      await ctx.ai.click('Pulsa el enlace "Detalle" de esta fila del historial', 'Detalle', {
        within: ctx.session.page.locator('[data-sh-article="fila"]'),
      });
      const code = await waitFor('el detalle', () => read(ctx.session.page, 'h1'), (h) => MOVEMENT_CODE.test(h), 20_000);
      assert.equal(code, first!.code);

      forgetDownload(ctx.session.downloads, `${code}.pdf`);
      const pdf = await ctx.ai.resolve('Encuentra el botón para descargar el comprobante PDF de este movimiento', 'PDF');
      await ctx.ai.replay(pdf);
      await expectReceipt(ctx, code);
    },
  },
  {
    id: 'RF21-03',
    name: 'Descargar el PDF de un movimiento anulado',
    run: async (ctx) => {
      const { code } = await registerOwnInbound(ctx);

      await ctx.ai.click('Pulsa el botón "Anular" del movimiento', 'Anular');
      const dialog = await dialogScope(ctx, `¿Anular ${code}?`);
      await ctx.ai.fill('Escribe %motivo% en el campo "Motivo" del diálogo', 'Motivo', { motivo: DATA.reasons.cancellation }, { within: dialog });
      await ctx.ai.click('Pulsa el botón "Anular" dentro del diálogo para confirmar la anulación', 'Anular', { within: dialog });
      await waitFor('la fecha de anulación', () => read(ctx.session.page, 'detail', 'Anulado el'), Boolean);
      assert.match(await read(ctx.session.page, 'text'), /\banulado\b/);

      forgetDownload(ctx.session.downloads, `${code}.pdf`);
      await ctx.ai.click('Pulsa el botón "PDF" para descargar el comprobante del movimiento', 'PDF');
      await expectReceipt(ctx, code, 'CANCELLED');
    },
  },
]);
