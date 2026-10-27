// spec: agents/plan-pruebas.md
// seed: seed.spec.ts

import { DATA } from './support/data';
import { WRITES_ALLOWED, WRITES_SKIPPED_REASON } from './support/env';
import { expect, test } from './support/fixtures';

// The default location is shown as "Bodega principal (por defecto)" in the pickers.
const SOURCE_OPTION = DATA.locations.source;

test.describe('RF-17 Traspaso', () => {
  test('Origen y destino obligatorios', async ({ page }) => {
    // 1. Ir a /movements/new/transfer: los selectores 'Desde' y 'Hacia' están vacíos. Añadir 1 botella de un producto.
    await page.goto('/movements/new/transfer');
    const from = page.getByRole('combobox', { name: 'Desde' });
    const to = page.getByRole('combobox', { name: 'Hacia' });
    await expect(from).toContainText('Elige un origen');
    await expect(to).toContainText('Elige un destino');
    await page.getByRole('button', { name: 'Añadir botella' }).first().click();

    // La barra aparece, pero Confirmar queda bloqueado (aria-disabled) y no hay mensaje de validación.
    const confirm = page.getByRole('button', { name: 'Confirmar', exact: true });
    await expect(page.getByRole('button', { name: 'Ver el resumen' })).toBeVisible();
    await expect(confirm).toBeDisabled();

    // 2. Elegir solo 'Desde' y comprobar la confirmación.
    await expect(from).toBeEnabled();
    await from.click();
    await page.getByRole('option', { name: SOURCE_OPTION }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(from).toContainText(SOURCE_OPTION);
    await expect(confirm).toBeDisabled();

    // Al elegir también 'Hacia' la confirmación se habilita.
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

    // 1. Elegir 'Desde' = bodega por defecto y abrir 'Hacia'.
    await expect(from).toBeEnabled();
    await from.click();
    await page.getByRole('option', { name: SOURCE_OPTION }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(to).toBeEnabled();
    await to.click();

    // La bodega de origen no se ofrece como destino; la otra sí.
    const destinationList = page.getByRole('listbox');
    await expect(destinationList.getByRole('option', { name: DATA.locations.destination })).toBeVisible();
    await expect(destinationList.getByRole('option', { name: SOURCE_OPTION })).toHaveCount(0);

    // 2. Elegir 'Hacia' = 'Barra E2E' y luego intentar cambiar 'Desde' a 'Barra E2E'.
    await destinationList.getByRole('option', { name: DATA.locations.destination }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(to).toContainText(DATA.locations.destination);
    await from.click();

    // La simetría también se cumple: el destino elegido no se ofrece como origen,
    // así que origen = destino es una combinación inalcanzable.
    const sourceList = page.getByRole('listbox');
    await expect(sourceList.getByRole('option', { name: SOURCE_OPTION })).toBeVisible();
    await expect(sourceList.getByRole('option', { name: DATA.locations.destination })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(from).toContainText(SOURCE_OPTION);
    await expect(to).toContainText(DATA.locations.destination);
  });

  test('Registrar un traspaso y verificar las dos puntas', async ({ page, ledger }) => {
    test.skip(!WRITES_ALLOWED, WRITES_SKIPPED_REASON);

    // 1. Desde la bodega por defecto Hacia 'Barra E2E', añadir 1 botella, 'Confirmar' y confirmar en '¿Confirmar este traspaso?'.
    const from = page.getByRole('combobox', { name: 'Desde' });
    const to = page.getByRole('combobox', { name: 'Hacia' });
    const chooseEnds = async () => {
      await page.goto('/movements/new/transfer');
      await expect(from).toBeEnabled();
      await from.click();
      await page.getByRole('option', { name: SOURCE_OPTION }).click();
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await expect(to).toBeEnabled();
      await to.click();
      await page.getByRole('option', { name: DATA.locations.destination }).click();
      await expect(page.getByRole('listbox')).toHaveCount(0);
    };
    const unitsAt = (n: number) => new RegExp(`(^|\\D)${n} unidad`);

    await chooseEnds();
    const firstName = (
      await page
        .getByRole('listitem')
        .filter({ has: page.getByRole('button', { name: 'Añadir botella' }) })
        .first()
        .getByRole('heading', { level: 3 })
        .innerText()
    ).trim();

    // The destination no longer starts empty: read its balance before moving anything.
    await page.goto('/stock');
    await page.getByRole('searchbox', { name: 'Buscar existencias por producto' }).fill(firstName);
    const balanceRow = page
      .getByRole('row')
      .filter({ has: page.getByRole('link', { name: firstName, exact: true }) });
    await page.getByRole('combobox', { name: 'Filtrar por bodega' }).click();
    await page.getByRole('option', { name: DATA.locations.destination }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(balanceRow).toContainText(/\d+ unidad/);
    const destinationBefore = Number(/(\d+) unidad/.exec(await balanceRow.innerText())![1]);

    await chooseEnds();

    // Primer producto con 'Añadir botella' habilitado; su existencia en el origen es el tope.
    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('button', { name: 'Añadir botella' }) })
      .first();
    const productName = (await card.getByRole('heading', { level: 3 }).innerText()).trim();
    await expect(card.getByText(/\d+ en existencia/)).toBeVisible();
    const sourceBefore = Number(
      ((await card.getByText(/\d+ en existencia/).innerText()).match(/(\d+) en existencia/) ?? [])[1],
    );
    expect(sourceBefore).toBeGreaterThan(0);
    expect(productName).toBe(firstName);

    await card.getByRole('button', { name: 'Añadir botella' }).click();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: '¿Confirmar este traspaso?' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Movimiento registrado')).toBeVisible();

    // 2. Abrir el detalle del movimiento.
    await expect(page).toHaveURL(/\/movements\/[0-9a-f-]{36}$/);
    ledger.track(page.url().split('/').pop()!);
    await expect(page.getByRole('heading', { level: 1, name: /^MOV-\d{4}-\d{6}$/ })).toBeVisible();
    await expect(page.getByText('Traspaso', { exact: true })).toBeVisible();
    await expect(page.getByText('confirmado', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Líneas (2)' })).toBeVisible();
    await expect(page.getByText('-1 unidad base', { exact: true })).toBeVisible();
    await expect(page.getByText('1 unidad base', { exact: true })).toBeVisible();

    // El total no cambia: /stock por bodega refleja -1 en el origen y +1 en el destino.
    await page.goto('/stock');
    await page.getByRole('searchbox', { name: 'Buscar existencias por producto' }).fill(productName);
    const row = page
      .getByRole('row')
      .filter({ has: page.getByRole('link', { name: productName, exact: true }) });
    const locationFilter = page.getByRole('combobox', { name: 'Filtrar por bodega' });

    await locationFilter.click();
    await page.getByRole('option', { name: DATA.locations.destination }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(row).toContainText(unitsAt(destinationBefore + 1));

    await locationFilter.click();
    await page.getByRole('option', { name: SOURCE_OPTION }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(row).toContainText(unitsAt(sourceBefore - 1));
  });

  test('Cantidades del traspaso topadas por el origen', async ({ page }) => {
    // 1. Elegir origen y añadir botellas hasta el tope; intentar quitar por debajo de cero.
    await page.goto('/movements/new/transfer');
    const from = page.getByRole('combobox', { name: 'Desde' });
    await expect(from).toBeEnabled();
    await from.click();
    await page.getByRole('option', { name: SOURCE_OPTION }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);

    // Producto de la primera página con la menor existencia que aún admite una caja:
    // el tope se alcanza con pocos clics y se ve que cajas y botellas gastan el mismo stock.
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

    // El tope se calcula sobre unidades base: ni botellas ni cajas pasan de la existencia.
    await expect(card.getByText(`${stock} unidades en total`, { exact: true })).toBeVisible();
    await expect(card.getByText(/quedan 0/)).toBeVisible();
    await expect(addBottle).toBeDisabled();
    await expect(addCase).toBeDisabled();
    // The cap is now said in the card itself (a polite live region), not in a tooltip.
    await expect(
      card.getByText(`Ya tomaste las ${stock} unidades que hay en la bodega de origen.`),
    ).toBeVisible();

    // Quitar todo y una vez más: el contador no baja de cero y la barra desaparece.
    for (let i = 0; i < bottles; i++) await removeBottle.click();
    for (let i = 0; i < cases; i++) await removeCase.click();
    await removeBottle.click();
    await removeCase.click();
    await expect(card.getByText('0 unidades en total', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar', exact: true })).toHaveCount(0);
  });
});
