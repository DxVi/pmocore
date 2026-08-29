import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      // Satisfies config.ts's eager, module-load-time validation of the real
      // process.env (mirroring apps/api's env module) so importing
      // connection.ts/config.ts anywhere in this workspace's test run never
      // throws. The actual SSL-mode test cases below call loadDatabaseConfig()
      // directly with their own explicit env objects — they never read these.
      DATABASE_URL: 'postgresql://placeholder:placeholder@localhost:5432/pmocore_placeholder',
      DATABASE_SSL: 'require',
    },
  },
});
