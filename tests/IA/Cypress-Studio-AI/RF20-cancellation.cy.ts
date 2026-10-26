import { DATA, dialog, exactly, itWrites, productCard, readStock, registerOwnInbound } from './support/app';

describe('RF-20 Anulación', () => {
  before(() => cy.signInAsManager());

  itWrites('Conservarlo cancela la anulación', () => {
    registerOwnInbound().then(({ code }) => {
      cy.contains(/^confirmado$/).should('be.visible');
      cy.contains('main button', /^Anular$/).click();

      dialog().within(() => {
        cy.contains(`¿Anular ${code}?`).should('be.visible');
        cy.contains(/Lo que este movimiento tomó de las existencias vuelve/).should('be.visible');
        cy.byLabel('Motivo').should('have.attr', 'placeholder', '¿Por qué se anula?');
        cy.contains('button', /^Conservarlo$/).click();
      });
      dialog().should('not.exist');
      cy.contains(/^confirmado$/).should('be.visible');
      cy.contains(/^anulado$/).should('not.exist');
      cy.contains('Movimiento anulado').should('not.exist');
      cy.contains('main button', /^Anular$/).should('be.visible');
    });
  });

  itWrites('Motivo obligatorio al anular', () => {
    registerOwnInbound().then(({ code }) => {
      // Studio AI: cy.prompt writes this step from plain language; the assertion after it checks the result.
      cy.prompt(['click the "Anular" button']);
      dialog().within(() => {
        cy.contains(`¿Anular ${code}?`).should('be.visible');

        cy.contains('button', /^Anular$/).click();
        cy.contains('Este campo no puede quedar vacío.').should('be.visible');
        cy.byLabel('Motivo').should('have.attr', 'aria-invalid', 'true');

        // Trimmed: only spaces counts as empty.
        cy.byLabel('Motivo').type(DATA.reasons.blank);
        cy.contains('button', /^Anular$/).click();
        cy.contains('Este campo no puede quedar vacío.').should('be.visible');

        cy.byLabel('Motivo').clear().type(DATA.reasons.tooShort);
        cy.contains('button', /^Anular$/).click();
        cy.contains(`Escribe al menos ${DATA.minReasonLength} caracteres.`).should('be.visible');
      });

      dialog().should('be.visible');
      cy.contains('Movimiento anulado').should('not.exist');
      dialog().contains('button', /^Conservarlo$/).click();
      dialog().should('not.exist');
      cy.contains(/^confirmado$/).should('be.visible');
      cy.contains(/^anulado$/).should('not.exist');
    });
  });

  itWrites('Anular con motivo válido', () => {
    cy.visitApp('/movements/new/inbound');
    productCard().find('h3').invoke('text').then((name) => {
      readStock(name.trim()).then((stockBefore) => {
        registerOwnInbound().then(({ code, productName }) => {
          expect(productName).to.equal(name.trim());
          readStock(productName).should('eq', stockBefore + 1);

          cy.visitApp('/movements');
          cy.get('input[aria-label="Buscar movimientos por código"]').type(code);
          cy.contains('article', code).contains('a', 'Detalle').click();
          cy.contains('h1', exactly(code)).should('be.visible');
          cy.contains(/^confirmado$/).should('be.visible');

          cy.contains('main button', /^Anular$/).click();
          dialog().within(() => {
            cy.byLabel('Motivo').type(DATA.reasons.cancellation);
            cy.contains('button', /^Anular$/).click();
          });

          cy.contains('Movimiento anulado').should('be.visible');
          cy.contains(`${code} se revirtió y las existencias volvieron.`).should('be.visible');
          cy.contains(/^anulado$/).should('be.visible');
          cy.contains('Anulado el').should('be.visible');
          cy.contains(/^confirmado$/).should('not.exist');
          cy.contains('main button', /^Anular$/).should('not.exist');

          readStock(productName).should('eq', stockBefore);
        });
      });
    });
  });
});
