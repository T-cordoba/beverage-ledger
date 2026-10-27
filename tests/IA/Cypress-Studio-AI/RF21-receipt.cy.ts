import { DATA, dialog, itWrites, movementCode, registerOwnInbound } from './support/app';

/** Waits for the downloaded receipt and checks its name and its content. */
function expectReceipt(code: string, status?: 'CONFIRMED' | 'CANCELLED') {
  const fileName = `${code}.pdf`;
  expect(fileName).to.match(new RegExp(DATA.receipt.fileName));
  const path = `${Cypress.config('downloadsFolder')}/${fileName}`;
  // readFile retries until the browser has finished writing the file.
  cy.readFile(path, 'binary', { timeout: 20_000 }).should('have.length.greaterThan', 0);
  cy.task<{ isPdf: boolean; text: string }>('readPdf', path).then(({ isPdf, text }) => {
    expect(isPdf, 'firma %PDF-').to.equal(true);
    expect(text).to.contain(code);
    expect(text).to.contain('Tipo:');
    expect(text).to.match(new RegExp(DATA.receipt.types.join('|')));
    expect(text).to.contain('Estado:');
    expect(text).to.match(status ? new RegExp(status) : /CONFIRMED|CANCELLED/);
  });
  cy.contains('No se pudo descargar el PDF').should('not.exist');
}

describe('RF-21 Comprobante', () => {
  before(() => cy.signInAsManager());

  it('Descargar el PDF desde el historial', () => {
    cy.visitApp('/movements');
    cy.get('article')
      .first()
      .within(() => {
        cy.contains('a', /^MOV-/).invoke('text').then((text) => {
          const code = text.trim();
          cy.contains('button', 'PDF').should('have.attr', 'title', `Descargar ${code} en PDF`).click();
          expectReceipt(code);
        });
      });
  });

  it('Descargar el PDF desde el detalle', () => {
    cy.visitApp('/movements');
    // Studio AI: cy.prompt writes this step from plain language; the assertion after it checks the result.
    cy.prompt(['click the "Detalle" link of the first movement in the list']);
    cy.location('pathname').should('match', /\/movements\/[0-9a-f-]{36}$/);
    movementCode().then((code) => {
      cy.contains('main button', 'PDF').click();
      expectReceipt(code);
    });
  });

  itWrites('Descargar el PDF de un movimiento anulado', () => {
    registerOwnInbound().then(({ code }) => {
      cy.contains('main button', /^Anular$/).click();
      dialog().within(() => {
        cy.byLabel('Motivo').type(DATA.reasons.cancellation);
        cy.contains('button', /^Anular$/).click();
      });
      cy.contains(/^anulado$/).should('be.visible');
      cy.contains('Anulado el').should('be.visible');

      cy.contains('main button', 'PDF').click();
      expectReceipt(code, 'CANCELLED');
    });
  });
});
