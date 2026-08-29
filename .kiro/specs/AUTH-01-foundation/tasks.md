# AUTH-01 — Repository & Application Foundation: Implementation Tasks

## Task Execution Rules

- Tasks MUST be completed in sequential order.
- Each task MUST be independently verifiable before proceeding.
- Do NOT combine tasks or skip ahead.
- Each task traces to specific requirements from `requirements.md`.

---

## AUTH01-TASK-01: Initialize Repository & Root Workspace Configuration

### Objective
Create the root monorepo structure with npm workspaces, root package.json, and shared TypeScript configuration.

### Affected Files
- `package.json` (root)
- `tsconfig.base.json`
- `.gitignore`
- `.env.example`

### Requirements Covered
- AUTH01-REQ-001, AUTH01-REQ-002, AUTH01-REQ-004
- AUTH01-REQ-025, AUTH01-REQ-026, AUTH01-REQ-027
- AUTH01-REQ-063, AUTH01-REQ-064

### Details
1. Create root `package.json` with:
   - `name`: `pmocore`
   - `private`: true
   - `workspaces`: `["apps/*", "packages/*", "database"]`
   - No scripts yet (added in later task)
2. Create `tsconfig.base.json` with strict TypeScript options:
   - `strict: true`
   - `esModuleInterop: true`
   - `skipLibCheck: true`
   - `forceConsistentCasingInFileNames: true`
   - `resolveJsonModule: true`
   - `declaration: true`
   - `declarationMap: true`
   - `sourceMap: true`
   - Target: `ES2022`, Module: `Node16` / `NodeNext`
3. Create `.gitignore` excluding: `node_modules/`, `dist/`, `.env`, `.env.local`, `.env.*.local`, `coverage/`, `.DS_Store`, `Thumbs.db`, `*.log`
4. Create `.env.example` with documented placeholder variables

### Acceptance Criteria
- [ ] Root `package.json` exists with workspaces defined
- [ ] `tsconfig.base.json` exists with strict mode enabled
- [ ] `.gitignore` covers all required exclusions
- [ ] `.env.example` documents NODE_ENV, PORT, DATABASE_URL, LOG_LEVEL
- [ ] No `node_modules` or `.env` is committed

---

## AUTH01-TASK-02: Create Shared Package Foundation

### Objective
Create the `packages/shared` workspace with TypeScript configuration, barrel exports, and initial API contract types/schemas.

### Affected Files
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/schemas/api.ts`
- `packages/shared/src/schemas/health.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/utils/index.ts`

### Requirements Covered
- AUTH01-REQ-003, AUTH01-REQ-016, AUTH01-REQ-017, AUTH01-REQ-018

### Details
1. Create `packages/shared/package.json`:
   - Name: `@pmocore/shared`
   - Main/types entry points
   - Dependencies: `zod`
2. Create `tsconfig.json` extending `../../tsconfig.base.json`
3. Define API response envelope schemas in `src/schemas/api.ts`:
   - `ApiSuccessResponseSchema<T>` — `{ success: true, data: T, meta?: PaginationMeta }`
   - `ApiErrorResponseSchema` — `{ success: false, error: { code, message, details? } }`
   - `PaginationMetaSchema` — `{ page, pageSize, totalItems, totalPages }`
4. Define health response schema in `src/schemas/health.ts`:
   - `HealthResponseSchema` — `{ status, timestamp, version, database }`
5. Export all schemas and inferred types from `src/index.ts`

### Acceptance Criteria
- [ ] `packages/shared/package.json` is valid with correct name and Zod dependency
- [ ] TypeScript configuration extends base and compiles without errors
- [ ] API envelope schemas are defined and exported
- [ ] Health response schema is defined and exported
- [ ] All types are inferred from Zod schemas (single source of truth)
- [ ] Barrel export in `index.ts` exposes all public APIs

---

## AUTH01-TASK-03: Create Database Package Foundation

### Objective
Create the `database` workspace with Drizzle ORM configuration, PostgreSQL connection module, and empty schema/migration/seed directories.

### Affected Files
- `database/package.json`
- `database/tsconfig.json`
- `database/drizzle.config.ts`
- `database/src/connection.ts`
- `database/src/schema/index.ts`
- `database/src/index.ts`
- `database/migrations/.gitkeep`
- `database/seeds/.gitkeep`

### Requirements Covered
- AUTH01-REQ-003, AUTH01-REQ-019, AUTH01-REQ-020, AUTH01-REQ-021
- AUTH01-REQ-022, AUTH01-REQ-023

### Details
1. Create `database/package.json`:
   - Name: `@pmocore/database`
   - Dependencies: `drizzle-orm`, `pg`
   - Dev dependencies: `drizzle-kit`, `@types/pg`
2. Create `tsconfig.json` extending `../tsconfig.base.json`
3. Create `drizzle.config.ts` pointing to schema and migrations directories
4. Create `src/connection.ts`:
   - Create a `pg` Pool with `DATABASE_URL`
   - SSL enabled for Neon
   - Export pool and drizzle instance
5. Create `src/schema/index.ts` as empty barrel (no tables in AUTH-01)
6. Create `src/index.ts` exporting connection and schema
7. Place `.gitkeep` in `migrations/` and `seeds/`

### Acceptance Criteria
- [ ] `database/package.json` is valid with Drizzle and pg dependencies
- [ ] `drizzle.config.ts` is valid configuration
- [ ] `connection.ts` creates a Pool with SSL and exports `db` (Drizzle instance) and `pool`
- [ ] Schema barrel exists (empty, ready for table definitions)
- [ ] `migrations/` and `seeds/` directories exist
- [ ] TypeScript compiles without errors

---

## AUTH01-TASK-04: Create Backend Foundation (Express App Shell)

### Objective
Create the `apps/api` workspace with Express 5, environment validation, structured logging, middleware pipeline, and error handling — without any routes yet.

### Affected Files
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/src/index.ts`
- `apps/api/src/app.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/lib/logger.ts`
- `apps/api/src/lib/api-response.ts`
- `apps/api/src/lib/app-error.ts`
- `apps/api/src/middleware/error-handler.ts`
- `apps/api/src/middleware/not-found.ts`
- `apps/api/src/middleware/request-logger.ts`

