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

## AUTH01-TASK-12: Full Foundation Verification

### Objective
Execute a complete verification of the AUTH-01 foundation to confirm all requirements are satisfied and the system is operational end-to-end.

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

7. **Health endpoint:**
   ```
   curl http://localhost:3001/api/health
   ```
   - Verify: returns 200 with correct JSON shape
   - Verify: database field shows "connected" (with valid Neon URL)

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

14. **Git status:**
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
    └── TASK-12: Full verification (depends on all above)
```

Strict sequential execution order: 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12
