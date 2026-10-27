import { type Download, type TestInfo } from '@playwright/test';
import { DATA, RECEIPT_FILE_NAME } from './support/data';
import { WRITES_ALLOWED, WRITES_SKIPPED_REASON } from './support/env';
import { expect, test } from './support/fixtures';
import { isPdf, readPdfText } from './support/pdf';

async function expectReceipt(
  download: Download,
  testInfo: TestInfo,
  expected: { code?: string; status?: 'CONFIRMED' | 'CANCELLED' } = {},
) {
  const fileName = download.suggestedFilename();
  expect(fileName).toMatch(RECEIPT_FILE_NAME);
  const code = fileName.replace(/\.pdf$/, '');
  if (expected.code) expect(code).toBe(expected.code);

  const path = testInfo.outputPath(fileName);
  await download.saveAs(path);
  await testInfo.attach(fileName, { path, contentType: 'application/pdf' });

  expect(isPdf(path)).toBe(true);
  const text = readPdfText(path).join(' ');
  expect(text).toContain(code);
  expect(text).toContain('Tipo:');
  expect(text).toMatch(new RegExp(Object.values(DATA.receipt.typeLabels).join('|')));
  expect(text).toContain('Estado:');
  expect(text).toMatch(expected.status ?? /CONFIRMED|CANCELLED/);
  return { code, text };
}

test.describe('RF-21 Comprobante', () => {
  test('Descargar el PDF desde el historial', async ({ page }, testInfo) => {
    await page.goto('/movements');
    const first = page.getByRole('article').first();
    const code = (await first.getByRole('link', { name: /^MOV-/ }).first().innerText()).trim();
    const pdfButton = first.getByRole('button', { name: 'PDF' });
    await expect(pdfButton).toHaveAccessibleDescription(`Descargar ${code} en PDF`);

    const downloadPromise = page.waitForEvent('download');
    await pdfButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(`${code}.pdf`);
    await expectReceipt(download, testInfo, { code });
    await expect(page.getByText('No se pudo descargar el PDF')).toHaveCount(0);
  });

  test('Descargar el PDF desde el detalle', async ({ page }, testInfo) => {
    await page.goto('/movements');
    await page.getByRole('article').first().getByRole('link', { name: 'Detalle' }).click();
    await expect(page).toHaveURL(/\/movements\/[0-9a-f-]{36}$/);
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toHaveText(/^MOV-\d{4}-\d+$/);
    const code = (await title.innerText()).trim();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(`${code}.pdf`);
    await expectReceipt(download, testInfo, { code });
    await expect(page.getByText('No se pudo descargar el PDF')).toHaveCount(0);
  });

  test('Descargar el PDF de un movimiento anulado', async ({ page, ledger }, testInfo) => {
    test.skip(!WRITES_ALLOWED, WRITES_SKIPPED_REASON);

    await page.goto('/movements/new/inbound');
    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('button', { name: 'Añadir botella' }) })
      .first();
    await card.getByRole('button', { name: 'Añadir botella' }).click();
    await expect(card.getByText('1 unidad en total')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();

    await expect(page).toHaveURL(/\/movements\/[0-9a-f-]{36}$/);
    ledger.track(page.url().split('/').pop()!);
    await expect(page.getByText('Movimiento registrado')).toBeVisible();
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toHaveText(/^MOV-\d{4}-\d+$/);
    const code = (await title.innerText()).trim();

    await page.getByRole('button', { name: 'Anular' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Motivo' }).fill(DATA.reasons.cancellation);
    await dialog.getByRole('button', { name: 'Anular' }).click();
    await expect(page.getByText('anulado', { exact: true })).toBeVisible();
    await expect(page.getByText('Anulado el')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(`${code}.pdf`);
    await expectReceipt(download, testInfo, { code, status: 'CANCELLED' });
  });
});
