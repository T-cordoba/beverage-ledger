import {
  DATA,
  barButton,
  dialog,
  exactly,
  itWrites,
  movementCode,
  productCard,
  readStock,
  stockRow,
  trackOpenMovement,
} from './support/app';

describe('RF-18 Ajuste', () => {
  before(() => cy.signInAsManager());

  it('Motivo obligatorio de al menos 4 caracteres', () => {
    cy.visitApp('/movements/new/adjustment');
    cy.contains('h1, h2', 'Registrar un ajuste').should('be.visible');

    // With 0 units there is no bar and nothing to confirm.
    productCard().should('contain.text', '0 unidades en total');
    cy.contains('main button', /^Confirmar$/).should('not.exist');

    productCard().find('button[aria-label="Quitar botella"]').click();
    productCard().should('contain.text', '-1 unidad en total');
    barButton('Confirmar').should('be.visible').and('have.attr', 'aria-disabled', 'true');
    cy.byLabel('Motivo').should('have.value', '');

    cy.byLabel('Motivo').type(DATA.reasons.tooShort).blur();
    cy.contains(`Escribe al menos ${DATA.minReasonLength} caracteres.`).should('be.visible');
    cy.byLabel('Motivo').should('have.attr', 'aria-invalid', 'true');
    barButton('Confirmar').should('have.attr', 'aria-disabled', 'true');

    cy.byLabel('Motivo').clear().type(DATA.reasons.blank).blur();
    cy.contains('Este campo no puede quedar vacío.').should('be.visible');
    barButton('Confirmar').should('have.attr', 'aria-disabled', 'true');

    cy.byLabel('Motivo').clear().type(DATA.reasons.adjustment);
    barButton('Confirmar').should('have.attr', 'aria-disabled', 'false');

    productCard().find('button[aria-label="Añadir botella"]').click();
    productCard().should('contain.text', '0 unidades en total');
    cy.contains('main button', /^Confirmar$/).should('not.exist');
  });

  itWrites('Registrar un ajuste con motivo válido', () => {
    cy.visitApp('/stock');
    cy.get('tbody tr a').first().invoke('text').then((text) => {
      const productName = text.trim();
      stockRow(productName)
        .contains(/^\d+ unidades?$/)
        .invoke('text')
        .then((stockText) => {
          const before = Number.parseInt(stockText, 10);

          cy.visitApp('/movements/new/adjustment');
          productCard(productName).within(() => {
            cy.get('button[aria-label="Quitar botella"]').click();
            cy.contains('-1 unidad en total').should('be.visible');
          });
          // Studio AI: cy.prompt writes this step from plain language; the assertion after it checks the result.
          cy.prompt([`type "${DATA.reasons.adjustment}" in the "Motivo" field`]);
          cy.byLabel('Motivo').should('have.value', DATA.reasons.adjustment);
          barButton('Confirmar').click();
          dialog().within(() => {
            cy.contains('¿Confirmar este ajuste?').should('be.visible');
            cy.contains('button', /^Confirmar$/).click();
          });

          trackOpenMovement();
          cy.contains('Movimiento registrado').should('be.visible');
          movementCode();
          cy.contains(/^Ajuste$/).should('be.visible');
          cy.contains(/^confirmado$/).should('be.visible');
          cy.contains(/^Motivo$/).should('be.visible');
          cy.contains(exactly(DATA.reasons.adjustment)).should('be.visible');
          cy.contains('Líneas (1)').should('be.visible');
          cy.contains('-1 unidad base').should('be.visible');
          cy.contains(/^-1 botella$/).should('be.visible');

          readStock(productName).should('eq', before - 1);
        });
    });
  });
});
