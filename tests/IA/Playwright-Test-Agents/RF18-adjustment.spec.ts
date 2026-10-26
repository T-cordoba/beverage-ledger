// spec: agents/plan-pruebas.md
// seed: seed.spec.ts

import { DATA } from './support/data';
import { WRITES_ALLOWED, WRITES_SKIPPED_REASON } from './support/env';
import { expect, test } from './support/fixtures';

test.describe('RF-18 Ajuste', () => {
  test('Motivo obligatorio de al menos 4 caracteres', async ({ page }) => {
    // 1. Ir a /movements/new/adjustment, añadir una cantidad con signo a un producto y dejar 'Motivo' vacío.
    await page.goto('/movements/new/adjustment');
    await expect(page.getByRole('heading', { name: 'Registrar un ajuste' })).toBeVisible();

    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('button', { name: 'Quitar botella' }) })
      .first();
    const reason = page.getByRole('textbox', { name: 'Motivo' });
    const confirm = page.getByRole('button', { name: 'Confirmar', exact: true });

    // Cantidad inválida: con 0 unidades no hay barra y por tanto nada que confirmar.
    await expect(card.getByText('0 unidades en total')).toBeVisible();
    await expect(confirm).toHaveCount(0);

    await card.getByRole('button', { name: 'Quitar botella' }).click();
    await expect(card.getByText('-1 unidad en total')).toBeVisible();
    await expect(confirm).toBeVisible();

    // La UI no pinta 'Un ajuste necesita un motivo…': bloquea el botón (aria-disabled).
    await expect(reason).toHaveValue('');
    await expect(confirm).toBeDisabled();

    // 2. Escribir 'ab' (menos de 4 caracteres) en 'Motivo'.
    await reason.fill(DATA.reasons.tooShort);
    await reason.blur();
    await expect(page.getByText(`Escribe al menos ${DATA.minReasonLength} caracteres.`)).toBeVisible();
    await expect(reason).toHaveAttribute('aria-invalid', 'true');
    await expect(confirm).toBeDisabled();

    // 3. Escribir un motivo de 4 espacios.
    await reason.fill(DATA.reasons.blank);
    await reason.blur();
    await expect(page.getByText('Este campo no puede quedar vacío.')).toBeVisible();
    await expect(confirm).toBeDisabled();

    // Un motivo válido desbloquea la confirmación.
    await reason.fill(DATA.reasons.adjustment);
    await expect(confirm).toBeEnabled();

    // Cantidad vuelta a 0: desaparece la barra.
    await card.getByRole('button', { name: 'Añadir botella' }).click();
    await expect(card.getByText('0 unidades en total')).toBeVisible();
    await expect(confirm).toHaveCount(0);
  });

  test('Registrar un ajuste con motivo válido', async ({ page, ledger }) => {
    test.skip(!WRITES_ALLOWED, WRITES_SKIPPED_REASON);

    // Existencia previa del primer producto, para comprobar el -1 al final.
    await page.goto('/stock');
    const firstStockRow = page.getByRole('row').filter({ has: page.getByRole('link') }).first();
    const productName = (await firstStockRow.getByRole('link').first().innerText()).trim();
    const beforeText = await firstStockRow.getByText(/^\d+ unidades?$/).innerText();
    const before = Number(/^(\d+)/.exec(beforeText)![1]);

    // 1. Cantidad -1 en un producto, motivo 'Rotura de botella', 'Confirmar' y confirmar en '¿Confirmar este ajuste?'.
    await page.goto('/movements/new/adjustment');
    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('button', { name: 'Quitar botella' }) })
      .first();
    await expect(card.getByRole('heading', { level: 3, name: productName })).toBeVisible();
    await card.getByRole('button', { name: 'Quitar botella' }).click();
    await expect(card.getByText('-1 unidad en total')).toBeVisible();

    await page.getByRole('textbox', { name: 'Motivo' }).fill(DATA.reasons.adjustment);
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: '¿Confirmar este ajuste?' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirmar' }).click();

    // Toast 'Movimiento registrado'
    await expect(page).toHaveURL(/\/movements\/[0-9a-f-]{36}$/);
    ledger.track(page.url().split('/').pop()!);
    await expect(page.getByText('Movimiento registrado')).toBeVisible();
    await expect(
      page.getByText(/MOV-\d{4}-\d+ se confirmó y se aplicó a las existencias\./),
    ).toBeVisible();

    // En el detalle se ve 'Motivo: Rotura de botella' y la cantidad con signo
    const code = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
    expect(code).toMatch(/^MOV-\d{4}-\d+$/);
    await expect(page.getByText('Ajuste', { exact: true })).toBeVisible();
    await expect(page.getByText('confirmado', { exact: true })).toBeVisible();
    await expect(page.getByText('Motivo', { exact: true })).toBeVisible();
    await expect(page.getByText(DATA.reasons.adjustment, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Líneas (1)' })).toBeVisible();
    await expect(page.getByText('-1 unidad base')).toBeVisible();
    await expect(page.getByText('-1 botella', { exact: true })).toBeVisible();

    // la existencia baja en 1
    await page.goto('/stock');
    const stockRow = page.getByRole('row').filter({ hasText: productName }).first();
    await expect(stockRow.getByText(`${before - 1} unidades`)).toBeVisible();
  });
});
