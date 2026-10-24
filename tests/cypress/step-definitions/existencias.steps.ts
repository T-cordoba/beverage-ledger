import { Then, When } from '@badeball/cypress-cucumber-preprocessor';

const productLinks = () =>
  cy.contains('caption', 'Existencias por producto').parent().find('tbody a[href^="/stock/"]');

Then('la tabla de existencias lista al menos un producto', () => {
  productLinks().should('have.length.greaterThan', 0);
});

Then('el conteo de resultados tiene la forma {string}', (shape: string) => {
  const pattern = new RegExp(`^${shape.replace(/[XYN]/g, '[0-9.]+')}$`);
  cy.get('nav[aria-label="Paginación"] p').invoke('text').should('match', pattern);
});

When('busca {string} en las existencias', (term: string) => {
  productLinks().should('have.length.greaterThan', 0);
  cy.get('main input[type="search"]').type(term);
});

Then('todos los productos listados contienen {string}', (term: string) => {
  productLinks().should(($links) => {
    expect($links).to.have.length.greaterThan(0);
    $links.each((_, link) => {
      expect(link.textContent?.toUpperCase()).to.contain(term.toUpperCase());
    });
  });
});

When('abre el kardex del primer producto listado', () => {
  productLinks()
    .first()
    .then(($link) => {
      cy.wrap($link.text().trim()).as('product');
      cy.wrap($link).click();
    });
});

Then('el kardex es del producto elegido', () => {
  cy.get<string>('@product').then((product) => cy.get('h1').should('have.text', product));
});

// Newest line first, so its balance (fifth column) is what is on hand now.
Then('el saldo más reciente coincide con lo que hay en existencia', () => {
  cy.contains('caption', /^Líneas confirmadas del ledger/)
    .parent()
    .find('tbody tr:first-child td:nth-child(5)')
    .invoke('text')
    .then((balance) => {
      cy.contains('p', /^En existencia$/)
        .prev('p')
        .should('have.text', balance.trim());
    });
});
