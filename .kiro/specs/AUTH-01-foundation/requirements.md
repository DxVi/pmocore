# AUTH-01 — Repository & Application Foundation: Requirements

## Purpose

Establish the technical foundation (monorepo structure, frontend shell, backend shell, database connectivity, tooling, and configuration) on which authentication and all subsequent PMOCore modules will be built.

## Scope Boundary

This specification covers infrastructure and tooling only. No authentication logic, no business modules, no user/role/permission tables, no login UI, and no dashboard functionality are in scope.

---

## Requirements

### Repository & Workspace Structure

**AUTH01-REQ-001** — The repository SHALL be structured as an npm workspaces monorepo with the following top-level layout:

```
pmocore/
├── apps/
│   ├── web/          # React frontend application
│   └── api/          # Express backend application
├── packages/
│   └── shared/       # Shared TypeScript package
├── database/
│   ├── migrations/   # Drizzle migration files
│   └── seeds/        # Database seed scripts
├── docs/
│   ├── requirements/
│   ├── design/
│   ├── architecture/
│   └── decisions/
├── .env.example
├── .gitignore
├── package.json      # Root workspace package.json
├── tsconfig.base.json
└── README.md
```

**AUTH01-REQ-002** — The root `package.json` SHALL define npm workspaces pointing to `apps/*`, `packages/*`, and `database`.

**AUTH01-REQ-003** — Each workspace package (`apps/web`, `apps/api`, `packages/shared`, `database`) SHALL have its own `package.json` with appropriate name, version, and scripts.

**AUTH01-REQ-004** — A root `tsconfig.base.json` SHALL define shared strict TypeScript compiler options that workspace packages extend.

---

### Frontend Foundation

**AUTH01-REQ-005** — The frontend (`apps/web`) SHALL be a React application bootstrapped with Vite and TypeScript.

**AUTH01-REQ-006** — The frontend SHALL include the following dependencies as specified in the technology baseline: React, TypeScript, Vite, Bootstrap 5, React Router, TanStack Query, React Hook Form, Zod, Lucide React, and date-fns.

**AUTH01-REQ-007** — The frontend SHALL render a minimal application shell that confirms the app is operational (e.g., a placeholder page or health indicator). No business UI is required.

**AUTH01-REQ-008** — The frontend SHALL use the `@pmocore/shared` package for any shared types or utilities.

**AUTH01-REQ-009** — The frontend Vite configuration SHALL include a development proxy that forwards `/api` requests to the backend server to avoid CORS issues during local development.

---

### Backend Foundation

**AUTH01-REQ-010** — The backend (`apps/api`) SHALL be an Express 5 application written in TypeScript.

**AUTH01-REQ-011** — The backend SHALL use `tsx` (or equivalent) for local development with file-watching and restart capability.

**AUTH01-REQ-012** — The backend SHALL expose a single endpoint: `GET /api/health`.

**AUTH01-REQ-013** — The backend SHALL use Pino as the structured logging library.

**AUTH01-REQ-014** — The backend SHALL include centralized error-handling middleware that catches unhandled errors, logs them via Pino, and returns a safe JSON error response without leaking internal details.

**AUTH01-REQ-015** — The backend SHALL include a centralized API response format utility that standardizes success and error response shapes.

---

### Shared Package

**AUTH01-REQ-016** — The shared package (`packages/shared`) SHALL export TypeScript types, Zod schemas, and utility functions that are consumed by both `apps/web` and `apps/api`.

**AUTH01-REQ-017** — The shared package SHALL define the standard API response envelope types (success response, error response, pagination metadata).

**AUTH01-REQ-018** — The shared package SHALL define the health endpoint response schema using Zod.

---

### Database Connectivity

**AUTH01-REQ-019** — The `database` workspace SHALL configure Drizzle ORM for PostgreSQL using `node-postgres` (`pg`) as the driver.

**AUTH01-REQ-020** — The database configuration SHALL connect to a Neon PostgreSQL instance using a connection string provided via environment variable.

