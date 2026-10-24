import { Then, When, defineParameterType } from '@badeball/cypress-cucumber-preprocessor';
import { api, authorised, scenario } from '../support/scenario';

const ENTRY_POINTS = {
  salida: 'Registrar una salida',
  entrada: 'Registrar una entrada',
  traspaso: 'Registrar un traspaso',
  ajuste: 'Registrar un ajuste',
} as const;

type MovementKind = keyof typeof ENTRY_POINTS;

defineParameterType({
  name: 'kind',
  regexp: /salida|entrada|traspaso|ajuste/,
  transformer: (kind: string) => kind as MovementKind,
});

const exactly = (text: string) => new RegExp(`^${text}$`);

const fieldLabelled = (label: string, scope = 'main') =>
  cy
    .contains(`${scope} label`, exactly(label))
    .invoke('attr', 'for')
    .then((id) => cy.get(`[id="${id}"]`));

const dialog = () => cy.get('[role="dialog"]');

// "1.234 en existencia · quedan 1.233", read back as the two numbers it carries.
const figuresOf = (text: string) =>
  text.split('·').map((part) => Number(part.replace(/\./g, '').replace(/[^\d-]/g, '')));

const chosenCard = () => cy.contains('main li h3', exactly(scenario.chosenProduct!)).closest('li');

const stockOnHand = () =>
  cy
    .request({
      url: api('/stock'),
      qs: { productIds: scenario.stockProductId, locationId: scenario.stockLocationId },
      headers: authorised(),
    })
    .then(({ body }) => (body.data[0]?.quantityBase ?? 0) as number);

let captureKind: MovementKind;

const openCapture = (kind: MovementKind) => {
  captureKind = kind;
  cy.get('nav[aria-label="Principal"]:visible').contains('a', 'Panel').click();
  cy.contains('a', exactly(ENTRY_POINTS[kind])).click();
  cy.contains('main label', exactly(kind === 'traspaso' ? 'Desde' : 'Bodega')).should('be.visible');
};

// Named explicitly: an empty origin makes the picker sum every location, while the API
// takes stock from the default one.
const chooseLocation = (label: string, option: 'default' | 'other') => {
  fieldLabelled(label).click();
  if (option === 'default') cy.contains('[role="option"]', /\(por defecto\)$/).click();
  else cy.get('[role="option"]').eq(1).click();
};

const addBottles = (count: number) => {
  // Until the on-hand figures arrive every stepper is enabled, even with nothing on the shelf.
  if (captureKind === 'salida' || captureKind === 'traspaso') {
    cy.contains('main li p', 'en existencia').should('exist');
  }
  cy.get('main li:has(button[aria-label="Añadir botella"]:not(:disabled)) h3')
    .first()
    .invoke('text')
    .then((name) => {
      scenario.chosenProduct = name.trim();
      for (let i = 0; i < count; i++) {
        chosenCard().find('button[aria-label="Añadir botella"]').click();
      }
    });
  cy.contains('button', exactly('Confirmar')).should('be.visible');
};

const register = (kind: MovementKind, bottles: number, reason?: string) => {
  openCapture(kind);
  if (kind === 'salida') chooseLocation('Bodega', 'default');
  if (kind === 'traspaso') {
    chooseLocation('Desde', 'default');
    chooseLocation('Hacia', 'other');
  }
  if (reason) fieldLabelled('Motivo').type(reason);
  addBottles(bottles);
  cy.contains('button', exactly('Confirmar')).click();
  dialog().contains('button', exactly('Confirmar')).click();
  cy.location('pathname').should('match', /^\/movements\/[0-9a-f-]{36}$/);
  cy.location('pathname').then((path) => {
    scenario.movementId = path.split('/').pop();
    scenario.movementCancelled = false;
  });
  cy.get('main h1')
    .invoke('text')
    .then((code) => {
      scenario.movementCode = code;
    });
};

const cancelWith = (reason: string) => {
  cy.contains('main button', exactly('Anular')).click();
  fieldLabelled('Motivo', '[role="dialog"]').type(reason);
  dialog().contains('button', exactly('Anular')).click();
  cy.get('main h1 + div').should('contain.text', 'anulado');
  cy.then(() => {
    scenario.movementCancelled = true;
  });
};

When('ella registra un(a) {kind} de {int} botella(s)', (kind: MovementKind, bottles: number) =>
  register(kind, bottles),
);

