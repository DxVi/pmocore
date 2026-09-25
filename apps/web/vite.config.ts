import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// DS-04: during development (`vite` dev server) runtime imports of @pmocore/shared
// resolve to its TypeScript source, so no prerequisite build is needed. Production
// builds (`vite build`) resolve the compiled package, which the root build creates first.
const sharedSource = fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url));

export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      ...(command === 'serve' ? { '@pmocore/shared': sharedSource } : {}),
    },
  },
  server: {
    port: 5173,
    // Same model as the Vercel deployment: the browser calls same-origin /api and
    // the dev server forwards it to the API (PMOCORE_API_ORIGIN, default local API).
    proxy: {
      '/api': {
        target: process.env.PMOCORE_API_ORIGIN ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}));
