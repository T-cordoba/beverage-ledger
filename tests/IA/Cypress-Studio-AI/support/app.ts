import DATA from './movimientos.json';

export { DATA };

const isLocal = (url: string) => ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

/**
 * The scenarios that confirm or void movements write to the ledger. They only
 * run against a disposable local stack, never against Vercel or Render.
 */
export const WRITES_ALLOWED =
  isLocal(Cypress.config('baseUrl') ?? '') && isLocal(Cypress.expose('apiUrl') as string);

/** `it` for a scenario that writes to the ledger: skipped outside localhost. */
export const itWrites = WRITES_ALLOWED ? it : it.skip;

export const MOVEMENT_CODE = /^MOV-\d{4}-\d+$/;
export const MOVEMENT_URL = /\/movements\/[0-9a-f-]{36}$/;

/** "1 unidad", "12 unidades", "-1 unidad": the app's plural for base units. */
export const units = (count: number) => `${count} ${Math.abs(count) === 1 ? 'unidad' : 'unidades'}`;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const exactly = (text: string) => new RegExp(`^${escapeRegExp(text)}$`);

/** Movements this test confirmed; afterEach voids whatever is still confirmed. */
export const ownMovements: string[] = [];

/** The id of the movement whose detail page is open, kept for the cleanup. */
export function trackOpenMovement() {
  return cy
    .location('pathname')
    .should('match', MOVEMENT_URL)
    .then((path) => {
      ownMovements.push(path.split('/').pop()!);
    });
}

/** The code in the detail page's title, once it is a movement code. */
export function movementCode() {
  return cy
    .get('h1')
    .invoke('text')
    .should('match', MOVEMENT_CODE)
    .then((text) => text.trim());
}

/** A product card of the capture picker, the first one by default. */
export const productCards = () => cy.get('li:has(button[aria-label="Añadir botella"])');
export const productCard = (name?: string) =>
  name
    ? cy.contains('li:has(button[aria-label="Añadir botella"]) h3', exactly(name)).parents('li').first()
    : productCards().first();

/** The sticky bar's button, not the one inside a dialog. */
export const barButton = (name: string) => cy.get('main').contains('button', exactly(name));
export const dialog = () => cy.get('[role="dialog"]');

/** Reads a card into its product name and the stock shown at the origin. */
export function readCard($card: JQuery<HTMLElement>) {
  const name = $card.find('h3').text().trim();
  const stock = /(\d+) en existencia/.exec($card.text());
  return { name, stock: stock ? Number(stock[1]) : NaN };
}

/** The stock row of a product in /stock, by its exact link text. */
export const stockRow = (productName: string) =>
  cy.contains('tbody tr a', exactly(productName)).parents('tr').first();

export function readStock(productName: string) {
  cy.visitApp('/stock');
  return stockRow(productName)
    .contains(/^\d+ unidades?$/)
    .invoke('text')
    .then((text) => Number.parseInt(text, 10));
}

/** Registers an inbound of one bottle owned by the test and leaves its detail open. */
export function registerOwnInbound(): Cypress.Chainable<{ code: string; productName: string }> {
  cy.visitApp('/movements/new/inbound');
  // Static: a query alias would re-run on the detail page, where no card exists.
  productCard().find('h3').invoke('text').as('productName', { type: 'static' });
  productCard().find('button[aria-label="Añadir botella"]').click();
  productCard().should('contain.text', '1 unidad en total');
  barButton('Confirmar').click();
  dialog().contains('button', exactly('Confirmar')).click();
  trackOpenMovement();
  cy.contains('Movimiento registrado').should('be.visible');
  return movementCode().then((code) =>
    cy.get<string>('@productName').then((productName) => ({ code, productName: productName.trim() })),
  );
}
