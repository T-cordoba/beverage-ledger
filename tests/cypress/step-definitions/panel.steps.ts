import { Then } from '@badeball/cypress-cucumber-preprocessor';

Then('ve la tarjeta {string}', (title: string) => {
  cy.contains('h2', title).should('be.visible');
});

// The low-stock rows are the only ones on the panel linking to /stock/.
Then('la tarjeta lista productos o dice {string}', (emptyNotice: string) => {
  cy.get('main').should(($main) => {
    const listsProducts = $main.find('li a[href^="/stock/"]').length > 0;
    expect(listsProducts || $main.text().includes(emptyNotice), 'productos o aviso').to.be.true;
  });
});

Then('la opción {string} queda marcada', (label: string) => {
  cy.contains('button', new RegExp(`^${label}$`)).should('have.attr', 'aria-pressed', 'true');
});

Then('el ranking empieza en la posición 1', () => {
  cy.get('[aria-label="Cargando el reporte"]').should('not.exist');
  cy.get('main ul > li span.rounded-full').first().should('have.text', '1');
});
