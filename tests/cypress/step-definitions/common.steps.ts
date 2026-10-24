import { After, Before, Given, Then, When } from '@badeball/cypress-cucumber-preprocessor';
import { api, authorised, scenario } from '../support/scenario';

Before(() => {
  for (const key of Object.keys(scenario)) delete scenario[key as keyof typeof scenario];
});

// A scenario that failed between confirming and voiding leaves the stock moved; void it here.
After({ tags: '@escribe-en-el-ledger' }, () => {
  if (!scenario.movementId || scenario.movementCancelled) return;
  cy.request({
    method: 'POST',
    url: api(`/movements/${scenario.movementId}/cancel`),
    headers: authorised(),
    body: { reason: 'Limpieza de una prueba E2E que falló' },
    failOnStatusCode: false,
  });
});

Given('Camila ingresó a la aplicación', () => {
  cy.task<number>('waitForSignInTurn').then((ms) => cy.wait(ms));
  // The token the app gets is reused for the API checks, so they spend no extra sign-in.
  cy.intercept('POST', '**/api/v1/auth/login').as('signIn');
  cy.env(['TEST_USER_EMAIL', 'TEST_USER_PASSWORD']).then(
    ({ TEST_USER_EMAIL, TEST_USER_PASSWORD }) => {
      expect(TEST_USER_EMAIL, 'TEST_USER_EMAIL en .env').to.be.a('string').and.not.be.empty;
      cy.visit('/login');
      cy.get('input[type="email"]').type(TEST_USER_EMAIL);
      cy.get('input[type="password"]').type(TEST_USER_PASSWORD, { log: false });
    },
  );
  cy.contains('button', 'Entrar').click();
  cy.wait('@signIn').then(({ response }) => {
    scenario.accessToken = response?.body.accessToken;
  });
  cy.get('nav[aria-label="Principal"]:visible').should('exist');
});

When('ella abre la sección {string}', (section: string) => {
  cy.get('nav[aria-label="Principal"]:visible').contains('a', section).click();
});

When('ella abre {string}', (link: string) => {
  cy.contains('a', link).click();
});

When('ella elige la opción {string}', (label: string) => {
  cy.contains('button', new RegExp(`^${label}$`)).click();
});

Then('ella ve el título {string}', (title: string) => {
  cy.get('h1').should('have.text', title);
});

Then('ella ve el aviso {string}', (notice: string) => {
  cy.contains('main', notice).should('be.visible');
});

Then('ella sigue en la ruta {string}', (path: string) => {
  cy.location('pathname').should('eq', path);
});