### Requirements Covered
- AUTH01-REQ-003, AUTH01-REQ-010, AUTH01-REQ-011, AUTH01-REQ-013
- AUTH01-REQ-014, AUTH01-REQ-015, AUTH01-REQ-024, AUTH01-REQ-026
- AUTH01-REQ-028, AUTH01-REQ-029, AUTH01-REQ-030
- AUTH01-REQ-041, AUTH01-REQ-042, AUTH01-REQ-043, AUTH01-REQ-044
- AUTH01-REQ-045, AUTH01-REQ-046, AUTH01-REQ-047, AUTH01-REQ-048
- AUTH01-REQ-067, AUTH01-REQ-069

### Details
1. Create `apps/api/package.json`:
   - Name: `@pmocore/api`
   - Dependencies: `express`, `helmet`, `cors`, `pino`, `pino-http`, `zod`, `dotenv`
   - Dev dependencies: `tsx`, `pino-pretty`, `@types/express`, `@types/cors`
   - Workspace dependencies: `@pmocore/shared`, `@pmocore/database`
   - Scripts: `dev` (tsx watch), `build` (tsc), `start` (node dist/index.js)
2. Create `tsconfig.json` extending base, outDir: `dist`
3. Create `src/config/env.ts`:
   - Zod schema validating NODE_ENV, PORT, DATABASE_URL, LOG_LEVEL
   - Parse `process.env`, export typed `env` object
   - Fail fast with clear error message on validation failure
4. Create `src/lib/logger.ts`:
   - Pino instance with configurable level
   - Pretty transport in development
5. Create `src/lib/app-error.ts`:
   - `AppError` class with statusCode, code, message, details
6. Create `src/lib/api-response.ts`:
   - `sendSuccess(res, data, meta?)` helper
   - `sendError(res, statusCode, code, message, details?)` helper
7. Create `src/middleware/request-logger.ts`:
   - pino-http middleware using the logger instance
8. Create `src/middleware/not-found.ts`:
   - Returns 404 with standard error format for unmatched routes
9. Create `src/middleware/error-handler.ts`:
   - Handles AppError (known) → structured response
   - Handles unknown errors → 500, logs full error, returns safe message
   - In production, never exposes stack traces
10. Create `src/app.ts`:
    - Creates Express app
    - Mounts: helmet, cors, express.json(), request-logger, (routes placeholder), not-found, error-handler
    - Exports app
11. Create `src/index.ts`:
    - Loads dotenv (development)
    - Validates env
    - Initializes logger
    - Imports app
    - Starts HTTP server
    - Logs startup message

### Acceptance Criteria
- [ ] Backend starts without errors when DATABASE_URL is provided
- [ ] Missing environment variables cause immediate startup failure with clear message
- [ ] Request logging outputs method, URL, status, response time
- [ ] Unknown routes return 404 in standard error format
- [ ] Thrown errors are caught and returned in standard error format
- [ ] No stack traces in responses when NODE_ENV=production
- [ ] Helmet security headers are present in responses
- [ ] CORS headers are present

---

## AUTH01-TASK-05: Implement Health Check Endpoint

### Objective
Add the `GET /api/health` route that verifies API and database status.

### Affected Files
- `apps/api/src/routes/health.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/src/app.ts` (mount routes)

### Requirements Covered
- AUTH01-REQ-012, AUTH01-REQ-036, AUTH01-REQ-037, AUTH01-REQ-038
- AUTH01-REQ-039, AUTH01-REQ-040

