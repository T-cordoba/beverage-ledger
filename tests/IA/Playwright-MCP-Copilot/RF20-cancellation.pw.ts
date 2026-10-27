import { type Page } from '@playwright/test';
import { DATA } from './support/data';
import { WRITES_ALLOWED, WRITES_SKIPPED_REASON } from './support/env';
import { expect, test } from './support/fixtures';

type Ledger = { track: (movementId: string) => void };

async function registerOwnInbound(page: Page, ledger: Ledger) {
  await page.goto('/movements/new/inbound');
  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: 'Añadir botella' }) })
    .first();
  const productName = (await card.getByRole('heading', { level: 3 }).innerText()).trim();
  await card.getByRole('button', { name: 'Añadir botella' }).click();
  await expect(card.getByText('1 unidad en total')).toBeVisible();

  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();

  await expect(page).toHaveURL(/\/movements\/[0-9a-f-]{36}$/);
  ledger.track(page.url().split('/').pop()!);
  await expect(page.getByText('Movimiento registrado')).toBeVisible();
  const code = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
  expect(code).toMatch(/^MOV-\d{4}-\d+$/);

  await page.goto('/movements');
  await page.getByRole('searchbox', { name: 'Buscar movimientos por código' }).fill(code);
  await page
    .getByRole('article')
    .filter({ hasText: code })
    .first()
    .getByRole('link', { name: 'Detalle' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: code })).toBeVisible();
  return { code, productName };
}

async function readStock(page: Page, productName: string) {
  await page.goto('/stock');
  const row = page.getByRole('row').filter({ hasText: productName }).first();
  const text = await row.getByText(/^\d+ unidades?$/).innerText();
  return Number(/^(\d+)/.exec(text)![1]);
}

test.describe('RF-20 Anulación', () => {
  test('Conservarlo cancela la anulación', async ({ page, ledger }) => {
    test.skip(!WRITES_ALLOWED, WRITES_SKIPPED_REASON);

    const { code } = await registerOwnInbound(page, ledger);
    await expect(page.getByText('confirmado', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Anular' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: `¿Anular ${code}?` })).toBeVisible();
    await expect(
      dialog.getByText(/Lo que este movimiento tomó de las existencias vuelve/),
    ).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: 'Motivo' })).toHaveAttribute(
      'placeholder',
      '¿Por qué se anula?',
    );

    await dialog.getByRole('button', { name: 'Conservarlo' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('confirmado', { exact: true })).toBeVisible();
    await expect(page.getByText('anulado', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Movimiento anulado')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Anular' })).toBeVisible();
  });

  test('Motivo obligatorio al anular', async ({ page, ledger }) => {
    test.skip(!WRITES_ALLOWED, WRITES_SKIPPED_REASON);

    const { code } = await registerOwnInbound(page, ledger);

    await page.getByRole('button', { name: 'Anular' }).click();
    const dialog = page.getByRole('dialog');
    const reason = dialog.getByRole('textbox', { name: 'Motivo' });
    const submit = dialog.getByRole('button', { name: 'Anular' });
    await expect(dialog.getByRole('heading', { name: `¿Anular ${code}?` })).toBeVisible();

    await submit.click();
    await expect(dialog.getByText('Este campo no puede quedar vacío.')).toBeVisible();
    await expect(reason).toHaveAttribute('aria-invalid', 'true');

    await reason.fill(DATA.reasons.blank);
    await submit.click();
    await expect(dialog.getByText('Este campo no puede quedar vacío.')).toBeVisible();

    expect(DATA.reasons.tooShort.length).toBeLessThan(DATA.minReasonLength);
    await reason.fill(DATA.reasons.tooShort);
    await submit.click();
    await expect(
      dialog.getByText(`Escribe al menos ${DATA.minReasonLength} caracteres.`),
    ).toBeVisible();

    await expect(dialog).toBeVisible();
    await expect(page.getByText('Movimiento anulado')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Conservarlo' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('confirmado', { exact: true })).toBeVisible();
    await expect(page.getByText('anulado', { exact: true })).toHaveCount(0);
  });

  test('Anular con motivo válido', async ({ page, ledger }) => {
    test.skip(!WRITES_ALLOWED, WRITES_SKIPPED_REASON);

    const stockBefore = await readStock(page, await firstInboundProductName(page));
    const { code, productName } = await registerOwnInbound(page, ledger);
    expect(await readStock(page, productName)).toBe(stockBefore + 1);

    await page.goto('/movements');
    await page.getByRole('searchbox', { name: 'Buscar movimientos por código' }).fill(code);
    await page
      .getByRole('article')
      .filter({ hasText: code })
      .first()
      .getByRole('link', { name: 'Detalle' })
      .click();
    await expect(page.getByText('confirmado', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Anular' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Motivo' }).fill(DATA.reasons.cancellation);
    await dialog.getByRole('button', { name: 'Anular' }).click();

    await expect(page.getByText('Movimiento anulado')).toBeVisible();
    await expect(page.getByText(`${code} se revirtió y las existencias volvieron.`)).toBeVisible();
    await expect(page.getByText('anulado', { exact: true })).toBeVisible();
    await expect(page.getByText('Anulado el')).toBeVisible();
    await expect(page.getByText('confirmado', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Anular' })).toHaveCount(0);

    expect(await readStock(page, productName)).toBe(stockBefore);
  });
});

async function firstInboundProductName(page: Page) {
  await page.goto('/movements/new/inbound');
  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: 'Añadir botella' }) })
    .first();
  return (await card.getByRole('heading', { level: 3 }).innerText()).trim();
}
