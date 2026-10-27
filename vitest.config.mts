import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';

process.env = { ...process.env, ...loadEnv('test', process.cwd(), '') };

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    fileParallelism: false,
    // Playwright Test Agent specs live under tests/ for repository organization,
    // but they must only be collected by Playwright, never by Vitest.
    exclude: [...configDefaults.exclude, 'tests/IA/Playwright-Test-Agents/**'],
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      // Whitelist, not discovery: only the modules a test actually executes.
      // Mirrored by sonar.coverage.exclusions in sonar-project.properties.
      include: [
        'src/config/api.ts',
        'src/config/dashboard.ts',
        'src/config/shortcuts.ts',
        'src/features/admin/audit-actions.ts',
        'src/features/movements/api.ts',
        'src/features/movements/open-draft.ts',
        'src/features/movements/useMovementDraft.ts',
        'src/features/preferences/preferences.ts',
        'src/features/preferences/usePreferences.ts',
        'src/features/reports/api.ts',
        'src/features/reports/keys.ts',
        'src/features/reports/range.ts',
        'src/features/stock/api.ts',
        'src/features/stock/keys.ts',
        'src/features/stock/low-stock.ts',
        'src/features/stock/quantity.ts',
        'src/lib/api/client.ts',
        'src/lib/api/errors.ts',
        'src/lib/api/session.ts',
        'src/lib/api/useDescribeError.ts',
        'src/lib/hooks/pagination.ts',
        'src/lib/hooks/useDebouncedValue.ts',
        'src/lib/hooks/useShortcut.ts',
      ],
    },
  },
});
