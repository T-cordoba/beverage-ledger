import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

process.env = { ...process.env, ...loadEnv('test', process.cwd(), '') };

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    fileParallelism: false,
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
        'src/features/movements/api.ts',
        'src/features/movements/useMovementDraft.ts',
        'src/features/reports/range.ts',
        'src/features/stock/api.ts',
        'src/features/stock/quantity.ts',
        'src/lib/api/client.ts',
        'src/lib/api/errors.ts',
        'src/lib/api/session.ts',
        'src/lib/hooks/usePagination.ts',
      ],
    },
  },
});
