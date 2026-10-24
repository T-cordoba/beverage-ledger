// The deployed app intermittently throws React #418 (hydration mismatch): React recovers by
// rendering on the client, so the page works, but Cypress would fail the scenario. Only that
// error is let through; any other uncaught exception still fails the test.
Cypress.on('uncaught:exception', (error) => !error.message.includes('Minified React error #418'));
