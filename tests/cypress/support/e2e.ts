// Intermittent hydration mismatch in production that React recovers from; see README.
Cypress.on('uncaught:exception', (error) => !error.message.includes('Minified React error #418'));
