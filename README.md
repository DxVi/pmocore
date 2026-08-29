# PMOCore

PMOCore is an enterprise Project Management & Operations platform. This repository currently contains the **AUTH-01 application foundation**: the monorepo layout, a minimal React frontend shell, a minimal Express backend shell with a health check, shared type/schema contracts, database connectivity scaffolding, and the project's tooling (linting, formatting, type-checking, testing, and development scripts).

No authentication and no business/domain modules are implemented yet. What exists today is the operational skeleton those future modules will be built on.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Bootstrap 5, React Router, TanStack Query, React Hook Form, Zod, Lucide React, date-fns |
| Backend | Node.js, Express 5, TypeScript, Pino (structured logging), Helmet, CORS, Zod |
| Database | PostgreSQL (Neon), Drizzle ORM, `pg` |
| Shared | `@pmocore/shared` — Zod schemas and inferred types shared between frontend and backend |
| Tooling | npm workspaces, ESLint 9 (flat config) + `typescript-eslint`, Prettier, Vitest, Supertest, React Testing Library, `concurrently` |

## Prerequisites

- **Node.js 24 LTS**
- **npm 10+** (ships with Node 24; this project is developed against npm 11.x)
- A **PostgreSQL database** — a [Neon](https://neon.tech) connection string, or any reachable PostgreSQL instance, for local development

## Quick Start

```bash
# 1. Clone and enter the repository
git clone <repository-url>
cd pmocore

# 2. Install dependencies for every workspace
npm install

# 3. Copy the environment template into apps/api (see note below on why)
#    PowerShell:
Copy-Item .env.example apps/api/.env
#    POSIX shell:
cp .env.example apps/api/.env

# 4. Edit apps/api/.env and fill in your own values (see "Environment Variables" below)

# 5. Start the frontend and backend together
npm run dev
```

**Why `apps/api/.env` and not a root `.env`:** `npm run dev` runs the API's dev script via `npm run dev -w apps/api`, and npm executes workspace scripts with that workspace's directory (`apps/api`) as the working directory. The API loads its environment with `import 'dotenv/config'`, which reads `.env` from the current working directory — so the file it actually picks up is `apps/api/.env`, not one at the repository root.

`apps/api/.env` is covered by the root `.gitignore`'s `.env` pattern and is never committed. Do not commit real credentials or connection strings — only `.env.example` (with placeholder values) is tracked.

## Environment Variables

Defined in `.env.example`:

| Variable | Description |
|---|---|
| `NODE_ENV` | `development`, `production`, or `test`. Defaults to `development` if unset. |
| `PORT` | Port the API listens on. Defaults to `3001`. The frontend dev server (Vite, port `5173`) proxies `/api` to a target that is currently hard-coded to `http://localhost:3001` in `apps/web/vite.config.ts` — it does not read `PORT` and will not follow it automatically. Keep `PORT` at `3001` for local development unless you deliberately update the proxy target in `apps/web/vite.config.ts` to match. |
| `DATABASE_URL` | PostgreSQL connection string (Neon or otherwise), with **no SSL-control parameters** (`sslmode`, `sslcert`, `sslkey`, `sslrootcert`) — SSL is controlled exclusively by `DATABASE_SSL` below. **Required** — startup fails fast if the URL is syntactically invalid or contains any of those prohibited parameters (case-insensitive). The error names only the offending parameter key(s), never the full URL, hostname, credentials, or database name. |
| `DATABASE_SSL` | `require` or `disable`. Defaults to `require` if unset — the secure default, and what Neon/other hosted PostgreSQL requiring SSL should use (explicitly or by leaving it unset). Use `disable` only for a local PostgreSQL server without SSL. Any other value fails validation at startup. This is validated and owned by `@pmocore/database`, not the API — SSL mode is never inferred from `NODE_ENV`, the database hostname, or parameters embedded in `DATABASE_URL` itself. |
| `LOG_LEVEL` | Pino log level: `debug`, `info`, `warn`, or `error`. Defaults to `info`. |

`NODE_ENV`, `PORT`, and `LOG_LEVEL` are validated at API startup with a Zod schema in `apps/api/src/config/env.ts`. `DATABASE_URL` and `DATABASE_SSL` are validated separately, with a Zod schema owned by `@pmocore/database` (`database/src/config.ts`), since that package creates the PostgreSQL connection and may be consumed independently of the API. Either module exits immediately with a clear error on missing or invalid required configuration — the application never starts in a partially-configured state — and neither ever logs or exposes the configured values themselves.

## Available Scripts

Run from the repository root:

| Script | Command | What it does |
|---|---|---|
| `npm run dev` | `concurrently -n api,web -c blue,green --kill-others-on-fail "npm run dev -w apps/api" "npm run dev -w apps/web"` | Starts the API (`tsx watch`, port 3001) and the frontend (Vite, port 5173) together, with labeled, color-coded output. |
| `npm run build` | Runs each workspace's `build` script in dependency order: `packages/shared` → `database` → `apps/api` → `apps/web`, stopping immediately if any step fails. | Produces `apps/api/dist` and `apps/web/dist`. |
| `npm test` | `npm run test --workspaces --if-present` | Runs Vitest in every workspace that defines a `test` script (`apps/api`, `apps/web`, `packages/shared`). Workspaces without a `test` script (currently `database`) are skipped. |
| `npm run lint` | `eslint .` | Runs the repository's flat ESLint config (type-aware for all TypeScript workspaces, with React-specific rules for `apps/web`) across the whole repo. |
| `npm run format` | `prettier --write .` | Formats the repository in place. |
| `npm run format:check` | `prettier --check .` | Checks formatting without writing changes (used in verification/CI-style checks). |
| `npm run typecheck` | Runs `tsc --noEmit` for `packages/shared`, `database`, `apps/api`, and `apps/web` in sequence, stopping at the first failure. | Type-checks every workspace without requiring a prior build — `apps/api` uses `tsconfig.typecheck.json`, a lint/typecheck-only configuration that resolves `@pmocore/shared` and `@pmocore/database` directly from source instead of their built `dist/` output. |

## Project Structure

```
pmocore/
├── apps/
│   ├── web/                    # React frontend (Vite + TypeScript)
│   │   ├── src/
│   │   │   ├── assets/         # Static assets
│   │   │   ├── components/     # Shared UI components (none yet)
│   │   │   ├── hooks/          # Custom React hooks (useTheme)
│   │   │   ├── lib/            # API client
│   │   │   ├── pages/          # Route-level pages (none yet)
│   │   │   ├── providers/      # Context providers (QueryProvider, ThemeProvider)
│   │   │   ├── styles/         # Global styles and the theme/token system
│   │   │   │   └── tokens/     # Per-theme CSS custom-property files
│   │   │   ├── test/           # Vitest setup (jest-dom matchers)
│   │   │   ├── types/          # Frontend-specific types (none yet)
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts
│   │   └── tsconfig.json
│   │
│   └── api/                    # Express backend (TypeScript)
│       ├── src/
│       │   ├── config/         # Environment validation (Zod)
│       │   ├── lib/            # Response helpers, logger, error type
│       │   ├── middleware/     # Error handling, request logging, 404
│       │   ├── routes/         # GET /api/health
│       │   ├── __tests__/      # Vitest + Supertest tests
│       │   ├── app.ts          # Express app assembly
│       │   └── index.ts        # Entry point
│       ├── tsconfig.json            # Production build config
│       ├── tsconfig.typecheck.json  # Lint/typecheck-only config (no prior build required)
│       └── vitest.config.ts
│
├── packages/
│   └── shared/                 # Shared Zod schemas and inferred types
│       └── src/
│           ├── schemas/        # API envelope + health response schemas
│           ├── types/
│           └── utils/
│
├── database/                   # Database connection, schema, migrations
│   ├── src/
│   │   ├── connection.ts       # Drizzle + pg Pool setup
│   │   └── schema/             # Table definitions (empty in this phase)
│   ├── migrations/              # Generated Drizzle migrations (none yet)
│   ├── seeds/                   # Seed scripts (none yet)
│   └── drizzle.config.ts
│
├── docs/
│   ├── requirements/README.md
│   ├── design/README.md
│   ├── architecture/README.md
│   └── decisions/README.md
│
├── .env.example
├── eslint.config.mjs           # Flat ESLint config (ESLint 9)
├── package.json                # Root workspace config + scripts
├── tsconfig.base.json          # Shared TypeScript compiler options
└── README.md
```

## Development Notes

- **npm workspaces.** A single `npm install` at the repository root installs dependencies for every workspace (`apps/*`, `packages/*`, `database`). Run a workspace-scoped command with `npm run <script> -w <workspace-path>` (e.g. `npm run build -w apps/api`).
- **Internal workspace dependencies.** Cross-workspace references (e.g. `apps/api` depending on `@pmocore/shared`) use the `"*"` version convention, letting npm workspaces link the local package directly rather than pinning a version.
- **Dependency-ordered builds.** `npm run build` always builds `packages/shared` and `database` before `apps/api` and `apps/web`, since the app workspaces import types and code from them. The `&&`-chained script stops at the first failure rather than continuing with a stale or missing dependency.
- **Clean-state development startup.** A clean install followed by `npm run dev` needs no manual workspace build first. `apps/api`'s dev script runs `tsx watch --tsconfig tsconfig.typecheck.json src/index.ts`, which resolves `@pmocore/database` and `@pmocore/shared` directly from their TypeScript source (the same source mapping used for linting and type-checking) instead of their built `dist/` output. Saving an imported `database/src` file while the API dev server is running triggers an automatic watch restart. This applies to development only — the production build (`npm run build`) and `npm start -w apps/api` are unchanged and continue resolving both packages through their compiled `dist/` entry points. `apps/web`'s dev server has no equivalent change: it currently has no runtime (non-type-only) import of `@pmocore/shared`, so no source-hot-reload claim applies there.
- **Environment validation.** The API validates its environment variables at startup (see "Environment Variables" above) and refuses to start with an invalid configuration, rather than failing unpredictably later.
- **Ignored generated output.** `node_modules/`, `dist/`, `.env`, and `coverage/` are all git-ignored. `dist/` is never committed — clean-state `lint`, `typecheck`, and `test` are all designed to work without any workspace having been built first.
- **Testing behavior.** Vitest runs in `apps/api`, `apps/web`, `packages/shared`, and `database`. `apps/api` covers the health endpoint (both a reachable and an unreachable database, via Supertest against the exported Express app) and base-logger secret redaction (proving `cookie`/`authorization`/`set-cookie` values never reach serialized logs) — no real network, database connection, or real credential is used by any test. `database` covers its `DATABASE_SSL` validation and connection-string SSL-parameter rejection, entirely as pure unit tests with no live `Pool`/socket. `apps/web` and `packages/shared` have no test files yet; their Vitest configs use `passWithNoTests` so an empty suite is a clean pass rather than a failure.
- **Theme and design-token architecture.** `apps/web/src/styles/tokens/` defines six color-token sets — Light, Dark, Emerald, Ocean, Rustic, and Etch — as CSS custom properties (`--pmo-*`), each scoped by a `data-theme` attribute on `<html>` (e.g. `[data-theme="dark"]`). "System" is not a token file; it is a selection mode handled by `ThemeProvider` (in `apps/web/src/providers/`), which resolves it to the Light or Dark token set based on the operating system's light/dark preference (and updates live if that preference changes). `ThemeProvider` also persists the user's selection to `localStorage`. Component code is expected to consume `--pmo-*` custom properties rather than hard-coding colors.
- **Known development-workflow limitation.** If required API environment configuration (e.g. `DATABASE_URL`) is missing or invalid, the API process fails fast and prints a clear validation error — but because the API's dev script runs under `tsx watch`, the watcher intentionally stays alive afterward rather than exiting. As a result, root `npm run dev`'s `--kill-others-on-fail` cannot terminate the combined `dev` process in this specific case, since `tsx watch` never itself exits. This is expected `tsx watch` behavior (the same pattern common Node watch tools use), not a defect. To recover: **stop the root `npm run dev` command, correct `apps/api/.env`, then restart `npm run dev`.** Do not assume that saving `apps/api/.env` alone will trigger a restart — `tsx watch` is not guaranteed to pick up an environment-file change the way it picks up a source-file change.

## Current Scope

This repository currently implements only the AUTH-01 foundation: repository/tooling setup, a minimal frontend shell, a minimal backend shell with one health-check endpoint, shared contracts, and database connectivity scaffolding with no tables yet. There is no authentication, no business/domain functionality, and no CI/CD or deployment configuration at this stage.