**AUTH01-REQ-074** — Database SSL behavior SHALL be controlled by an explicit, validated environment variable `DATABASE_SSL` with the permitted values `require` and `disable`.
- The secure default SHALL be `require`. When `DATABASE_SSL` is unset, the system SHALL behave as `require`.
- `require` SHALL enable PostgreSQL SSL using the currently approved Neon-compatible behavior (`ssl: { rejectUnauthorized: false }`).
- `disable` SHALL disable PostgreSQL SSL (`ssl: false`) to support local PostgreSQL servers without SSL.
- Any value other than `require` or `disable` SHALL cause a clear configuration/startup validation failure.

**AUTH01-REQ-075** — SSL mode SHALL NOT be inferred from `NODE_ENV`, the database hostname, local/production detection, or any undocumented connection-string heuristic. It SHALL be determined solely by the validated `DATABASE_SSL` value.

**AUTH01-REQ-076** — The database connection configuration (including `DATABASE_SSL` validation) SHALL be owned and authoritatively validated within the `@pmocore/database` workspace, because that workspace creates the PostgreSQL connection pool and may be consumed independently of the API workspace.

**AUTH01-REQ-077** — To guarantee that `DATABASE_SSL` is the sole SSL authority (AUTH01-REQ-075), the `DATABASE_URL` SHALL NOT contain any SSL-control connection-string parameter. The following parameters are prohibited, matched case-insensitively:
- `sslmode`
- `sslcert`
- `sslkey`
- `sslrootcert`

Behavior:
- A `DATABASE_URL` containing any prohibited SSL parameter SHALL cause a clear fail-fast validation error during `@pmocore/database` configuration loading.
- The error message MAY name the offending parameter key(s). It SHALL NOT include the complete URL, hostname, username, password, database name, or any query-parameter values.
- The system SHALL NOT normalize, strip, or silently rewrite the URL to remove SSL parameters. Rejection is explicit.
- Standard hosted connection strings (e.g., Neon) remain supported once their SSL query parameter is removed and `DATABASE_SSL=require` is set (or allowed to default).
- Enforcement SHALL use standard Node URL parsing; no new production dependency SHALL be introduced for this purpose.

**AUTH01-REQ-021** — The database workspace SHALL include a Drizzle configuration file (`drizzle.config.ts`) ready for migration generation and execution.

**AUTH01-REQ-022** — The `database/migrations/` directory SHALL exist and be ready to receive migration files (no tables are created in AUTH-01).

**AUTH01-REQ-023** — The `database/seeds/` directory SHALL exist and be ready to receive seed scripts (no seeds are created in AUTH-01).

---

### Environment Configuration & Validation

**AUTH01-REQ-024** — Environment variables SHALL be validated at application startup using Zod schemas. The application SHALL fail fast with a clear error message if required variables are missing or invalid.

**AUTH01-REQ-025** — A `.env.example` file SHALL exist at the repository root documenting all required and optional environment variables with placeholder values and comments.

**AUTH01-REQ-026** — The following environment variables SHALL be defined at minimum:
- `NODE_ENV` — application environment (development, production, test)
- `PORT` — backend server port
- `DATABASE_URL` — PostgreSQL connection string (Neon in hosted environments)
- `DATABASE_SSL` — database SSL mode (`require` | `disable`; default `require`) — see AUTH01-REQ-074
- `LOG_LEVEL` — Pino log level (debug, info, warn, error)

**AUTH01-REQ-027** — `.env` files SHALL be excluded from version control via `.gitignore`.

---

### Security Baseline

**AUTH01-REQ-028** — The backend SHALL include `helmet` middleware for baseline HTTP security headers.

**AUTH01-REQ-029** — The backend SHALL include CORS middleware configured for development. The configuration SHALL be environment-aware to support production deployment later.

**AUTH01-REQ-030** — The backend SHALL NOT expose stack traces, internal paths, or database details in error responses when `NODE_ENV` is `production`.

---

### Theme & Design Token Architecture

**AUTH01-REQ-031** — The frontend SHALL implement a centralized design-token system using CSS custom properties (variables).