When('ella registró un(a) {kind} de {int} botella(s)', (kind: MovementKind, bottles: number) =>
  register(kind, bottles),
);

When(
  'ella registra un(a) {kind} de {int} botella(s) con el motivo {string}',
  (kind: MovementKind, bottles: number, reason: string) => register(kind, bottles, reason),
);

When('ella abre la captura de {kind}', (kind: MovementKind) => openCapture(kind));

When('ella abre la captura de {kind} en la bodega por defecto', (kind: MovementKind) => {
  openCapture(kind);
  chooseLocation('Bodega', 'default');
});

When('ella añade {int} botella(s) del primer producto disponible', (bottles: number) =>
  addBottles(bottles),
);

When('ella escribe el motivo {string}', (reason: string) => {
  // An empty example stands for leaving the field as it is.
  fieldLabelled('Motivo').should('be.visible');
  if (reason) fieldLabelled('Motivo').type(reason);
});

// The button is aria-disabled, not disabled, so pressing it still says what is missing.
When('ella intenta confirmar el movimiento', () => {
  cy.contains('button', exactly('Confirmar')).should('have.attr', 'aria-disabled', 'true').click();
});

When('ella pide confirmar el movimiento pero vuelve atrás', () => {
  cy.contains('button', exactly('Confirmar')).click();
  dialog().contains('button', exactly('Volver')).click();
  dialog().should('not.exist');
});

Then('a ese producto le queda una unidad menos de las que tiene en existencia', () => {
  chosenCard()
    .find('p')
    .contains('en existencia')
    .should(($p) => {
      const [onHand, left] = figuresOf($p.text());
      expect(onHand).to.be.greaterThan(0);
      expect(left).to.eq(onHand - 1);
    });
});

Then('el aviso de lo que falta dice {string}', (message: string) => {
  cy.get('main [role="alert"]').should('contain.text', message);
});

Then(
  'ella ve el movimiento de tipo {string} en estado {string}',
  (type: string, status: string) => {
    cy.get('main h1 + div').should(($badges) => {
      const text = $badges.text().toLocaleLowerCase('es');
      expect(text).to.contain(status);
      expect(text).to.contain(type.toLocaleLowerCase('es'));
    });
    cy.get('main h1').invoke('text').should('match', /^MOV-/);
  },
);

Then('las líneas del movimiento son {string}', (quantity: string) => {
  cy.get('main ul > li > span:last-child').should(($spans) => {
    expect($spans.toArray().map((span) => span.textContent)).to.deep.eq([quantity]);
  });
});

Then('el movimiento tiene {int} líneas', (count: number) => {
  cy.contains('main h2', /^Líneas/).should('have.text', `Líneas (${count})`);
});

const detail = (label: string) => cy.contains('main dl dt', exactly(label)).next('dd');

Then('el dato {string} del movimiento es {string}', (label: string, value: string) => {
  detail(label).should('have.text', value);
});

Then('el dato {string} del movimiento aparece', (label: string) => {
  detail(label).should('exist');
});

Then('el movimiento ya no ofrece anularlo', () => {
  cy.contains('main button', exactly('Anular')).should('not.exist');
});

Then('el código del movimiento no cambió', () => {
  cy.get('main h1').should(($h1) => expect($h1.text()).to.eq(scenario.movementCode));
});

When('ella anula el movimiento con el motivo {string}', (reason: string) => cancelWith(reason));

When('ella consulta en la API las existencias del producto del movimiento', () => {
  cy.request({ url: api(`/movements/${scenario.movementId}`), headers: authorised() })
    .then(({ body }) => {
      scenario.stockProductId = body.items[0].productId;
      scenario.stockLocationId = body.items[0].locationId;
      return stockOnHand();
    })
    .then((onHand) => {
      scenario.stockBefore = onHand;
    });
});

Then('las existencias de ese producto en la API cambiaron en {int}', (change: number) => {
  stockOnHand().then((onHand) => expect(onHand - scenario.stockBefore!).to.eq(change));
});

When('ella intenta anular el movimiento sin escribir un motivo', () => {
  cy.contains('main button', exactly('Anular')).click();
  dialog().contains('button', exactly('Anular')).click();
});

Then('el motivo de la anulación dice {string}', (message: string) => {
  dialog().find('p.text-danger').should('contain.text', message);
});

When('ella decide conservar el movimiento', () => {
  dialog().contains('button', exactly('Conservarlo')).click();
  dialog().should('not.exist');
});
