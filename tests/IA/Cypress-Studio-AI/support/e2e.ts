import { DATA, ownMovements } from './app';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress types its custom commands by augmenting this namespace.
  namespace Cypress {
    interface Chainable {
      /** cy.visit, after waiting for room under the API's refresh throttle. */
      visitApp(path: string): Chainable<AUTWindow>;
      /** The MANAGER session of this spec, created once and shared by its tests. */
      signInAsManager(): Chainable<void>;
      /** The control a `Field` label points at. */
      byLabel(label: string): Chainable<JQuery<HTMLElement>>;
      /** Opens a Radix select and picks an option, waiting for the listbox to close. */
      choose(option: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

/**
 * Cypress's proxy rewrites `<head>` into `<head> <script>…</script>` and that script
 * removes itself, leaving a whitespace text node the server never sent (Next renders
 * `<head><meta…` with nothing in between). The app's layout puts its preferences
 * <script> first in <head>, so React meets that node on hydration and throws
 * "Hydration failed" for something only Cypress added. Only a whitespace text node
 * at the very start of <head> is removed, and uncaught errors are not filtered: any
 * other mismatch with the server HTML still fails the test.
 */
Cypress.on('window:before:load', (win) => {
  const first = win.document.head?.firstChild;
  if (first?.nodeType !== win.Node.TEXT_NODE || first.textContent?.trim()) return;
  first.remove();
  Cypress.log({ name: 'hidratación', message: 'quitado el espacio que el proxy de Cypress deja en <head>' });
});

// The latest access token the app got, so the cleanup voids without buying another.
let accessToken: string | undefined;

const keepToken = (req: { continue: (cb: (res: { body?: { accessToken?: string } }) => void) => void }) =>
  req.continue((res) => {
    if (res.body?.accessToken) accessToken = res.body.accessToken;
  });

Cypress.Commands.add('visitApp', (path: string) => {
  cy.task<number>('takeRefreshTurn', null, { log: false, timeout: 120_000 }).then((waited) => {
    if (waited > 0) Cypress.log({ name: 'refresh', message: `esperó ${waited} ms por el límite de /auth/refresh` });
  });
  return cy.visit(path);
});

/**
 * The login form is server-rendered in `next dev`: a value typed before React
 * hydrates is lost and the submit goes nowhere, so the inputs are typed only
 * once React owns them.
 */
function signInThroughTheForm(email: string, password: string) {
  cy.intercept('POST', '**/api/v1/auth/login', keepToken).as('signIn');
  cy.visitApp('/login');
  cy.get('input[type="email"]').should(($input) => {
    expect(Object.keys($input[0]).some((key) => key.startsWith('__reactProps'))).to.equal(true);
  });
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password, { log: false });
  cy.contains('button', /^Entrar$/).click();
  cy.wait('@signIn').its('response.statusCode').should('eq', 200);
  cy.location('pathname').should('include', '/dashboard');
}

/**
 * cy.session once per spec, not per test: refresh tokens rotate with reuse
 * detection, so restoring the cookie cached at login in a later test would send
 * an already-spent token and revoke every session of the account. With
 * testIsolation off the cookie the browser holds stays the current one.
 */
Cypress.Commands.add('signInAsManager', () => {
  cy.env(['TEST_USER_EMAIL', 'TEST_USER_PASSWORD']).then(({ TEST_USER_EMAIL, TEST_USER_PASSWORD }) => {
    if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
      throw new Error('Define TEST_USER_EMAIL y TEST_USER_PASSWORD en la shell.');
    }
    cy.session(
      ['manager', Cypress.spec.relative],
      () => signInThroughTheForm(TEST_USER_EMAIL, TEST_USER_PASSWORD),
      { cacheAcrossSpecs: false },
    );
  });
});

Cypress.Commands.add('byLabel', (label: string) =>
  cy
    .contains('label', new RegExp(`^${label}`))
    .invoke('attr', 'for')
    .then((id) => cy.get(`[id="${id}"]`)),
);

Cypress.Commands.add('choose', { prevSubject: 'element' }, (subject, option: string) => {
  cy.wrap(subject).should('not.be.disabled').click();
  cy.contains('[role="option"]', option).click();
  cy.get('[role="listbox"]').should('not.exist');
  return cy.wrap(subject);
});

beforeEach(() => {
  // Intercepts are reset before every test; the token they caught is not.
  cy.intercept('POST', '**/api/v1/auth/refresh', keepToken);
  ownMovements.length = 0;
});

afterEach(() => {
  // The capture keeps its draft in localStorage, one entry per type: a leftover
  // line would leak into the next test's picker.
  cy.window({ log: false }).then((win) => win.localStorage.clear());

  // Voids what this test confirmed and left confirmed, failing loudly: a silent
  // miss leaves a moved stock behind for the next test.
  const apiUrl = Cypress.expose('apiUrl') as string;
  for (const id of ownMovements.splice(0)) {
    cy.request({
      url: `${apiUrl}/api/v1/movements/${id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    }).then(({ body }) => {
      if ((body as { status: string }).status === 'CANCELLED') return;
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/v1/movements/${id}/cancel`,
        headers: { authorization: `Bearer ${accessToken}`, origin: Cypress.config('baseUrl')! },
        body: { reason: DATA.reasons.cleanup },
      });
    });
  }
});
