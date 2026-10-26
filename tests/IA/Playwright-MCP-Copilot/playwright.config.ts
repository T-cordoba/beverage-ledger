import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './support/env';

/**
 * Suite written by GitHub Copilot (agent mode) from what it observed through
 * Playwright MCP. Specs are `*.pw.ts`, not `*.spec.ts`, so the repo's Vitest
 * never collects them. Paths resolve against this file, so it runs from here or
 * from the repo root with `--config`.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  outputDir: './reports/artifacts',
  // One shared Manager session (support/fixtures.ts) and the write scenarios move
  // the same stock, so the suite runs in series.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.argv.includes('--list')
    ? [['list']]
    : [
        ['list'],
        ['html', { outputFolder: './reports/html', open: 'never' }],
        ['junit', { outputFile: './reports/junit.xml' }],
      ],
  use: {
    baseURL: BASE_URL,
    // Without it a click on a never-actionable button waits forever.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    acceptDownloads: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
