import { type Page } from '@playwright/test';
import { DATA } from './support/data';
import { WRITES_ALLOWED, WRITES_SKIPPED_REASON } from './support/env';
import { expect, test } from './support/fixtures';

const SOURCE_OPTION = DATA.locations.source;

async function getLocationTotal(page: Page, productName: string, locationLabel: string) {
  await page.goto('/stock');
  await page.getByRole('searchbox', { name: 'Buscar existencias por producto' }).fill(productName);
  const locationFilter = page.getByRole('combobox', { name: 'Filtrar por bodega' });
  await locationFilter.click();
  await page.getByRole('option', { name: locationLabel }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name: productName, exact: true }) })
    .first();
  const text = await row.innerText();
  const match = text.match(/(\d+)\s*unidades?/);
  expect(match, `saldo visible de ${productName} en ${locationLabel}`).not.toBeNull();
  return Number(match![1]);
}

test.describe('RF-17 Traspaso', () => {
  test('Origen y destino obligatorios', async ({ page }) => {
    await page.goto('/movements/new/transfer');
    const from = page.getByRole('combobox', { name: 'Desde' });
    const to = page.getByRole('combobox', { name: 'Hacia' });
    await expect(from).toContainText('Elige un origen');
    await expect(to).toContainText('Elige un destino');
    await page.getByRole('button', { name: 'Añadir botella' }).first().click();

    const confirm = page.getByRole('button', { name: 'Confirmar', exact: true });
    await expect(page.getByRole('button', { name: 'Ver el resumen' })).toBeVisible();
    await expect(confirm).toBeDisabled();

    await expect(from).toBeEnabled();
    await from.click();
    await page.getByRole('option', { name: SOURCE_OPTION }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(from).toContainText(SOURCE_OPTION);
    await expect(confirm).toBeDisabled();

    await expect(to).toBeEnabled();
    await to.click();
    await page.getByRole('option', { name: DATA.locations.destination }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(confirm).toBeEnabled();
  });

  test('El destino excluye al origen', async ({ page }) => {
    await page.goto('/movements/new/transfer');
    const from = page.getByRole('combobox', { name: 'Desde' });
    const to = page.getByRole('combobox', { name: 'Hacia' });

    await expect(from).toBeEnabled();
    await from.click();
    await page.getByRole('option', { name: SOURCE_OPTION }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(to).toBeEnabled();
    await to.click();

    const destinationList = page.getByRole('listbox');
    await expect(
      destinationList.getByRole('option', { name: DATA.locations.destination }),
    ).toBeVisible();
    await expect(destinationList.getByRole('option', { name: SOURCE_OPTION })).toHaveCount(0);

    await destinationList.getByRole('option', { name: DATA.locations.destination }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(to).toContainText(DATA.locations.destination);
    await from.click();

    const sourceList = page.getByRole('listbox');
    await expect(sourceList.getByRole('option', { name: SOURCE_OPTION })).toBeVisible();
    await expect(sourceList.getByRole('option', { name: DATA.locations.destination })).toHaveCount(
      0,
    );
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(from).toContainText(SOURCE_OPTION);
    await expect(to).toContainText(DATA.locations.destination);
  });

  test('Registrar un traspaso y verificar las dos puntas', async ({ page, ledger }) => {
    test.skip(!WRITES_ALLOWED, WRITES_SKIPPED_REASON);

    await page.goto('/stock');
    const firstStockRow = page
      .getByRole('row')
      .filter({ has: page.getByRole('link') })
      .first();
    const productName = (await firstStockRow.getByRole('link').first().innerText()).trim();
    const sourceBefore = await getLocationTotal(page, productName, SOURCE_OPTION);
    const destinationBefore = await getLocationTotal(page, productName, DATA.locations.destination);

    await page.goto('/movements/new/transfer');
    const from = page.getByRole('combobox', { name: 'Desde' });
    const to = page.getByRole('combobox', { name: 'Hacia' });
    await expect(from).toBeEnabled();
    await from.click();
    await page.getByRole('option', { name: SOURCE_OPTION }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(to).toBeEnabled();
    await to.click();
    await page.getByRole('option', { name: DATA.locations.destination }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);

    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { level: 3, name: productName, exact: true }) });
    const sourceText = card.getByText(/\d+ en existencia/);
    await expect(sourceText).toBeVisible();
    const displayedSourceStock = Number(
      (await sourceText.innerText()).match(/(\d+) en existencia/)![1],
    );
    expect(displayedSourceStock).toBe(sourceBefore);
    expect(sourceBefore).toBeGreaterThan(0);

    await card.getByRole('button', { name: 'Añadir botella' }).click();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: '¿Confirmar este traspaso?' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Movimiento registrado')).toBeVisible();

    await expect(page).toHaveURL(/\/movements\/[0-9a-f-]{36}$/);
    ledger.track(page.url().split('/').pop()!);
    await expect(page.getByRole('heading', { level: 1, name: /^MOV-\d{4}-\d{6}$/ })).toBeVisible();
    await expect(page.getByText('Traspaso', { exact: true })).toBeVisible();
    await expect(page.getByText('confirmado', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Líneas (2)' })).toBeVisible();
    await expect(page.getByText('-1 unidad base', { exact: true })).toBeVisible();
    await expect(page.getByText('1 unidad base', { exact: true })).toBeVisible();

    const destinationTotal = await getLocationTotal(page, productName, DATA.locations.destination);
    expect(destinationTotal).toBeGreaterThanOrEqual(1);
    expect(destinationTotal).toBe(destinationBefore + 1);

    const originTotal = await getLocationTotal(page, productName, SOURCE_OPTION);
    expect(originTotal).toBe(sourceBefore - 1);
  });

  test('Cantidades del traspaso topadas por el origen', async ({ page }) => {
    await page.goto('/movements/new/transfer');
    const from = page.getByRole('combobox', { name: 'Desde' });
    await expect(from).toBeEnabled();
    await from.click();
    await page.getByRole('option', { name: SOURCE_OPTION }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);

    const stockLines = page.getByText(/^\d+ en existencia$/);
    await expect(stockLines).toHaveCount(10);
    const cards = await page
      .getByRole('listitem')
      .filter({ has: page.getByRole('button', { name: 'Añadir caja' }) })
      .all();
    let productName = '';
    let stock = Infinity;
    for (const candidate of cards) {
      const text = await candidate.getByText(/^\d+ en existencia$/).innerText();
      const units = Number(text.match(/(\d+) en existencia/)![1]);
      if (units >= 12 && units < stock) {
        stock = units;
        productName = (await candidate.getByRole('heading', { level: 3 }).innerText()).trim();
      }
    }
    expect(productName).not.toBe('');

    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: productName, exact: true }) });
    const addBottle = card.getByRole('button', { name: 'Añadir botella' });
    const addCase = card.getByRole('button', { name: 'Añadir caja' });
    const removeBottle = card.getByRole('button', { name: 'Quitar botella' });
    const removeCase = card.getByRole('button', { name: 'Quitar caja' });

    const cases = Math.floor(stock / 12);
    const bottles = stock % 12;
    for (let i = 0; i < cases; i++) await addCase.click();
    for (let i = 0; i < bottles; i++) await addBottle.click();

    await expect(card.getByText(`${stock} unidades en total`, { exact: true })).toBeVisible();
    await expect(card.getByText(/quedan 0/)).toBeVisible();
    await expect(addBottle).toBeDisabled();
    await expect(addBottle).toHaveAttribute('title', 'Solo quedan 0 en esta bodega');
    await expect(addCase).toBeDisabled();
    await expect(addCase).toHaveAttribute('title', 'Solo quedan 0 en esta bodega');

    for (let i = 0; i < bottles; i++) await removeBottle.click();
    for (let i = 0; i < cases; i++) await removeCase.click();
    await removeBottle.click();
    await removeCase.click();
    await expect(card.getByText('0 unidades en total', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar', exact: true })).toHaveCount(0);
  });
});
