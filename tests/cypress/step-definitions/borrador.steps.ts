import { Then, When } from '@badeball/cypress-cucumber-preprocessor';

const draftSummary = (units: string) => cy.contains('button', `· ${units}`);

When('ella añade {int} botellas sin confirmar', (bottles: number) => {
  cy.contains('main li p', 'en existencia').should('exist');
  for (let i = 0; i < bottles; i++) {
    cy.get('button[aria-label="Añadir botella"]:not(:disabled)').first().click();
  }
});

When('ella recarga la página', () => {
  cy.reload();
});

Then('el resumen del borrador dice {string}', (units: string) => {
  draftSummary(units).should('be.visible');
});

When('ella descarta el borrador', () => {
  cy.contains('button', /^Descartar$/).click();
  cy.get('[role="dialog"]')
    .contains('button', /^Descartar$/)
    .click();
});

Then('ya no queda ningún borrador pendiente', () => {
  cy.contains('button', /· \d+ unidad/).should('not.exist');
});
