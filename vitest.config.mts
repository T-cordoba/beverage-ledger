import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// The tests talk to the real API, so they need the same variables `next dev`
// reads. Vite only exposes them to the browser bundle, and these run in Node.
process.env = { ...process.env, ...loadEnv('test', process.cwd(), '') };

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    // One file at a time: several of them write to the same database.
    fileParallelism: false,
  },
});
