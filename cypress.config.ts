import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { defineConfig } from 'cypress';

try {
  process.loadEnvFile();
} catch {
  // No .env: the variables may come from the shell.
}

// The API allows 10 sign-ins a minute; kept in Node so the gap spans every spec.
const SIGN_IN_GAP_MS = 7_000;
let nextSignInAt = 0;

export default defineConfig({
  e2e: {
    baseUrl: 'https://beverage-ledger.vercel.app',
    specPattern: 'tests/cypress/features/**/*.feature',
    supportFile: 'tests/cypress/support/e2e.ts',
    fixturesFolder: false,
    screenshotsFolder: 'reports/cypress/screenshots',
    videosFolder: 'reports/cypress/videos',
    viewportWidth: 1280,
    viewportHeight: 800,
    // The API sleeps on Render's free tier; its first response can take ~30s.
    defaultCommandTimeout: 30_000,
    env: {
      TEST_USER_EMAIL: process.env.TEST_USER_EMAIL,
      TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD,
    },
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on('file:preprocessor', createBundler({ plugins: [createEsbuildPlugin(config)] }));
      on('task', {
        waitForSignInTurn() {
          const wait = Math.max(0, nextSignInAt - Date.now());
          nextSignInAt = Date.now() + wait + SIGN_IN_GAP_MS;
          return wait;
        },
      });
      return config;
    },
  },
});
