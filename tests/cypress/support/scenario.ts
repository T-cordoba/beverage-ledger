/** What a scenario learns along the way; reset before each one by the Before hook. */
export const scenario: {
  accessToken?: string;
  movementId?: string;
  movementCode?: string;
  movementCancelled?: boolean;
  chosenProduct?: string;
  stockProductId?: string;
  stockLocationId?: string;
  stockBefore?: number;
} = {};

export const api = (path: string) => `${Cypress.expose('apiUrl')}/api/v1${path}`;

export const authorised = () => ({ Authorization: `Bearer ${scenario.accessToken}` });
