import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Integration tests run against a separate local PostgreSQL test database
// (design §16.1, DS-11). TEST_DATABASE_URL comes from the environment or the
// gitignored apps/api/.env and is never committed; the reset helper refuses any
// database whose name does not end in "_test".
const envPath = new URL('./.env', import.meta.url);
const localEnv = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? localEnv.TEST_DATABASE_URL ?? '';

export default defineConfig({
  resolve: {
    alias: [
      // apps/api runs its test suite before any workspace build step (see
      // AUTH01-TASK-12's install -> lint -> typecheck -> test -> build order).
      // @pmocore/shared and @pmocore/database only expose types/JS through
      // their built `dist/`, which is gitignored and may not exist yet, so
      // point Vitest's resolver straight at each package's source entry point
      // instead. This is test-only: it does not touch runtime package exports
      // or the production build, which still resolve both packages normally
      // through node_modules -> dist.
      {
        find: /^@pmocore\/shared$/,
        replacement: fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
      },
      {
        find: /^@pmocore\/database$/,
        replacement: fileURLToPath(new URL('../../database/src/index.ts', import.meta.url)),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Integration test files share one database; run files one at a time.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl || 'postgresql://test:test@localhost:5432/pmocore_test',
      DATABASE_SSL: 'disable',
      TEST_DATABASE_URL: testDatabaseUrl,
      LOG_LEVEL: 'error',
      APP_ORIGIN: 'http://localhost:5173',
      // Synthetic test-only secret; not used in any real environment.
      SESSION_SECRET: 'test-only-session-secret-0123456789abcdef',
      ATTACHMENT_STORAGE_DIR: './.data/test-attachments',
    },
  },
});
