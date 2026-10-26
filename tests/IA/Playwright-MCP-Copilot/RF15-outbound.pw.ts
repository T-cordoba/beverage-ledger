import { WRITES_ALLOWED, WRITES_SKIPPED_REASON } from './support/env';
import { expect, test } from './support/fixtures';

test.describe('RF-15 Salida', () => {
  test('Registrar una salida correcta', async ({ page, ledger }) => {
    test.skip(!WRITES_ALLOWED, WRITES_SKIPPED_REASON);

    await page.goto('/movements/new/outbound');
    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('button', { name: 'Añadir botella' }) })
      .first();
    const productName = (await card.getByRole('heading', { level: 3 }).innerText()).trim();
    const stockText = await card.getByText(/\d+ en existencia/).innerText();
    const before = Number(/(\d+) en existencia/.exec(stockText)![1]);

    await card.getByRole('button', { name: 'Añadir botella' }).click();
    await page.getByRole('textbox', { name: 'Nota' }).fill('Salida E2E');

    await expect(card.getByText('1 unidad en total')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver el resumen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Descartar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible();

    await page.getByRole('button', { name: 'Confirmar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: '¿Confirmar esta salida?' })).toBeVisible();
    await expect(
      dialog.getByText(
        'Esto escribe 1 producto en el ledger y mueve 1 unidad — las cajas cuentan según su tamaño.',
      ),
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page).toHaveURL(/\/movements\/[0-9a-f-]{36}$/);
    ledger.track(page.url().split('/').pop()!);
    await expect(page.getByText('Movimiento registrado')).toBeVisible();
    await expect(page.getByText(/MOV-\d{4}-\d+ se confirmó y se aplicó a las existencias\./)).toBeVisible();
    const code = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
    expect(code).toMatch(/^MOV-\d{4}-\d+$/);

    await page.goto('/stock');
    const row = page.getByRole('row').filter({ hasText: productName }).first();
    await expect(row.getByText(`${before - 1} unidades`)).toBeVisible();

    await page.goto('/movements');
    const latest = page.getByRole('article').filter({ hasText: code });
    await expect(latest.getByText('Salida', { exact: true })).toBeVisible();
    await expect(latest.getByText('confirmado')).toBeVisible();
  });

  test('Sin productos no aparece la barra Confirmar', async ({ page }) => {
    await page.goto('/movements/new/outbound');
    await expect(page.getByRole('searchbox', { name: 'Buscar productos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Añadir botella' }).first()).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Confirmar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Descartar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver el resumen' })).toHaveCount(0);
    const cards = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('button', { name: 'Añadir botella' }) });
    await expect(cards.first().getByText('0 unidades en total')).toBeVisible();
    await expect(page.getByText(/^[1-9]\d* unidades? en total$/)).toHaveCount(0);

    const card = cards.first();
    await card.getByRole('button', { name: 'Añadir botella' }).click();
    await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible();
    await card.getByRole('button', { name: 'Quitar botella' }).click();
    await expect(page.getByRole('button', { name: 'Confirmar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Descartar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver el resumen' })).toHaveCount(0);
  });

  test('Cantidades incorrectas: quitar por debajo de cero y tope del stepper', async ({ page }) => {
    await page.goto('/movements/new/outbound');

    const stockLabels = page.getByText(/^\d+ en existencia$/);
    await expect(stockLabels.first()).toBeVisible();

    const cards = page.getByRole('listitem').filter({ hasText: 'en existencia' });
    const names = await cards.getByRole('heading', { level: 3 }).allTextContents();
    const stocks = (await stockLabels.allTextContents()).map((text) => Number.parseInt(text, 10));
    const lowest = stocks.indexOf(Math.min(...stocks));
    const name = names[lowest];
    const stock = stocks[lowest];

    const card = cards.filter({ has: page.getByRole('heading', { name, exact: true }) });
    const removeBottle = card.getByRole('button', { name: 'Quitar botella' });
    const removeCase = card.getByRole('button', { name: 'Quitar caja' });
    const addBottle = card.getByRole('button', { name: 'Añadir botella' });
    const addCase = card.getByRole('button', { name: 'Añadir caja' });

    if (await removeBottle.isEnabled()) await removeBottle.click();
    if (await removeCase.isEnabled()) await removeCase.click();
    await expect(card.getByText('0 unidades en total')).toBeVisible();

    for (let i = 0; i < stock; i++) {
      await addBottle.click();
    }

    await expect(card.getByText(`${stock} unidades en total`)).toBeVisible();
    await expect(addBottle).toBeDisabled();
    await expect(addBottle).toHaveAttribute('title', 'Solo quedan 0 en esta bodega');
    await expect(addCase).toBeDisabled();
    await expect(addCase).toHaveAttribute('title', 'Solo quedan 0 en esta bodega');
    await expect(card.getByText(`${stock} en existencia · quedan 0`)).toBeVisible();
  });

  test('Inventario insuficiente por tope compartido botellas/cajas', async ({ page }) => {
    await page.goto('/movements/new/outbound');

    const stockLabels = page.getByText(/^\d+ en existencia$/);
    await expect(stockLabels.first()).toBeVisible();

    const cards = page.getByRole('listitem').filter({ hasText: 'en existencia' });
    const names = await cards.getByRole('heading', { level: 3 }).allTextContents();
    const stocks = (await stockLabels.allTextContents()).map((text) => Number.parseInt(text, 10));
    const lowest = stocks.indexOf(Math.min(...stocks));
    const name = names[lowest];
    const stock = stocks[lowest];

    const card = cards.filter({ has: page.getByRole('heading', { name, exact: true }) });
    const addBottle = card.getByRole('button', { name: 'Añadir botella' });
    const addCase = card.getByRole('button', { name: 'Añadir caja' });

    const leftover = Math.min(stock, 11);
    for (let i = 0; i < stock - leftover; i++) {
      await addBottle.click();
    }

    await expect(card.getByText(`${stock} en existencia · quedan ${leftover}`)).toBeVisible();
    await expect(addCase).toBeDisabled();
    await expect(addCase).toHaveAttribute('title', `Solo quedan ${leftover} en esta bodega`);

    await page.getByRole('combobox', { name: 'Bodega' }).click();
    await page.getByRole('option', { name: 'Barra E2E' }).click();

    await expect(page.getByRole('combobox', { name: 'Bodega' })).toHaveText('Barra E2E');
    await expect(card.getByText(/^\d+ en existencia/)).toBeVisible();
    await expect(card.getByText(`${stock} en existencia · quedan`)).toHaveCount(0);
  });

  test('Volver del diálogo y Descartar no escriben en el ledger', async ({ page }) => {
    const movementCode = page.getByRole('link', { name: /^MOV-\d{4}-\d+$/ }).first();

    await page.goto('/movements');
    await expect(movementCode).toBeVisible();
    const lastCode = await movementCode.textContent();

    await page.goto('/movements/new/outbound');
    const card = page.getByRole('listitem').filter({ hasText: 'en existencia' }).first();

    await card.getByRole('button', { name: 'Añadir botella' }).click();
    await expect(card.getByText('1 unidad en total')).toBeVisible();

    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByRole('heading', { name: '¿Confirmar esta salida?' })).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Volver' }).click();

    await expect(confirmDialog).toBeHidden();
    await expect(card.getByText('1 unidad en total')).toBeVisible();
    await expect(page.getByText('Movimiento registrado')).toHaveCount(0);

    await page.goto('/movements');
    await expect(movementCode).toHaveText(lastCode!);

    await page.goto('/movements/new/outbound');
    await expect(card.getByText('1 unidad en total')).toBeVisible();

    await page.getByRole('button', { name: 'Descartar', exact: true }).click();
    const discardDialog = page.getByRole('dialog');
    await expect(discardDialog.getByRole('heading', { name: '¿Descartar lo que capturaste?' })).toBeVisible();
    await discardDialog.getByRole('button', { name: 'Conservarlo' }).click();

    await expect(discardDialog).toBeHidden();
    await expect(card.getByText('1 unidad en total')).toBeVisible();

    await page.getByRole('button', { name: 'Descartar', exact: true }).click();
    await discardDialog.getByRole('button', { name: 'Descartar' }).click();

    await expect(page.getByRole('heading', { name: 'Borrador descartado' })).toBeVisible();
    await expect(page.getByText('No se envió nada al ledger.')).toBeVisible();
    await expect(card.getByText('0 unidades en total')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar', exact: true })).toHaveCount(0);
  });
});
