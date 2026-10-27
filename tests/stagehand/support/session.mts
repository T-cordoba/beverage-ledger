import { mkdirSync } from 'node:fs';
import {
  Stagehand,
  localBrowser,
  type Page,
  type StagehandBrowser,
} from '@browserbasehq/stagehand';
import { Ai } from './ai.mjs';
import { spendRefresh } from './budget.mjs';
import { read, waitFor } from './dom.mjs';
import {
  BASE_URL,
  CHROME_PATH,
  HEADLESS,
  LOG_LEVEL,
  assertLocalStack,
  credentials,
  geminiSettings,
  modelLabel,
  runPath,
  selectedProvider,
} from './env.mjs';
import { appendJsonl, log } from './evidence.mjs';
import { createOllamaClient } from './ollama-client.mjs';

export type Session = {
  stagehand: Stagehand;
  browser: StagehandBrowser;
  page: Page;
  ai: Ai;
  /** Where Chrome saves the receipts this spec downloads. */
  downloads: string;
  spec: string;
};

/**
 * One browser and one signed-in manager per spec file. Two API rules make a
 * session per scenario a bad idea: login is throttled to 10 per minute per IP,
 * and refresh tokens rotate with reuse detection, so two browsers replaying the
 * same cookie would revoke every session of the account.
 */
export async function openSession(spec: string): Promise<Session> {
  assertLocalStack();
  const model = selectedProvider() === 'ollama' ? createOllamaClient() : geminiSettings();
  const downloads = runPath('downloads', spec);
  mkdirSync(downloads, { recursive: true });

  const browser = await localBrowser.launch({
    headless: HEADLESS,
    ...(CHROME_PATH ? { executablePath: CHROME_PATH } : {}),
    viewport: { width: 1440, height: 1000 },
    locale: 'es-CO',
    acceptDownloads: true,
    downloadsPath: downloads,
  });

  try {
    const stagehand = await Stagehand.create({
      browser,
      model,
      logging: {
        level: LOG_LEVEL,
        format: 'json',
        onLog: (entry) => appendJsonl(`stagehand-${spec}.log.jsonl`, entry),
      },
    });
    const [page] = await browser.context.pages();
    if (!page) throw new Error('Stagehand no abrió ninguna pestaña.');
    log(`  Stagehand listo (${modelLabel()}, headless=${HEADLESS}) para ${spec}`);
    return { stagehand, browser, page, ai: new Ai(stagehand, page), downloads, spec };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

export async function closeSession(session: Session | undefined): Promise<void> {
  if (!session) return;
  try {
    await session.stagehand.close();
  } finally {
    if (!session.browser.closed) await session.browser.close();
  }
}

/**
 * A cold load: the SPA buys a token on it, so it waits for room under the
 * throttle first. Then it waits for the app to leave its "loading your session"
 * spinner (an h1 or the login form on screen). On rare loads the page stays on
 * that spinner for good, as seen in reports/03-rf15 (RF15-04): one more load
 * gets past it, and the retry is logged.
 */
export async function goto(session: Session, path: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    await spendRefresh();
    await session.page.goto(`${BASE_URL}${path}`, { waitUntil: 'load' });
    try {
      await waitFor(
        `que cargue ${path}`,
        async () => (await read(session.page, 'h1')) !== '' || (await read(session.page, 'hydrated', 'Correo electrónico')),
        Boolean,
        25_000,
      );
      return;
    } catch (error) {
      if (attempt >= 2) throw error;
      log(`    (${path} se quedó cargando la sesión; se recarga una vez)`);
    }
  }
}

export async function currentPath(session: Session): Promise<string> {
  return new URL(await session.page.url()).pathname;
}

/**
 * Signs in through the real form, driven by the model. The email and password
 * go as Stagehand variables: the model sees %email% and %password%, never the
 * values, and they are typed in the browser after the model picks the field.
 */
export async function signIn(session: Session): Promise<void> {
  const { email, password } = credentials();
  await goto(session, '/login');
  // The form is server-rendered in `next dev`: a value typed before React
  // hydrates is lost and the submit goes nowhere.
  await waitFor(
    'que el formulario de login se hidrate',
    () => read(session.page, 'hydrated', 'Correo electrónico'),
    Boolean,
    30_000,
  );

  // Each field is scoped to its own label and box: on the whole form the 7B
  // local model sometimes picked the label's text for the password, and `type`
  // then wrote into whichever field had focus.
  await read(session.page, 'tagFieldGroup', 'Correo electrónico', 'correo');
  await session.ai.fill('Escribe %email% en el campo "Correo electrónico"', 'Correo electrónico', { email }, {
    within: session.page.locator('[data-sh-group="correo"]'),
  });
  if ((await read(session.page, 'field', 'Correo electrónico'))?.value !== email) {
    throw new Error('act no dejó el correo en el campo "Correo electrónico".');
  }
  await read(session.page, 'tagFieldGroup', 'Contraseña', 'clave');
  await session.ai.fill('Escribe %password% en el campo "Contraseña"', 'Contraseña', { password }, {
    within: session.page.locator('[data-sh-group="clave"]'),
  });
  if ((await read(session.page, 'valueLength', 'Contraseña')) !== password.length) {
    throw new Error('act no dejó la contraseña en el campo "Contraseña".');
  }
  await session.ai.click('Pulsa el botón "Entrar" para iniciar sesión', 'Entrar');

  await waitFor(
    'llegar a /dashboard tras iniciar sesión',
    () => currentPath(session),
    (path) => path === '/dashboard',
    30_000,
  );
  log('  Sesión iniciada (redirigido a /dashboard)');
}
