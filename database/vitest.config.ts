import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

// Integration tests use a separate local PostgreSQL test database (design §16.1, DS-11).
// TEST_DATABASE_URL is read from the environment or the gitignored apps/api/.env; it is
// never committed. Destructive helpers refuse any database whose name does not end in "_test".
const apiEnvPath = new URL('../apps/api/.env', import.meta.url);
const localEnv = existsSync(apiEnvPath) ? parseEnv(readFileSync(apiEnvPath, 'utf8')) : {};
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? localEnv.TEST_DATABASE_URL ?? '';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Integration test files share one database; run them one at a time.
    fileParallelism: false,
    env: {
      // Satisfies config.ts's eager, module-load-time validation of the real
      // process.env (mirroring apps/api's env module) so importing
      // connection.ts/config.ts anywhere in this workspace's test run never
      // throws. The actual SSL-mode test cases below call loadDatabaseConfig()
      // directly with their own explicit env objects — they never read these.
      DATABASE_URL: 'postgresql://placeholder:placeholder@localhost:5432/pmocore_placeholder',
      DATABASE_SSL: 'require',
      TEST_DATABASE_URL: testDatabaseUrl,
    },
  },
});
