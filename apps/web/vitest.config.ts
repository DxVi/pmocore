import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // No component test is required in AUTH01-TASK-09; this workspace has no
    // *.test.tsx files yet. Vitest's default behavior is to fail a run that
    // finds zero test files, so passWithNoTests keeps this an expected, clean
    // "no tests" success rather than a false failure.
    passWithNoTests: true,
  },
});
