/* eslint-disable react-hooks/rules-of-hooks -- Playwright names the fixture callback `use`; it is not a React hook. */
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { recordRefresh, recordRefreshes, waitForRefreshBudget } from './auth-budget';
import { API_URL, BASE_URL, MANAGER } from './env';

/**
 * Signs in through the real form. The form is server-rendered in `next dev`, so
 * a value typed before React hydrates is lost and the submit goes nowhere: the
 * whole exchange is retried until the URL leaves /login.
 */
export async function signIn(page: Page, email: string, password: string) {
  // /login itself asks for a refresh on load, so it spends from the budget too.
  await waitForRefreshBudget();
  await page.goto('/login');
  await expect(async () => {
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
}

type Ledger = {
  /** Remembers a movement this test confirmed, so the teardown can void it. */
  track: (movementId: string) => void;
};

type WorkerFixtures = { managerContext: BrowserContext };
type TestFixtures = { ledger: Ledger; guestPage: Page };
const rateLimitResponses = new WeakMap<BrowserContext, string[]>();

/**
 * One manager session per worker, not one per test. Two API rules force it:
 * login is throttled to 10 per minute per IP, and refresh tokens rotate with
 * reuse detection, so a storageState replayed by two tests would revoke every
 * session of the account. Each test gets a fresh tab on that context instead.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  managerContext: [
    async ({ browser }, use) => {
      if (!MANAGER.email || !MANAGER.password) {
        throw new Error('Define TEST_USER_EMAIL y TEST_USER_PASSWORD en la shell.');
      }
      const context = await browser.newContext({ baseURL: BASE_URL, acceptDownloads: true });
      const throttledRequests: string[] = [];
      rateLimitResponses.set(context, throttledRequests);
      context.on('response', (response) => {
        if (response.status() === 429) {
          throttledRequests.push(`${response.request().method()} ${response.url()}`);
        }
      });
      recordRefreshes(context);
      const login = await context.newPage();
      await signIn(login, MANAGER.email, MANAGER.password);
      expect(throttledRequests, 'HTTP 429 durante el inicio de sesión').toEqual([]);
      await login.close();
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  // Playwright instruments every context the browser opens, this one included,
  // so the trace and screenshot options of the config still apply to it.
  page: async ({ managerContext }, use, testInfo) => {
    const page = await managerContext.newPage();
    const throttledRequests = rateLimitResponses.get(managerContext);
    if (!throttledRequests)
      throw new Error('No se pudo iniciar el registro de respuestas HTTP 429.');
    const responseStart = throttledRequests.length;
    // Every goto and reload is a cold load that buys a token: wait for room under
    // the refresh throttle first (support/auth-budget.ts), and don't let that wait
    // count against the test.
    for (const method of ['goto', 'reload'] as const) {
      const original = page[method].bind(page) as (...args: unknown[]) => Promise<unknown>;
      (page[method] as unknown) = async (...args: unknown[]) => {
        const waited = await waitForRefreshBudget();
        if (waited > 0) testInfo.setTimeout(testInfo.timeout + waited);
        return original(...args);
      };
    }
    await use(page);
    expect(
      throttledRequests.slice(responseStart),
      'La prueba recibió una respuesta HTTP 429 del backend.',
    ).toEqual([]);
    // The capture keeps its draft in localStorage, one entry per movement type,
    // and every tab of this context shares it: a leftover line would leak into
    // the next test's picker.
    if (page.url().startsWith(BASE_URL)) await page.evaluate(() => localStorage.clear());
    await page.close();
  },

  /** A tab with no session at all, for the scenarios that sign in or out. */
  guestPage: async ({ context }, use) => {
    await use(await context.newPage());
  },

  ledger: async ({ managerContext }, use) => {
    const created: string[] = [];
    await use({ track: (id) => created.push(id) });
    if (created.length === 0) return;

    // Voids whatever the test confirmed and left confirmed. The refresh cookie
    // lives in this context, so its request client can buy a token.
    await waitForRefreshBudget();
    recordRefresh();
    const refresh = await managerContext.request.post(`${API_URL}/api/v1/auth/refresh`, {
      headers: { origin: BASE_URL },
    });
    // Fail loudly: a silent miss here leaves a confirmed movement in the ledger.
    expect(refresh.ok(), `refresh para limpiar el ledger: ${refresh.status()}`).toBe(true);
    const { accessToken } = (await refresh.json()) as { accessToken: string };
    for (const id of created) {
      const movement = await managerContext.request.get(`${API_URL}/api/v1/movements/${id}`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (((await movement.json()) as { status: string }).status === 'CANCELLED') continue;
      const cancel = await managerContext.request.post(`${API_URL}/api/v1/movements/${id}/cancel`, {
        headers: { authorization: `Bearer ${accessToken}`, origin: BASE_URL },
        data: { reason: 'Limpieza de la suite Playwright MCP + Copilot' },
      });
      expect(cancel.ok(), `anular ${id} al limpiar: ${cancel.status()}`).toBe(true);
    }
  },
});

export { expect };
