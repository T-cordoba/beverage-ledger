import {
  barButton,
  dialog,
  itWrites,
  movementCode,
  productCard,
  productCards,
  readCard,
  readStock,
  trackOpenMovement,
  units,
} from './support/app';

/** The card with the least stock on the first page: its limit is a few clicks away. */
function lowestStockCard() {
  cy.contains(/^\d+ en existencia$/).should('be.visible');
  return productCards().then(($cards) => {
    const cards = [...$cards].map((card) => readCard(Cypress.$(card)));
    return cards.reduce((lowest, card) => (card.stock < lowest.stock ? card : lowest));
  });
}

describe('RF-15 Salida', () => {
  before(() => cy.signInAsManager());

  itWrites('Registrar una salida correcta', () => {
    cy.visitApp('/movements/new/outbound');
    // The card renders before its stock arrives: read it once the count is there.
    productCard().contains(/^\d+ en existencia$/).should('be.visible');
    productCard().then(($card) => {
      const { name, stock } = readCard($card);

      productCard(name).within(() => {
        cy.get('button[aria-label="Añadir botella"]').click();
        cy.contains('1 unidad en total').should('be.visible');
      });
      // Studio AI: cy.prompt writes this step from plain language; the assertion after it checks the result.
      cy.prompt(['type "Salida Cypress Studio AI" in the "Nota" field']);
      cy.byLabel('Nota').should('have.value', 'Salida Cypress Studio AI');
      barButton('Ver el resumen').should('be.visible');
      barButton('Descartar').should('be.visible');

      barButton('Confirmar').click();
      dialog().within(() => {
        cy.contains('¿Confirmar esta salida?').should('be.visible');
        cy.contains('Esto registra 1 producto en el historial de movimientos y mueve 1 unidad').should('be.visible');
        cy.contains('button', /^Confirmar$/).click();
      });

      trackOpenMovement();
      cy.contains('Movimiento registrado').should('be.visible');
      cy.contains(/MOV-\d{4}-\d+ se confirmó y se aplicó a las existencias\./).should('be.visible');
      movementCode().then((code) => {
        readStock(name).should('eq', stock - 1);

        cy.visitApp('/movements');
        cy.contains('article', code).within(() => {
          cy.contains(/^Salida$/).should('be.visible');
          cy.contains(/^confirmado$/).should('be.visible');
        });
      });
    });
  });

  it('Sin productos no aparece la barra Confirmar', () => {
    cy.visitApp('/movements/new/outbound');
    cy.get('input[aria-label="Buscar productos"]').should('be.visible');
    productCard().find('button[aria-label="Añadir botella"]').should('be.enabled');
    cy.contains('main button', /^(Confirmar|Descartar|Ver el resumen)$/).should('not.exist');
    productCard().should('contain.text', '0 unidades en total');
    cy.contains(/^[1-9]\d* unidades? en total$/).should('not.exist');

    productCard().find('button[aria-label="Añadir botella"]').click();
    barButton('Confirmar').should('be.visible');
    productCard().find('button[aria-label="Quitar botella"]').click();
    cy.contains('main button', /^(Confirmar|Descartar|Ver el resumen)$/).should('not.exist');
  });

  it('Cantidades incorrectas: quitar por debajo de cero y tope del stepper', () => {
    cy.visitApp('/movements/new/outbound');
    lowestStockCard().then(({ name, stock }) => {
      productCard(name).within(() => {
        cy.get('button[aria-label="Quitar botella"]').click();
        cy.get('button[aria-label="Quitar caja"]').click();
        cy.contains('0 unidades en total').should('exist');

        for (let i = 0; i < stock; i++) cy.get('button[aria-label="Añadir botella"]').click();

        cy.contains(`${units(stock)} en total`).should('be.visible');
        for (const button of ['Añadir botella', 'Añadir caja']) {
          cy.get(`button[aria-label="${button}"]`).should('be.disabled');
        }
        // The cap is explained in the card itself (a live region), no longer in a tooltip.
        cy.contains(`Ya tomaste las ${stock} unidades que hay en la bodega de origen.`).should('be.visible');
        cy.contains(`${stock} en existencia · quedan 0`).should('be.visible');
      });
    });
  });

  it('Inventario insuficiente por tope compartido botellas/cajas', () => {
    cy.visitApp('/movements/new/outbound');
    lowestStockCard().then(({ name, stock }) => {
      // Bottles and cases spend the same stock: the limit is on base units.
      const leftover = Math.min(stock, 11);
      productCard(name).within(() => {
        for (let i = 0; i < stock - leftover; i++) cy.get('button[aria-label="Añadir botella"]').click();
        cy.contains(`${stock} en existencia · quedan ${leftover}`).should('be.visible');
        cy.get('button[aria-label="Añadir caja"]').should('be.disabled');
        cy.contains(
          leftover === 0
            ? 'No hay existencias en la bodega de origen, así que no se puede sacar nada.'
            : `${leftover === 1 ? 'Queda 1 unidad' : `Quedan ${leftover} unidades`}: no alcanza para otra caja, pero sí para botellas sueltas.`,
        ).should('be.visible');
      });

      cy.byLabel('Bodega').choose('Barra E2E').should('contain.text', 'Barra E2E');
      productCard(name).within(() => {
        cy.contains(/^\d+ en existencia/).should('be.visible');
        cy.contains(`${stock} en existencia · quedan`).should('not.exist');
      });
    });
  });

  it('Volver del diálogo y Descartar no escriben en el ledger', () => {
    cy.visitApp('/movements');
    cy.contains('article a', /^MOV-\d{4}-\d+$/).invoke('text').then((lastCode) => {
      cy.visitApp('/movements/new/outbound');
      productCard().find('button[aria-label="Añadir botella"]').click();
      productCard().should('contain.text', '1 unidad en total');

      barButton('Confirmar').click();
      dialog().within(() => {
        cy.contains('¿Confirmar esta salida?').should('be.visible');
        cy.contains('button', /^Volver$/).click();
      });
      dialog().should('not.exist');
      productCard().should('contain.text', '1 unidad en total');
      cy.contains('Movimiento registrado').should('not.exist');

      cy.visitApp('/movements');
      cy.contains('article a', /^MOV-\d{4}-\d+$/).should('have.text', lastCode);

      // The draft survives the round trip: it lives in localStorage.
      cy.visitApp('/movements/new/outbound');
      productCard().should('contain.text', '1 unidad en total');

      barButton('Descartar').click();
      dialog().within(() => {
        cy.contains('¿Descartar lo que capturaste?').should('be.visible');
        cy.contains('button', /^Conservarlo$/).click();
      });
      dialog().should('not.exist');
      productCard().should('contain.text', '1 unidad en total');

      barButton('Descartar').click();
      dialog().contains('button', /^Descartar$/).click();
      cy.contains('Borrador descartado').should('be.visible');
      cy.contains('No se registró nada.').should('be.visible');
      productCard().should('contain.text', '0 unidades en total');
      cy.contains('main button', /^Confirmar$/).should('not.exist');
    });
  });
});
