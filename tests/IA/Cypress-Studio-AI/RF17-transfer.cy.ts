import {
  DATA,
  barButton,
  dialog,
  itWrites,
  movementCode,
  productCard,
  productCards,
  readCard,
  stockRow,
  trackOpenMovement,
  units,
} from './support/app';

const { source: SOURCE, destination: DESTINATION } = DATA.locations;

/**
 * The stock of a product at one location. The table keeps the previous rows
 * while a new filter loads, so it is read only once /stock answered for both.
 */
function stockAt(name: string, location: string) {
  cy.intercept({ method: 'GET', pathname: '/api/v1/stock', query: { search: name, locationId: /.+/ } }).as(
    'stockAt',
  );
  cy.visitApp('/stock');
  cy.get('input[aria-label="Buscar existencias por producto"]').type(name);
  cy.get('[aria-label="Filtrar por bodega"]').choose(location);
  cy.wait('@stockAt');
  return stockRow(name)
    .contains(/^\d+ unidades?$/)
    .invoke('text')
    .then((text) => Number.parseInt(text, 10));
}

describe('RF-17 Traspaso', () => {
  before(() => cy.signInAsManager());

  it('Origen y destino obligatorios', () => {
    cy.visitApp('/movements/new/transfer');
    cy.byLabel('Desde').should('contain.text', 'Elige un origen');
    cy.byLabel('Hacia').should('contain.text', 'Elige un destino');
    productCard().find('button[aria-label="Añadir botella"]').click();

    // Not `disabled`: the button stays clickable and reads as unavailable.
    barButton('Ver el resumen').should('be.visible');
    barButton('Confirmar').should('have.attr', 'aria-disabled', 'true');

    cy.byLabel('Desde').choose(SOURCE).should('contain.text', SOURCE);
    barButton('Confirmar').should('have.attr', 'aria-disabled', 'true');

    cy.byLabel('Hacia').choose(DESTINATION);
    barButton('Confirmar').should('have.attr', 'aria-disabled', 'false');
  });

  it('El destino excluye al origen', () => {
    cy.visitApp('/movements/new/transfer');
    cy.byLabel('Desde').choose(SOURCE);

    cy.byLabel('Hacia').should('not.be.disabled').click();
    cy.get('[role="listbox"]').within(() => {
      cy.contains('[role="option"]', DESTINATION).should('be.visible');
      cy.contains('[role="option"]', SOURCE).should('not.exist');
      cy.contains('[role="option"]', DESTINATION).click();
    });
    cy.get('[role="listbox"]').should('not.exist');
    cy.byLabel('Hacia').should('contain.text', DESTINATION);

    // Symmetric: the chosen destination is not offered as the origin either.
    cy.byLabel('Desde').click();
    cy.get('[role="listbox"]').within(() => {
      cy.contains('[role="option"]', SOURCE).should('be.visible');
      cy.contains('[role="option"]', DESTINATION).should('not.exist');
    });
    cy.get('body').type('{esc}');
    cy.get('[role="listbox"]').should('not.exist');
    cy.byLabel('Desde').should('contain.text', SOURCE);
    cy.byLabel('Hacia').should('contain.text', DESTINATION);
  });

  itWrites('Registrar un traspaso y verificar las dos puntas', () => {
    cy.visitApp('/movements/new/transfer');
    cy.byLabel('Desde').choose(SOURCE);
    cy.byLabel('Hacia').choose(DESTINATION);

    cy.contains(/^\d+ en existencia$/).should('be.visible');
    productCard().then(($card) => {
      const { name, stock: sourceBefore } = readCard($card);
      expect(sourceBefore).to.be.greaterThan(0);

      // The destination may already hold this product: the check is relative to it.
      stockAt(name, DESTINATION).then((destinationBefore) => {
        cy.visitApp('/movements/new/transfer');
        cy.byLabel('Desde').choose(SOURCE);
        cy.byLabel('Hacia').choose(DESTINATION);
        productCard(name).find('button[aria-label="Añadir botella"]').click();
        // Studio AI: cy.prompt writes this step from plain language; the assertion after it checks the result.
        cy.prompt(['click the "Confirmar" button in the summary bar at the bottom of the page']);
        dialog().within(() => {
          cy.contains('¿Confirmar este traspaso?').should('be.visible');
          cy.contains('button', /^Confirmar$/).click();
        });
        cy.contains('Movimiento registrado').should('be.visible');

        trackOpenMovement();
        movementCode().should('match', /^MOV-\d{4}-\d{6}$/);
        cy.contains(/^Traspaso$/).should('be.visible');
        cy.contains(/^confirmado$/).should('be.visible');
        cy.contains('Líneas (2)').should('be.visible');
        cy.contains(/^-1 unidad base$/).should('be.visible');
        cy.contains(/^1 unidad base$/).should('be.visible');

        // The total does not change: -1 at the origin and +1 at the destination.
        stockAt(name, DESTINATION).should('eq', destinationBefore + 1);
        stockAt(name, SOURCE).should('eq', sourceBefore - 1);
      });
    });
  });

  it('Cantidades del traspaso topadas por el origen', () => {
    cy.visitApp('/movements/new/transfer');
    cy.byLabel('Desde').choose(SOURCE);

    // The smallest stock that still fits a case: the limit is a few clicks away
    // and shows that bottles and cases spend the same pool.
    cy.contains(/^\d+ en existencia$/).should('be.visible');
    productCards().then(($cards) => {
      const candidates = [...$cards]
        .map((card) => readCard(Cypress.$(card)))
        .filter((card) => card.stock >= DATA.caseSize);
      expect(candidates, 'producto con al menos una caja').not.to.be.empty;
      const { name, stock } = candidates.reduce((a, b) => (b.stock < a.stock ? b : a));
      const cases = Math.floor(stock / DATA.caseSize);
      const bottles = stock % DATA.caseSize;

      productCard(name).within(() => {
        for (let i = 0; i < cases; i++) cy.get('button[aria-label="Añadir caja"]').click();
        for (let i = 0; i < bottles; i++) cy.get('button[aria-label="Añadir botella"]').click();

        cy.contains(`${units(stock)} en total`).should('be.visible');
        cy.contains(/quedan 0/).should('be.visible');
        for (const button of ['Añadir botella', 'Añadir caja']) {
          cy.get(`button[aria-label="${button}"]`)
            .should('be.disabled')
            .and('have.attr', 'title', 'Solo quedan 0 en esta bodega');
        }

        for (let i = 0; i < bottles + 1; i++) cy.get('button[aria-label="Quitar botella"]').click();
        for (let i = 0; i < cases + 1; i++) cy.get('button[aria-label="Quitar caja"]').click();
        cy.contains('0 unidades en total').should('exist');
      });
      cy.contains('main button', /^Confirmar$/).should('not.exist');
    });
  });
});
