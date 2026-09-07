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
    // Los tests que todavia escriben en la API real no se pueden solapar.
    fileParallelism: false,
    env: {
      // src/config/api.ts lanza al importarse si falta, y hasta los tests que no
      // salen a la red importan el cliente.
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
    },
  },
});
