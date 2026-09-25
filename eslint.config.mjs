import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

const API_TS_GLOBS = ['apps/api/**/*.{ts,tsx}'];
const PROJECT_SERVICE_TS_GLOBS = [
  'database/**/*.{ts,tsx}',
  'packages/shared/**/*.{ts,tsx}',
  'apps/web/**/*.{ts,tsx}',
];
const NODE_TS_GLOBS = [...API_TS_GLOBS, 'database/**/*.{ts,tsx}', 'packages/shared/**/*.{ts,tsx}'];
const WEB_TS_GLOBS = ['apps/web/**/*.{ts,tsx}'];

const TYPE_CHECKED_EXTENDS = [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked];
const NO_UNUSED_VARS_RULE = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
};

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },
  {
    files: ['*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Type-aware linting for database, shared, and web via TypeScript's project
    // service, which auto-discovers each workspace's own tsconfig.json.
    files: PROJECT_SERVICE_TS_GLOBS,
    extends: TYPE_CHECKED_EXTENDS,
    languageOptions: {
      parserOptions: {
        // drizzle.config.ts lives outside database/tsconfig.json's "src"-scoped
        // include (it must stay excluded from that build so `tsc` doesn't try to
        // emit it under rootDir); allowDefaultProject lets it still be type-aware
        // linted, and defaultProject gives that fallback program access to the
        // repo's normal compiler options (e.g. Node ambient types) instead of
        // TypeScript's bare defaults.
        projectService: {
          // database/tsconfig.json excludes test files from its own "src"
          // include (see AUTH01-TASK-12A) so `tsc`'s real build never emits
          // them into dist/; allowDefaultProject keeps them type-aware linted
          // via the lightweight default-project fallback instead.
          allowDefaultProject: [
            'database/drizzle.config.ts',
            'database/vitest.config.ts',
            'database/src/__tests__/*.test.ts',
            'packages/shared/vitest.config.ts',
            'packages/shared/src/__tests__/*.test.ts',
          ],
          defaultProject: 'tsconfig.base.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: NO_UNUSED_VARS_RULE,
  },
  {
    // apps/api imports @pmocore/shared and @pmocore/database. Those workspace
    // packages only expose types through their built `dist/` output, which is
    // gitignored and may not exist yet (e.g. right after a clean install, before
    // any build step has run — exactly the state root `npm run lint` and
    // `npm run typecheck` run in, per their install -> lint -> typecheck -> test
    // -> build ordering). apps/api's own tsconfig.json can't path-map around
    // this: it sets rootDir/outDir for its real `dist` build, and TypeScript
    // refuses to resolve an import outside rootDir (TS6059) once emit is in
    // play. tsconfig.typecheck.json is a lint/typecheck-only sibling with no
    // rootDir/outDir that path-maps both packages straight to their source, so
    // type-aware linting (and the root `typecheck` script) never depend on a
    // prior build. It is never used by `npm run build`, which still runs
    // against apps/api/tsconfig.json unchanged.
    files: API_TS_GLOBS,
    extends: TYPE_CHECKED_EXTENDS,
    languageOptions: {
      parserOptions: {
        project: ['apps/api/tsconfig.typecheck.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: NO_UNUSED_VARS_RULE,
  },
  {
    files: NODE_TS_GLOBS,
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: WEB_TS_GLOBS,
    extends: [
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: { ...globals.browser },
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  eslintConfigPrettier,
);