### Details
1. Create `src/routes/health.ts`:
   - Import database pool from `@pmocore/database`
   - Execute `SELECT 1` to verify connectivity
   - On success: `database: "connected"`, `status: "healthy"`
   - On failure: `database: "disconnected"`, `status: "degraded"` (log error, don't expose)
   - Include `timestamp` (ISO 8601) and `version` (from package.json or env)
   - Return 200 always
   - Use `sendSuccess` helper
2. Create `src/routes/index.ts`:
   - Router barrel that mounts health route at `/health`
3. Update `src/app.ts` to mount routes at `/api`

### Acceptance Criteria
- [ ] `GET /api/health` returns 200 with `{ success: true, data: { status, timestamp, version, database } }`
- [ ] When database is reachable: `status: "healthy"`, `database: "connected"`
- [ ] When database is unreachable: `status: "degraded"`, `database: "disconnected"`, still returns 200
- [ ] No sensitive information (connection string, hostnames, error details) in response
- [ ] Response conforms to shared `HealthResponseSchema`

---

## AUTH01-TASK-06: Create Frontend Foundation (React/Vite Shell)

### Objective
Create the `apps/web` workspace with React, Vite, TypeScript, and all specified frontend dependencies. Render a minimal application shell.

### Affected Files
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/vite.config.ts`
- `apps/web/index.html`
- `apps/web/src/main.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/vite-env.d.ts`
- `apps/web/src/pages/` (placeholder)
- `apps/web/src/components/` (placeholder)
- `apps/web/src/hooks/` (placeholder)
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/providers/QueryProvider.tsx`
- `apps/web/public/`

### Requirements Covered
- AUTH01-REQ-003, AUTH01-REQ-005, AUTH01-REQ-006, AUTH01-REQ-007
- AUTH01-REQ-008, AUTH01-REQ-009
- AUTH01-REQ-070, AUTH01-REQ-071, AUTH01-REQ-072

### Details
1. Create `apps/web/package.json`:
   - Name: `@pmocore/web`
   - Dependencies: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `bootstrap`, `lucide-react`, `date-fns`
   - Dev dependencies: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`
   - Workspace dependency: `@pmocore/shared`
   - Scripts: `dev`, `build`, `preview`
2. Create `vite.config.ts`:
   - React plugin
   - Resolve alias: `@/` → `src/`
   - Dev server proxy: `/api` → `http://localhost:3001`
3. Create `tsconfig.json` extending base, with path aliases
4. Create `index.html` with root div and responsive viewport meta tag (`<meta name="viewport" content="width=device-width, initial-scale=1.0">`)
5. Create `src/main.tsx` — renders App with providers
6. Create `src/App.tsx` — minimal responsive shell (heading + health status indicator placeholder, uses fluid layout)
7. Create `src/providers/QueryProvider.tsx` — TanStack Query client provider
8. Create `src/lib/api-client.ts` — typed fetch utility for /api calls
9. Create directory placeholders: `pages/`, `components/`, `hooks/`, `types/`, `assets/`

### Acceptance Criteria
- [ ] `npm run dev` in apps/web starts Vite dev server
- [ ] Browser displays minimal application shell
- [ ] `/api` requests are proxied to backend in development
- [ ] All specified dependencies are installed
- [ ] TypeScript compiles without errors
- [ ] `@pmocore/shared` is consumable from frontend code
- [ ] Viewport meta tag is present in index.html
- [ ] Application shell renders without horizontal overflow on mobile viewports (375px)

---

## AUTH01-TASK-07: Implement Theme & Design Token System

### Objective
Create the centralized theme/design-token architecture with CSS custom properties, theme files, and React ThemeProvider. The focus is architectural: establish the token mechanism and functional switching. Detailed visual refinement of individual theme palettes is not required.

### Affected Files
- `apps/web/src/styles/tokens/_base.css`
- `apps/web/src/styles/tokens/light.css`
- `apps/web/src/styles/tokens/dark.css`
- `apps/web/src/styles/tokens/emerald.css`
- `apps/web/src/styles/tokens/ocean.css`
- `apps/web/src/styles/tokens/rustic.css`
- `apps/web/src/styles/tokens/etch.css`
- `apps/web/src/styles/_variables.css`
- `apps/web/src/styles/global.css`
- `apps/web/src/providers/ThemeProvider.tsx`
- `apps/web/src/hooks/useTheme.ts`
- `apps/web/src/main.tsx` (add ThemeProvider)
- `apps/web/src/App.tsx` (add theme toggle for verification)

### Requirements Covered
- AUTH01-REQ-031, AUTH01-REQ-032, AUTH01-REQ-033, AUTH01-REQ-034, AUTH01-REQ-035
- AUTH01-REQ-071, AUTH01-REQ-073

### Details
1. Create `styles/tokens/_base.css` — structural tokens (spacing, radius, typography, shadows, responsive breakpoints)
2. Create theme color files (light, dark, emerald, ocean, rustic, etch):
   - Each defines color tokens scoped to `[data-theme="<name>"]`
   - Covers: backgrounds, text, accent, borders, sidebar, status colors
3. Create `styles/_variables.css` — imports all token files
4. Create `styles/global.css` — resets, Bootstrap import, global responsive styles using tokens; includes responsive utility foundations (no fixed-width containers, fluid defaults)
5. Create `ThemeProvider.tsx`:
   - React context with `theme` state and `setTheme` function
   - Persists to `localStorage` key `pmocore-theme`
   - Applies `data-theme` attribute to `document.documentElement`
   - Handles "system" theme via `matchMedia` listener
   - Default theme: "system"
6. Create `useTheme.ts` hook — convenience wrapper around ThemeContext
7. Update `main.tsx` to wrap app in ThemeProvider
8. Update `App.tsx` with a simple theme selector for visual verification

### Acceptance Criteria
- [ ] All 7 themes have token files with representative color tokens (visual polish deferred)
- [ ] Switching themes changes CSS variables application-wide
- [ ] Theme persists across page reloads (localStorage)
- [ ] "System" theme follows OS dark/light preference
- [ ] No hard-coded colors in component files (all reference `--pmo-*` variables)
- [ ] `data-theme` attribute is set on `<html>` element
- [ ] Architecture supports future theme refinement without structural changes

---

## AUTH01-TASK-08: Configure ESLint & Prettier

### Objective
Set up ESLint (flat config) and Prettier with shared configuration across all workspaces.

### Affected Files
- `eslint.config.mjs` (root)
- `.prettierrc` (root)
- `.prettierignore` (root)
- `apps/web/eslint.config.mjs` (if workspace-specific rules needed)
- `apps/api/eslint.config.mjs` (if workspace-specific rules needed)

### Requirements Covered
- AUTH01-REQ-058, AUTH01-REQ-059, AUTH01-REQ-061, AUTH01-REQ-062

### Details
1. Install ESLint 9+ with TypeScript and React plugins:
   - `eslint`
   - `@eslint/js`
   - `typescript-eslint`
   - `eslint-plugin-react`
   - `eslint-plugin-react-hooks`
   - `eslint-plugin-react-refresh` (Vite HMR)
2. Create root `eslint.config.mjs` (flat config):
   - TypeScript-aware rules
   - React rules for `apps/web`
   - Node rules for `apps/api`
   - Ignore patterns for dist, node_modules, coverage
3. Create `.prettierrc`:
   - `semi: true`
   - `singleQuote: true`
   - `trailingComma: "all"`
   - `printWidth: 100`
   - `tabWidth: 2`
4. Create `.prettierignore`: dist, node_modules, coverage, migrations, `*.md` (optional)
5. Verify: `npm run lint` and `npm run format` execute without configuration errors

### Acceptance Criteria
- [ ] `npm run lint` runs ESLint across all workspaces without config errors
- [ ] `npm run format` runs Prettier across all workspaces
- [ ] TypeScript files are linted with type-aware rules
- [ ] React-specific rules apply to `apps/web`
- [ ] No lint errors in the existing codebase (fix any that appear)

---

## AUTH01-TASK-09: Configure Vitest & Testing Infrastructure

### Objective
Set up Vitest configuration for all workspaces, React Testing Library for frontend, and Supertest for backend. Write the health endpoint test.

### Affected Files
- `apps/api/vitest.config.ts`
- `apps/web/vitest.config.ts`
- `packages/shared/vitest.config.ts`
- `apps/web/src/test/setup.ts` (React Testing Library setup)
- `apps/api/src/__tests__/health.test.ts`
- Root `package.json` (test scripts)

### Requirements Covered
- AUTH01-REQ-049, AUTH01-REQ-050, AUTH01-REQ-051, AUTH01-REQ-052
- AUTH01-REQ-053, AUTH01-REQ-054

### Details
1. Install testing dependencies:
   - Root/shared: `vitest`
   - `apps/web`: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`
   - `apps/api`: `supertest`, `@types/supertest`
2. Create `apps/api/vitest.config.ts`:
   - Environment: node
   - Include: `src/**/*.test.ts`
3. Create `apps/web/vitest.config.ts`:
   - Environment: jsdom
   - Setup file: `src/test/setup.ts`
   - Include: `src/**/*.test.{ts,tsx}`
4. Create `apps/web/src/test/setup.ts`:
   - Import `@testing-library/jest-dom`
5. Create `packages/shared/vitest.config.ts`:
   - Environment: node
6. Create `apps/api/src/__tests__/health.test.ts`:
   - Test: GET /api/health returns 200
   - Test: Response has correct shape (success, data.status, data.timestamp, data.version, data.database)
   - Use Supertest against the Express app (not running server)
   - Mock database pool for predictable test results
7. Add workspace-level test scripts and root `npm test` script

### Acceptance Criteria
- [ ] `npm test` runs tests across all workspaces
- [ ] Health endpoint test passes
- [ ] React Testing Library is configured and available in `apps/web`
- [ ] Supertest is configured and available in `apps/api`
- [ ] Test files use `*.test.ts` / `*.test.tsx` naming convention
- [ ] Tests run in isolation (no external database required for unit tests)

---

## AUTH01-TASK-10: Configure Root Scripts & Development Workflow

### Objective
Add all root-level npm scripts for dev, build, test, lint, format, and typecheck. Configure concurrent development server startup.

### Affected Files
- `package.json` (root — scripts section)
- Dev dependency: `concurrently`

### Requirements Covered
- AUTH01-REQ-055, AUTH01-REQ-056, AUTH01-REQ-057, AUTH01-REQ-058
- AUTH01-REQ-059, AUTH01-REQ-060

### Details
1. Install `concurrently` as root dev dependency
2. Add root scripts:
   - `"dev"`: `concurrently` running `apps/web` and `apps/api` dev servers with labels
   - `"build"`: Build shared → database → api → web (respecting dependency order)
   - `"test"`: Run vitest in all workspaces
   - `"lint"`: Run ESLint across all workspaces
   - `"format"`: Run Prettier write mode
   - `"format:check"`: Run Prettier check mode
   - `"typecheck"`: Run tsc --noEmit in all workspaces
3. Verify each script executes correctly

### Acceptance Criteria
- [ ] `npm run dev` starts both frontend and backend concurrently
- [ ] `npm run build` produces dist artifacts for api and web
- [ ] `npm test` runs all workspace tests
- [ ] `npm run lint` checks all workspaces
- [ ] `npm run format` formats all files
- [ ] `npm run typecheck` type-checks all workspaces with `--noEmit`
- [ ] Build order respects workspace dependency graph

---

## AUTH01-TASK-11: Create Documentation & Docs Structure

### Objective
Create the README.md and docs directory structure with placeholder files.

### Affected Files
- `README.md`
- `docs/requirements/README.md`
- `docs/design/README.md`
- `docs/architecture/README.md`
- `docs/decisions/README.md`

### Requirements Covered
- AUTH01-REQ-065, AUTH01-REQ-066

### Details
1. Create `README.md` at repository root:
   - Project title and description
   - Technology stack (brief table or list)
   - Prerequisites (Node 24, npm 10+, Neon PostgreSQL account)
   - Quick start (clone, install, env setup, dev)
   - Available scripts table (dev, build, test, lint, format, typecheck)
   - Project structure diagram
   - Development notes
2. Create `docs/requirements/README.md` — describes purpose of directory
3. Create `docs/design/README.md` — describes purpose of directory
4. Create `docs/architecture/README.md` — describes purpose of directory
5. Create `docs/decisions/README.md` — describes purpose of directory

### Acceptance Criteria
- [ ] `README.md` contains all required sections
- [ ] Setup instructions are accurate and followable
- [ ] Scripts table matches actual available scripts
- [ ] Project structure matches actual directory layout
- [ ] `docs/` subdirectories exist with descriptive README files

---

## AUTH01-TASK-12A: Database SSL Mode Configuration

### Objective
Make PostgreSQL SSL behavior explicitly configurable via a validated `DATABASE_SSL` environment variable, owned and validated within the `@pmocore/database` workspace, so PMOCore can connect to both mandatory-SSL Neon (default) and local non-SSL PostgreSQL — without inferring SSL from `NODE_ENV`, hostname, or connection-string heuristics.

This corrects the previously approved design in which SSL was forced unconditionally (`ssl: { rejectUnauthorized: false }`), which rejects otherwise-valid local non-SSL PostgreSQL connections and causes `GET /api/health` to report `degraded`/`disconnected`.

> **AMENDMENT (post-TASK-12A verification):** Verification revealed that `pg` honors SSL-control parameters embedded in `DATABASE_URL` (e.g., `?sslmode=require`), which can override the explicit `ssl` option and defeat `DATABASE_SSL`. This task is amended (implementation still uncommitted) to make `DATABASE_SSL` the **sole** SSL authority by rejecting SSL-control parameters in `DATABASE_URL`. See AUTH01-REQ-077 and D-009.

### Requirements Covered
- AUTH01-REQ-074 (validated `DATABASE_SSL` enum, secure default `require`, mapping, invalid → fail)
- AUTH01-REQ-075 (no inference from `NODE_ENV`/hostname/heuristics)
- AUTH01-REQ-076 (configuration owned/validated in `@pmocore/database`)
- AUTH01-REQ-077 (reject SSL-control parameters in `DATABASE_URL` — sole SSL authority)
- AUTH01-REQ-026 (env var set includes `DATABASE_SSL`)

### Dependencies
- Depends on AUTH01-TASK-03 (database package foundation) — implemented and checkpointed.
- **Blocks final completion of AUTH01-TASK-12.** TASK-12 has already been partially executed: its non-database-dependent verification was completed successfully and remains valid. TASK-12A does not invalidate that work. TASK-12 must not be **marked complete** until TASK-12A is implemented and checkpointed; after that, TASK-12 resumes for the remaining database-dependent verification and any proportionate regression checks.

### Affected Files
- `database/src/connection.ts` — consume the validated config; remove the unconditional `ssl` object
- `database/src/config.ts` — new focused configuration module: Zod validation of `DATABASE_URL` + `DATABASE_SSL`, and a pure `resolveSslOption` mapping (module split is at implementer discretion, but validation + mapping must live in `@pmocore/database`)
- `database/package.json` — add `zod` as a **direct** dependency (see dependency decision below); add `test` script
- `database/vitest.config.ts` — new; Node environment; `include: ['src/**/*.test.ts']`
- `database/src/__tests__/config.test.ts` (or equivalent) — new SSL/config unit tests
- `.env.example` — add `DATABASE_SSL` with documented values and secure default
- `README.md` — document local (`disable`) vs Neon/hosted (`require`) setup
- `package-lock.json` — consequential (only from declaring the `zod` direct dependency)

### Dependency Decision (Zod)
- Zod MUST be declared as a **direct dependency** of `@pmocore/database` (recommended `"zod": "^4.4.3"` to match the version already used by `@pmocore/shared`, `@pmocore/api`, and `@pmocore/web`).
- Do NOT rely on root/workspace hoisting to satisfy Zod for this package.
- The internal-workspace `"*"` convention applies only to `@pmocore/*` workspace dependencies, NOT to third-party packages such as `zod`.

### Implementation Boundaries
- Do NOT create database tables, schema, or migrations.
- Do NOT add authentication or business functionality.
- Do NOT redesign the existing PostgreSQL/Neon, Drizzle ORM, or standard `pg` architecture.
- Do NOT change SSL behavior of any other workspace or infer SSL from `NODE_ENV`/hostname.
- Preserve `rejectUnauthorized: false` for `require` (existing behavior). Stricter certificate verification is a FUTURE CONSIDERATION and is out of scope.
- Do NOT require a real Neon account, credentials, connection string, or network connection to verify this task. Local PostgreSQL is the approved verification environment; live Neon verification is deferred to the separately authorized Neon migration/deployment stage.
- Do NOT normalize, strip, or silently rewrite `DATABASE_URL`; SSL-control parameters are **rejected** (fail fast), not removed (Option A).
- Do NOT introduce a new production dependency for URL parsing; use standard Node `URL`/`URLSearchParams`.
- Do NOT modify unrelated AUTH-01 tasks.
- Do NOT access, request, or expose real credentials.

### Details
1. Add `zod` (`^4.4.3`) to `database/package.json` dependencies.
2. Create the configuration module in `@pmocore/database` that:
   - Validates `DATABASE_URL` (URL) and `DATABASE_SSL` (`enum(['require','disable']).default('require')`) via Zod.
   - Fails fast with a clear error on invalid `DATABASE_SSL`.
   - **Rejects** any `DATABASE_URL` containing the SSL-control parameters `sslmode`, `sslcert`, `sslkey`, or `sslrootcert` (case-insensitive), using standard Node `URL`/`URLSearchParams`. The error MAY name the offending key(s) but MUST NOT include the full URL, hostname, username, password, database name, or any parameter values. No stripping/normalization.
   - Exposes a pure `resolveSslOption(mode)` returning `{ rejectUnauthorized: false }` for `require` and `false` for `disable`.
3. Update `connection.ts` to build the `pg` Pool from the validated config (connection string + resolved `ssl`).
4. Add `database/vitest.config.ts` and a `test` script to `database/package.json` (the root `test` script already picks up new workspace test scripts via `--if-present`).
5. Update `.env.example` and `README.md`: document `DATABASE_SSL`; remove `?sslmode=require` from the example URL; state that SSL parameters do not belong in `DATABASE_URL` and `DATABASE_SSL` controls SSL exclusively.

### Tests (no real network connections)
- `DATABASE_SSL` unset → resolves to `require` → SSL option is `{ rejectUnauthorized: false }`.
- `DATABASE_SSL=require` → SSL option is `{ rejectUnauthorized: false }`.
- `DATABASE_SSL=disable` → SSL option is `false`.
- Invalid `DATABASE_SSL` value (e.g., `maybe`) → validation throws / fails clearly.
- `DATABASE_URL` containing `sslmode` (and separately `sslcert`, `sslkey`, `sslrootcert`; also mixed case such as `SSLMode`) → rejected with a clear fail-fast error.
- The rejection error message does NOT contain the full URL, host, credentials, database name, or parameter values (secret-safe assertion) — use synthetic non-secret URLs in tests.
- Tests exercise the pure validation + URL-check + `resolveSslOption` logic only; they MUST NOT instantiate a live `Pool` connection or open a socket.

### Verification Steps
1. `npm install` succeeds; `@pmocore/database` resolves `zod` as a direct dependency (present in `database/package.json`).
2. `npx eslint .` passes (no new lint errors in the database workspace).
3. Root typecheck passes (database workspace type-checks).
4. `npm test` runs the new database SSL tests (including the URL SSL-parameter rejection tests) and they pass; existing API health test still passes.
5. **Local real-database verification (required):** With a `DATABASE_URL` that has **no** SSL parameters, `DATABASE_SSL=disable`, and a running local non-SSL PostgreSQL, `GET /api/health` returns `status: "healthy"`, `database: "connected"`.
6. **`require` path verification WITHOUT a live Neon connection (required):** Verify the `require`/default path through automated tests and type verification only — no real Neon account, credentials, connection string, or network connection is required:
   - Unit verification that unset or `require` resolves to `{ rejectUnauthorized: false }`.
   - Confirmation that this value is equivalent to the previously approved Pool SSL configuration (i.e., behavior is unchanged from the prior baseline).
   - Existing automated tests and root typecheck continue to pass.
   - Live Neon connectivity verification is **deferred** to the separately authorized Neon migration/deployment stage. This deferral does NOT weaken or change the default `require` behavior.
7. No credentials committed; `.env` remains untracked.

### Acceptance Criteria
- [ ] `DATABASE_SSL` is validated in `@pmocore/database` with permitted values `require` | `disable` and default `require`
- [ ] Unset or `require` produces `ssl: { rejectUnauthorized: false }` (verified by unit tests, equivalent to the prior approved Pool SSL config — no live Neon connection required); `disable` produces `ssl: false`
- [ ] Invalid `DATABASE_SSL` fails fast with a clear error
- [ ] `DATABASE_URL` containing `sslmode`/`sslcert`/`sslkey`/`sslrootcert` (case-insensitive) is rejected with a fail-fast, secret-safe error (no URL/host/credentials/db-name/param values); no stripping/normalization
- [ ] SSL-param detection uses standard Node URL parsing; no new production dependency added
- [ ] SSL mode is not inferred from `NODE_ENV`, hostname, or connection-string heuristics
- [ ] `zod` is a direct dependency of `@pmocore/database` (not hoisted)
- [ ] `database` workspace has a Vitest config and passing SSL/URL unit tests that open no real connections
- [ ] `.env.example` and `README.md` document `DATABASE_SSL`, remove `?sslmode=require`, and state SSL params do not belong in `DATABASE_URL`
- [ ] Existing PostgreSQL/Neon, Drizzle, and `pg` architecture is otherwise unchanged
- [ ] No tables, migrations, auth, or business functionality were added

---

## AUTH01-TASK-12B: Request Log Secret Redaction

### Objective
Redact secret-bearing request and response headers before they are serialized to application logs, so session tokens and credentials never appear in PMOCore logs — while preserving useful operational request logging.

This corrects a security defect discovered during TASK-12A verification: the default `pino-http` configuration serialized the full request `cookie` header (containing active session tokens from other localhost applications) into the logs.

### Requirements Covered
- AUTH01-REQ-078 (redact request `cookie`, request `authorization`, response `set-cookie`; preserve non-sensitive fields)
- Supports AUTH01-REQ-040/046 intent (no exposure of sensitive information in logs/output)

### Dependencies
- Depends on AUTH01-TASK-04 (backend logging foundation) and AUTH01-TASK-05 (health route) — implemented and checkpointed.
- Independent of TASK-12A. **Blocks final completion of AUTH01-TASK-12.**

### Affected Files
- `apps/api/src/lib/logger.ts` — configure `redact` on the base Pino logger (authoritative location); export a maintainable redaction-paths list
- `apps/api/src/middleware/request-logger.ts` — no behavior change required for correctness (base-logger redaction is inherited); MAY pass the same `redact` for defense-in-depth
- `apps/api/src/__tests__/*.test.ts` — new redaction test(s) proving secret header values never appear in serialized logs
- No production dependency changes (pino/pino-http already installed). `package-lock.json` unaffected.

### Verified Technical Placement (do not re-derive during implementation)
Installed versions inspected: **pino 10.3.1**, **pino-http 11.0.0**.
- `pino-http` derives its logger via `suppliedLogger.child({}, opts)`, and pino 10.x's `child()` honors `options.redact`. So `redact` works whether set on the base logger or passed to `pinoHttp(...)`.
- **Authoritative location: the base Pino logger** (`lib/logger.ts`). Redaction is compiled once there and inherited by every child logger (including the `pino-http` child), guaranteeing coverage regardless of middleware wiring. This was empirically verified with a throwaway probe (since removed): `req.headers.cookie`, `req.headers.authorization`, and `res.headers["set-cookie"]` were replaced with `[Redacted]` while non-sensitive fields were preserved.

### Redaction Configuration (approved)
- Paths (matching pino-http's serialized shape): `req.headers.cookie`, `req.headers.authorization`, `res.headers["set-cookie"]`.
- Censor placeholder: `[Redacted]`.
- Paths centralized in one exported constant so future secret headers can be added in one place.

### Implementation Boundaries
- Do NOT implement authentication or session handling.
- Do NOT add a production-only test route to exercise response redaction; use a testable approach that avoids adding production behavior (see Tests).
- Do NOT log real tokens or cookies during tests; use synthetic values only.
- Do NOT require access to any `.env` or credentials.
- Do NOT modify unrelated AUTH-01 tasks.

### Details
1. Add `redact` to the base Pino logger in `lib/logger.ts` with the approved paths and censor; export the paths list as a named constant.
2. Confirm `request-logger.ts` continues to log method, URL, status, response time, and request id.
3. Add automated redaction tests (see below).

### Tests (synthetic values only; no real tokens)
Testable approaches that avoid adding a production route:
- **Preferred:** Unit-test the logger by writing to a captured in-memory stream/destination, emit a log entry carrying a fake `req` with `cookie`/`authorization` headers and a fake `res` with a `set-cookie` header, and assert on the serialized output. (This is exactly how the placement was verified.)
- **Or:** Integration-test via Supertest against the existing `GET /api/health` route with fake `Cookie`/`Authorization` request headers, capturing the logger output stream, and asserting redaction of request headers. Response `set-cookie` redaction is proven by the unit approach without needing a route that sets cookies.

Assertions:
- Fake cookie content never appears in serialized logs.
- Fake authorization content never appears in serialized logs.
- Fake response `set-cookie` content never appears in serialized logs.
- The censor text (`[Redacted]`) appears where applicable.
- Non-sensitive request metadata (method, url, statusCode, responseTime) remains present.

### Verification Steps
1. `npx eslint .` passes.
2. Root typecheck passes.
3. `npm test` runs the redaction tests and they pass; existing tests still pass.
4. Manual/automated confirmation that a request carrying `Cookie`/`Authorization` produces logs with `[Redacted]` in place of those values.

### Acceptance Criteria
- [ ] Base Pino logger is configured with redaction covering `req.headers.cookie`, `req.headers.authorization`, `res.headers["set-cookie"]`
- [ ] Serialized logs never contain the (synthetic) cookie, authorization, or response set-cookie values in tests
- [ ] Censor placeholder appears where applicable
- [ ] Method, URL, status code, and response time remain present in request logs
- [ ] Redaction paths are centralized/maintainable for future secret headers
- [ ] No authentication/session logic, no production-only test route, no new dependency, no real tokens logged

---

## AUTH01-TASK-12: Full Foundation Verification

### Objective
Execute a complete verification of the AUTH-01 foundation to confirm all requirements are satisfied and the system is operational end-to-end.

### Status & Dependencies
- **Partially executed.** TASK-12's non-database-dependent verification (install, lint, typecheck, tests, build, backend/frontend startup, frontend proxy, theme, responsive baseline, error handling, security headers, Git status) has been completed successfully and remains valid. That completed work is not erased or invalidated by TASK-12A.
- **Depends on AUTH01-TASK-12A** (Database SSL Mode Configuration, as amended for SSL-parameter rejection) for the remaining database-dependent verification, because clean-state database connectivity relies on the `DATABASE_SSL` configuration and the sole-authority rule.
- **Depends on AUTH01-TASK-12B** (Request Log Secret Redaction), because the completed security posture requires secret headers to be redacted from logs before AUTH-01 can close.
- TASK-12 must **not be marked complete** until BOTH TASK-12A and TASK-12B are implemented and checkpointed, the remaining local database-dependent verification passes, and proportionate regression checks on the previously completed steps pass. After 12A + 12B, TASK-12 resumes for the remaining database-dependent verification (step 7 health/connectivity against local PostgreSQL) and a log-redaction confirmation.
- Live Neon connectivity verification is **deferred** to the separately authorized Neon migration/deployment stage and is not required to complete TASK-12 at this time.

### Affected Files
- None (verification only; minor fixes if needed)

### Requirements Covered
- All AUTH01-REQ-* requirements (full system verification)

### Verification Steps

1. **Clean install:**
   ```
   rm -rf node_modules apps/*/node_modules packages/*/node_modules database/node_modules
   npm install
   ```
   - Verify: installs without errors, all workspaces resolved

2. **Lint:**
   ```
   npm run lint
   ```
   - Verify: passes with zero errors

3. **Type check:**
   ```
   npm run typecheck
   ```
   - Verify: passes with zero errors across all workspaces

4. **Tests:**
   ```
   npm test
   ```
   - Verify: all tests pass, including health endpoint test

5. **Build:**
   ```
   npm run build
   ```
   - Verify: produces `apps/api/dist/` and `apps/web/dist/`

6. **Backend startup:**
   ```
   cd apps/api && node dist/index.js
   ```
   - Verify: server starts, logs startup message
   - (Requires valid DATABASE_URL in environment)

7. **Health endpoint (database-dependent — resumes after TASK-12A):**
   ```
   curl http://localhost:3001/api/health
   ```
   - Verify: returns 200 with correct JSON shape.
   - Current approved verification environment — local non-SSL PostgreSQL with `DATABASE_SSL=disable`: database field shows "connected", `status: "healthy"`.
   - The `require`/default path (`{ rejectUnauthorized: false }`) is verified via TASK-12A unit tests and type checks; a live Neon connection is NOT required here and is deferred to the separately authorized Neon migration/deployment stage.
   - (Depends on AUTH01-TASK-12A being implemented and checkpointed.)

8. **Frontend startup:**
   ```
   cd apps/web && npm run dev
   ```
   - Verify: Vite dev server starts
   - Verify: browser shows application shell

9. **Frontend proxy:**
   - Verify: `http://localhost:5173/api/health` proxies to backend and returns health response

10. **Theme system:**
    - Verify: theme can be switched and persists on reload

11. **Responsive baseline:**
    - Verify: viewport meta tag present in index.html
    - Verify: application shell has no horizontal overflow at 375px viewport width
    - Verify: responsive breakpoint tokens are defined in base tokens

12. **Error handling:**
    - Verify: `GET /api/nonexistent` returns 404 in standard error format
    - Verify: no stack traces when NODE_ENV=production

13. **Security headers:**
    - Verify: Helmet headers present in API responses

14. **Log secret redaction (depends on AUTH01-TASK-12B):**
    - Verify: a request carrying `Cookie`/`Authorization` headers produces logs where those values are `[Redacted]`, not the raw values.
    - Verify: response `set-cookie` redaction is proven by TASK-12B tests.
    - Verify: method, URL, status code, and response time remain present in logs.

15. **Git status:**
    - Verify: no unintended files committed
    - Verify: `.env` is not tracked
    - Verify: `node_modules/` is not tracked
    - Verify: `dist/` is not tracked

### Acceptance Criteria
- [ ] `npm install` completes without errors
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm test` passes all tests
- [ ] `npm run build` produces valid artifacts
- [ ] Backend starts and responds to health check
- [ ] Frontend starts and renders shell
- [ ] API proxy works from frontend dev server
- [ ] Theme switching works and persists
- [ ] Responsive viewport meta tag present; no horizontal overflow at mobile widths
- [ ] Error handling returns standard format
- [ ] Security headers present
- [ ] Secret request/response headers (`cookie`, `authorization`, `set-cookie`) are redacted from logs (TASK-12B)
- [ ] Git repository is clean (no unintended tracked files)
- [ ] All requirements from requirements.md are satisfied

---

## Task Dependency Summary

```
TASK-01: Root workspace config
    │
    ├── TASK-02: Shared package (depends on root tsconfig)
    │
    ├── TASK-03: Database package (depends on root tsconfig)
    │       │
    │       └── TASK-05: Health endpoint (depends on database + backend)
    │
    ├── TASK-04: Backend foundation (depends on root, shared, database)
    │       │
    │       └── TASK-05: Health endpoint
    │
    ├── TASK-06: Frontend foundation (depends on root, shared)
    │       │
    │       └── TASK-07: Theme system (depends on frontend)
    │
    ├── TASK-08: ESLint & Prettier (depends on all source existing)
    │
    ├── TASK-09: Testing (depends on backend app for health test)
    │
    ├── TASK-10: Root scripts (depends on all workspaces existing)
    │
    ├── TASK-11: Documentation (depends on structure being final)
    │
    ├── TASK-12A: Database SSL mode config + SSL-param rejection (depends on TASK-03; blocks TASK-12)
    │
    ├── TASK-12B: Request log secret redaction (depends on TASK-04/05; blocks TASK-12)
    │
    └── TASK-12: Full verification (depends on all above, including TASK-12A and TASK-12B)
```

Strict sequential execution order: 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12A → 12B → 12 (final completion)

Note: TASK-12A (see D-008/D-009, AUTH01-REQ-074..077) and TASK-12B (see D-010, AUTH01-REQ-078) are approved corrections inserted after the original TASK-11. TASK-12 was already partially executed — its non-database-dependent verification completed successfully and remains valid. Both TASK-12A and TASK-12B must be implemented and checkpointed before TASK-12 is marked complete; TASK-12 then resumes for the remaining database-dependent verification (against local PostgreSQL) plus a log-redaction confirmation and proportionate regression checks. TASK-12A and TASK-12B are independent of each other and may be implemented in either order. Live Neon verification is deferred to the separately authorized Neon migration/deployment stage.
