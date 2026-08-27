import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // apps/api runs its test suite before any workspace build step (see
      // AUTH01-TASK-12's install -> lint -> typecheck -> test -> build order).
      // @pmocore/shared and @pmocore/database only expose types/JS through
      // their built `dist/`, which is gitignored and may not exist yet, so
      // point Vitest's resolver straight at each package's source entry point
      // instead. This is test-only: it does not touch runtime package exports
      // or the production build, which still resolve both packages normally
      // through node_modules -> dist.
      '@pmocore/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
      '@pmocore/database': fileURLToPath(new URL('../../database/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/pmocore_test',
      LOG_LEVEL: 'error',
    },
  },
});
