import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './support/env';

/**
 * Playwright Test Agents suite (RF-15, 16, 17, 18, 20 and 21). Every path below
 * resolves against this file, so the same config works from the repo root
 * (`npx playwright test --config=tests/IA/Playwright-Test-Agents/playwright.config.ts`)
 * and from this folder, which is where the agents' MCP server starts.
 */
export default defineConfig({
  // The suites sit at the top of this folder; reports/ and agents/ hold evidence.
  testDir: '.',
  testMatch: '*.spec.ts',
  // The seed is the agents' starting page, not a test of the suite.
  testIgnore: ['reports/**', 'agents/**', ...(process.env.PW_AGENTS ? [] : ['seed.spec.ts'])],
  outputDir: './reports/artifacts',
  // One shared manager session per worker (see support/fixtures.ts), and the
  // write scenarios move the same stock, so the suite runs in series.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Playwright runs every reporter even for `--list`, which rewrote the last
  // run's HTML report and JUnit file with an empty one.
  reporter: process.argv.includes('--list')
    ? [['list']]
    : [
        ['list'],
        ['html', { outputFolder: './reports/html', open: 'never' }],
        ['junit', { outputFile: './reports/junit.xml' }],
      ],
  use: {
    baseURL: BASE_URL,
    // Playwright's default is no limit at all: a click on a button that never
    // becomes actionable hung the agents' MCP browser for good instead of failing.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on',
    screenshot: 'on',
    acceptDownloads: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
