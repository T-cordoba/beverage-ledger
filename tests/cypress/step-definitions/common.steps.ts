import { Given, Then, When } from '@badeball/cypress-cucumber-preprocessor';

Given('el usuario ingresó a la aplicación', () => {
  cy.task<number>('waitForSignInTurn').then((ms) => cy.wait(ms));
  cy.env(['TEST_USER_EMAIL', 'TEST_USER_PASSWORD']).then(
    ({ TEST_USER_EMAIL, TEST_USER_PASSWORD }) => {
      expect(TEST_USER_EMAIL, 'TEST_USER_EMAIL en .env').to.be.a('string').and.not.be.empty;
      cy.visit('/login');
      cy.get('input[type="email"]').type(TEST_USER_EMAIL);
      cy.get('input[type="password"]').type(TEST_USER_PASSWORD, { log: false });
    },
  );
  cy.contains('button', 'Entrar').click();
  cy.get('nav[aria-label="Principal"]:visible').should('exist');
});

When('abre la sección {string}', (section: string) => {
  cy.get('nav[aria-label="Principal"]:visible').contains('a', section).click();
});

When('abre {string}', (link: string) => {
  cy.contains('a', link).click();
});

When('elige la opción {string}', (label: string) => {
  cy.contains('button', new RegExp(`^${label}$`)).click();
});

Then('ve el título {string}', (title: string) => {
  cy.get('h1').should('have.text', title);
});

Then('ve el aviso {string}', (notice: string) => {
  cy.contains('main', notice).should('be.visible');
});
