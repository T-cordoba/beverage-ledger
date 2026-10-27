import { expect, test } from './support/fixtures';

// The environment the Planner, Generator and Healer agents start from: a manager
// already signed in, sitting on the panel. Only collected when PW_AGENTS is set
// (see playwright.config.ts), so it never counts as one of the suite's tests.
test.describe('Seed', () => {
  test('seed', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
  });
});
