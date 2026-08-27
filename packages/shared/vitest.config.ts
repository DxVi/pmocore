import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // No shared-utility test is required in AUTH01-TASK-09; this workspace has
    // no *.test.ts files yet. See apps/web/vitest.config.ts for why
    // passWithNoTests is the correct, non-weakening way to keep that a clean
    // success instead of Vitest's default "no test files found" failure.
    passWithNoTests: true,
  },
});
