import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import eyesPlugin from '@applitools/eyes-cypress';
import { defineConfig } from 'cypress';
import type { Plugin } from 'esbuild';
import { rmSync } from 'node:fs';

try {
  process.loadEnvFile();
} catch {
  // No .env: the variables may come from the shell.
}

// The API allows 10 sign-ins a minute; kept in Node so the gap spans every spec.
const SIGN_IN_GAP_MS = 7_000;
let nextSignInAt = 0;

// @applitools/eyes-cypress/commands pulls in the full @applitools/eyes Node SDK for
// its error classes, which statically requires Node builtins (stream, crypto, ...)
// that only its server-side code path uses. Webpack silently stubs these for a
// browser bundle; esbuild does not, so the support file fails to bundle without this.
const NODE_BUILTINS = [
  'stream',
  'buffer',
  'crypto',
  'util',
  'events',
  'os',
  'path',
  'fs',
  'net',
  'tls',
  'http',
  'https',
  'zlib',
  'url',
  'child_process',
  'dns',
  'module',
  'assert',
  'querystring',
  'string_decoder',
  'timers',
  'tty',
  'constants',
  'vm',
  'http2',
  'worker_threads',
  'perf_hooks',
  'readline',
  'process',
  'fs/promises',
];

const stubNodeBuiltinsPlugin: Plugin = {
  name: 'stub-node-builtins',
  setup(build) {
    const filter = new RegExp(`^(${NODE_BUILTINS.join('|')})$`);
    build.onResolve({ filter }, (args) => ({ path: args.path, namespace: 'stub-node-builtins' }));
    build.onLoad({ filter: /.*/, namespace: 'stub-node-builtins' }, () => ({
      contents: 'module.exports = {};',
      loader: 'js',
    }));
  },
};

export default eyesPlugin(
  defineConfig({
    e2e: {
      baseUrl: 'https://beverage-ledger.vercel.app',
      specPattern: 'tests/cypress/features/**/*.feature',
      supportFile: 'tests/cypress/support/e2e.ts',
      fixturesFolder: false,
      screenshotsFolder: 'reports/cypress/screenshots',
      downloadsFolder: 'reports/cypress/downloads',
      videosFolder: 'reports/cypress/videos',
      viewportWidth: 1280,
      viewportHeight: 800,
      // The API sleeps on Render's free tier; its first response can take ~30s.
      defaultCommandTimeout: 30_000,
      expose: {
        apiUrl: 'https://beverage-ledger-api.onrender.com',
      },
      env: {
        TEST_USER_EMAIL: process.env.TEST_USER_EMAIL,
        TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD,
      },
      async setupNodeEvents(on, config) {
        await addCucumberPreprocessorPlugin(on, config);
        on(
          'file:preprocessor',
          createBundler({ plugins: [createEsbuildPlugin(config), stubNodeBuiltinsPlugin] }),
        );
        on('task', {
          waitForSignInTurn() {
            const wait = Math.max(0, nextSignInAt - Date.now());
            nextSignInAt = Date.now() + wait + SIGN_IN_GAP_MS;
            return wait;
          },
          clearDownloads() {
            rmSync(config.downloadsFolder, { recursive: true, force: true });
            return null;
          },
        });
        return config;
      },
    },
  }),
);
