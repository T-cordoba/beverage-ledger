import { Then, When } from '@badeball/cypress-cucumber-preprocessor';
import { api, authorised, scenario } from '../support/scenario';

const latestCode = () => cy.get('main article h3 a[href^="/movements/"]').first();

const rememberTheLatestMovement = () => {
  cy.get('nav[aria-label="Principal"]:visible').contains('a', 'Movimientos').click();
  latestCode().then(($link) => {
    scenario.movementCode = $link.text().trim();
    scenario.movementId = $link.attr('href')?.split('/').pop();
  });
};

// The same movement can be downloaded twice in a run, and the browser would then save
// "MOV-… (1).pdf", leaving the first file to pass the check.
const download = (button: () => Cypress.Chainable) => {
  cy.task('clearDownloads');
  button().click();
};

const receipt = () => `${Cypress.config('downloadsFolder')}/${scenario.movementCode}.pdf`;

When('ella abre el movimiento más reciente del historial', () => {
  rememberTheLatestMovement();
  latestCode().click();
  cy.contains('main button', /PDF$/).should('be.visible');
});

When('ella anota el movimiento más reciente del historial', rememberTheLatestMovement);

When('ella descarga el comprobante del movimiento', () =>
  download(() => cy.contains('main button', /PDF$/)),
);

When('ella descarga el comprobante del primer movimiento del historial', () =>
  download(() => cy.get('main article').first().contains('button', /PDF$/)),
);

Then('el archivo descargado se llama como el código del movimiento', () => {
  cy.readFile(receipt(), 'binary', { timeout: 60_000 }).should('exist');
});

Then('el archivo descargado es un PDF', () => {
  cy.readFile(receipt(), 'binary').should((content: string) => {
    expect(content.length).to.be.greaterThan(0);
    expect(content.slice(0, 5)).to.eq('%PDF-');
  });
});

When('ella pide directamente a la API el comprobante de ese movimiento', () => {
  cy.request({
    url: api(`/movements/${scenario.movementId}/pdf`),
    headers: authorised(),
    encoding: 'binary',
  }).as('receipt');
});

Then('la API responde con estado {int}', (status: number) => {
  cy.get<Cypress.Response<unknown>>('@receipt').its('status').should('eq', status);
});

Then('la API responde con el tipo de contenido {string}', (contentType: string) => {
  cy.get<Cypress.Response<unknown>>('@receipt')
    .its('headers.content-type')
    .should('contain', contentType);
});

Then('la API lo entrega como adjunto', () => {
  cy.get<Cypress.Response<unknown>>('@receipt')
    .its('headers.content-disposition')
    .should('match', /^attachment/);
});
