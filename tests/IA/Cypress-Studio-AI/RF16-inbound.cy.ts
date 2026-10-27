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
  units,
} from './support/app';

describe('RF-16 Entrada', () => {
  before(() => cy.signInAsManager());

  itWrites('Registrar una entrada y verla en detalle e historial', () => {
    cy.visitApp('/stock');
    cy.get('tbody tr a').first().invoke('text').then((text) => {
      const productName = text.trim();
      stockRow(productName)
        .contains(/^\d+ unidades?$/)
        .invoke('text')
        .then((stockText) => {
          const before = Number.parseInt(stockText, 10);

          cy.visitApp('/movements/new/inbound');
          productCard(productName).within(() => {
            cy.get('button[aria-label="Añadir caja"]').click();
            cy.contains(`${units(DATA.caseSize)} en total`).should('be.visible');
          });
          barButton('Confirmar').click();
          dialog().within(() => {
            cy.contains('¿Confirmar esta entrada?').should('be.visible');
            cy.contains('button', /^Confirmar$/).click();
          });

          trackOpenMovement();
          cy.contains('Movimiento registrado').should('be.visible');
          cy.contains(/MOV-\d{4}-\d+ se confirmó y se aplicó a las existencias\./).should('be.visible');
          movementCode().then((code) => {
            readStock(productName).should('eq', before + DATA.caseSize);

            cy.visitApp('/movements');
            cy.get('input[aria-label="Buscar movimientos por código"]').type(code);
            cy.contains('article', code).within(() => {
              cy.contains(/^Entrada$/).should('be.visible');
              cy.contains(/^confirmado$/).should('be.visible');
              cy.contains('a', 'Detalle').click();
            });

            cy.location('pathname').should('match', /\/movements\/[0-9a-f-]{36}$/);
            cy.contains('h1', exactly(code)).should('be.visible');
            cy.contains('Líneas (1)').should('be.visible');
            cy.contains(DATA.managerName).should('be.visible');
            cy.contains(/^confirmado$/).should('be.visible');
          });
        });
    });
  });

  it('Validación de la entrada: sin líneas y diálogo con Volver', () => {
    cy.visitApp('/movements');
    cy.contains('article a', /^MOV-\d{4}-\d+$/).invoke('text').then((lastCode) => {
      cy.visitApp('/movements/new/inbound');
      cy.contains('h1, h2', 'Registrar una entrada').should('be.visible');
      cy.contains('main button', /^Confirmar$/).should('not.exist');

      productCard().find('button[aria-label="Añadir botella"]').click();
      productCard().should('contain.text', '1 unidad en total');

      // The capture no longer asks for a date: it says the movement is stamped now.
      cy.contains('Se registrará con la fecha y hora actuales.').should('be.visible');
      cy.contains('button', /^Ahora$/).should('not.exist');
      // Studio AI: cy.prompt writes this step from plain language; the assertion after it checks the result.
      cy.prompt(['type "Entrada Cypress Studio AI" in the "Nota" field']);
      cy.byLabel('Nota').should('have.value', 'Entrada Cypress Studio AI');

      barButton('Confirmar').click();
      dialog().within(() => {
        cy.contains('¿Confirmar esta entrada?').should('be.visible');
        cy.contains('button', /^Volver$/).click();
      });
      dialog().should('not.exist');
      productCard().should('contain.text', '1 unidad en total');
      cy.contains('Movimiento registrado').should('not.exist');

      cy.visitApp('/movements');
      cy.contains('article a', /^MOV-\d{4}-\d+$/).should('have.text', lastCode);
    });
  });
});
