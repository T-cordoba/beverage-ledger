import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';

process.env = { ...process.env, ...loadEnv('test', process.cwd(), '') };

// These four sign in against a running API and rf-09 writes to it. The Jenkins
// pipeline has no database of its own, so it sets SKIP_LIVE_API_TESTS and runs
// the rest. Unset — local runs and GitHub Actions — the whole suite runs.
// The list lives here rather than behind `--exclude`, which replaces Vitest's
// own defaults instead of extending them and would drag node_modules back in.
const LIVE_API_SUITES = [
  'tests/rf-01-front-handle-submit.test.ts',
  'tests/rf-03-front-accept-invite-form.test.ts',
  'tests/rf-09-front-submit.test.ts',
  'tests/rf-29-front-change-status.test.ts',
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    fileParallelism: false,
    exclude: [
      ...configDefaults.exclude,
      ...(process.env.SKIP_LIVE_API_TESTS === 'true' ? LIVE_API_SUITES : []),
    ],
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
        'src/features/admin/audit-actions.ts',
        'src/features/movements/open-draft.ts',
        'src/features/movements/useMovementDraft.ts',
        'src/features/reports/range.ts',
        'src/features/stock/low-stock.ts',
        'src/features/stock/quantity.ts',
        'src/lib/api/client.ts',
        'src/lib/api/errors.ts',
        'src/lib/api/session.ts',
        'src/lib/hooks/pagination.ts',
        'src/lib/hooks/useDebouncedValue.ts',
      ],
    },
  },
});