**AUTH01-REQ-032** — The theme system SHALL support the following themes: System (follows OS preference), Dark, Light, Emerald, Ocean, Rustic, and Etch. The AUTH-01 scope is architectural: establish the centralized token mechanism and functional theme switching. Detailed visual refinement of individual theme palettes is not required during AUTH-01.

**AUTH01-REQ-033** — Theme tokens SHALL be defined in dedicated CSS/SCSS files, not scattered inline throughout component files.

**AUTH01-REQ-034** — The theme system SHALL persist the user's theme selection in browser local storage.

**AUTH01-REQ-035** — The frontend SHALL include a theme provider/context that components can consume to access the current theme state.

---

### Responsive UI Baseline

**AUTH01-REQ-070** — The frontend foundation SHALL establish responsive layout infrastructure that supports desktop, tablet, and mobile viewports from the outset. Responsive behavior is a core requirement, not a future enhancement.

**AUTH01-REQ-071** — The frontend global styles SHALL include a standardized set of responsive breakpoints defined as CSS custom properties or SCSS variables, consistent with Bootstrap 5 breakpoint conventions (xs, sm, md, lg, xl, xxl).

**AUTH01-REQ-072** — The frontend application shell (including any structural layout containers established in AUTH-01) SHALL adapt appropriately to different viewport sizes without horizontal overflow or unusable controls.

**AUTH01-REQ-073** — The design token system SHALL include responsive-aware spacing and typography tokens where appropriate (e.g., reduced spacing on smaller viewports).

---

### API Health Endpoint

**AUTH01-REQ-036** — `GET /api/health` SHALL return HTTP 200 with a JSON response conforming to the standard API success envelope.

**AUTH01-REQ-037** — The health response payload SHALL include:
- `status`: "healthy" or "degraded"
- `timestamp`: ISO 8601 timestamp
- `version`: application version (from package.json or environment)
- `database`: connectivity status ("connected" or "disconnected")

**AUTH01-REQ-038** — The health endpoint SHALL verify database connectivity by executing a lightweight query (e.g., `SELECT 1`).

**AUTH01-REQ-039** — If the database is unreachable, the health endpoint SHALL still return HTTP 200 with `status: "degraded"` and `database: "disconnected"`. It SHALL NOT return 500 or expose connection error details.

**AUTH01-REQ-040** — The health endpoint SHALL NOT expose sensitive configuration such as connection strings, hostnames, or credentials.

---

### Logging Foundation

**AUTH01-REQ-041** — The backend SHALL initialize a Pino logger instance with structured JSON output.

**AUTH01-REQ-042** — The log level SHALL be configurable via the `LOG_LEVEL` environment variable.

**AUTH01-REQ-043** — In development mode, the backend SHOULD use `pino-pretty` for human-readable console output.

**AUTH01-REQ-044** — Each HTTP request SHALL be logged with method, URL, status code, and response time using `pino-http` or equivalent middleware.

**AUTH01-REQ-078** — Secret-bearing request and response headers SHALL be redacted before serialization to application logs. Redaction SHALL cover at minimum:
- request `cookie`
- request `authorization`
- response `set-cookie`

Behavior:
- Redacted values SHALL be replaced with a configured censor placeholder (e.g., `[Redacted]`); the header keys MAY remain visible.
- Useful, non-sensitive request logging SHALL be preserved, including HTTP method, URL, status code, response time, and other non-sensitive operational fields.
- Redaction SHALL be configured at the authoritative location required to guarantee it is applied given the installed logger implementation (see design.md). The requirement is behavioral: secret header values MUST NOT appear in serialized log output, regardless of internal serializer paths.
- The redaction coverage list SHALL be maintainable so additional secret headers can be added when future features introduce them.

---

### Error Handling Foundation

**AUTH01-REQ-045** — The backend SHALL implement a global error-handling middleware as the last middleware in the Express pipeline.

**AUTH01-REQ-046** — Unhandled errors SHALL be logged with full stack traces via Pino (server-side only) and SHALL return a sanitized JSON error to the client.

**AUTH01-REQ-047** — The standard error response format SHALL include:
- `success`: false
- `error.code`: machine-readable error code (e.g., "INTERNAL_ERROR", "NOT_FOUND", "VALIDATION_ERROR")
- `error.message`: human-readable message safe to display
- `error.details`: optional additional information (validation errors, etc.)

**AUTH01-REQ-048** — Known error types (validation errors, not-found, etc.) SHALL use appropriate HTTP status codes. Unknown errors SHALL return 500.

---

### Testing Foundation

**AUTH01-REQ-049** — Vitest SHALL be configured as the unit/integration test runner for all workspaces.

**AUTH01-REQ-050** — React Testing Library SHALL be available in `apps/web` for component testing.

**AUTH01-REQ-051** — Supertest SHALL be available in `apps/api` for HTTP endpoint testing.

**AUTH01-REQ-052** — A test for `GET /api/health` SHALL exist and verify the response shape and status code.

**AUTH01-REQ-053** — A root-level `npm test` script SHALL execute tests across all workspaces.

**AUTH01-REQ-054** — Test files SHALL follow the naming convention `*.test.ts` or `*.test.tsx`.

---

### Build Tooling & Scripts

**AUTH01-REQ-055** — The root `package.json` SHALL include scripts for: `dev`, `build`, `test`, `lint`, `format`, and `typecheck`.

**AUTH01-REQ-056** — `npm run dev` SHALL start both the frontend dev server and backend dev server concurrently.

**AUTH01-REQ-057** — `npm run build` SHALL produce production-ready artifacts for both frontend and backend.

**AUTH01-REQ-058** — `npm run lint` SHALL run ESLint across all workspaces.

**AUTH01-REQ-059** — `npm run format` SHALL run Prettier across all workspaces.

**AUTH01-REQ-060** — `npm run typecheck` SHALL run TypeScript compiler in `--noEmit` mode across all workspaces.

**AUTH01-REQ-061** — ESLint SHALL be configured with TypeScript-aware rules for all workspaces.

**AUTH01-REQ-062** — Prettier SHALL be configured with a shared configuration at the repository root.

---

### Git Hygiene

**AUTH01-REQ-063** — A `.gitignore` file SHALL exclude: `node_modules/`, `dist/`, `.env`, `.env.local`, coverage reports, OS-specific files, and IDE-specific files (except `.vscode/` settings intended for sharing).

**AUTH01-REQ-064** — The repository SHALL NOT contain committed `node_modules`, build artifacts, or `.env` files.

---

### Documentation

**AUTH01-REQ-065** — A `README.md` SHALL exist at the repository root containing:
- Project description
- Technology stack summary
- Prerequisites (Node.js version, npm version, Neon account)
- Setup instructions (clone, install, environment configuration, database)
- Development commands (dev, build, test, lint, typecheck)
- Project structure overview

**AUTH01-REQ-066** — The `docs/` directory structure SHALL exist with placeholder README files indicating the purpose of each subdirectory.

---

### Deployment Readiness

**AUTH01-REQ-067** — The backend build output SHALL be a standard Node.js application startable via `node dist/index.js` or equivalent, suitable for Render Web Service deployment. In production, the backend SHALL serve both the API (`/api/*`) and the built frontend static files from the same service (approved V1 deployment strategy — D-005).

**AUTH01-REQ-068** — The frontend build output SHALL be static files produced by Vite (`apps/web/dist/`). In V1 production, these files are served by the backend Express application (see AUTH01-REQ-067). This strategy may be revisited if scaling requirements justify separating into independent services.

**AUTH01-REQ-069** — Environment-specific configuration SHALL be handled exclusively through environment variables, with no hardcoded URLs or secrets.

---

## Exclusions (Out of Scope for AUTH-01)

- User, role, permission, or session database tables
- Authentication logic (login, logout, token management)
- Login or registration UI
- Dashboard functionality
- Any PMOCore business module (Projects, Clients, Tickets, etc.)
- Production deployment execution
- CI/CD pipeline configuration
