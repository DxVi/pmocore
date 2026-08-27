# AUTH-01 — Repository & Application Foundation: Technical Design

## Overview

This document describes the technical design for the PMOCore application foundation. It establishes the monorepo structure, frontend and backend shells, database connectivity, tooling, configuration strategy, and architectural patterns that all subsequent modules will build upon.

No business logic or authentication is implemented in this phase.

---

## 1. Monorepo Architecture

### Decision: npm Workspaces

PMOCore uses npm workspaces (native to npm 7+) for monorepo management. This avoids additional tooling (Turborepo, Nx, Lerna) while providing:

- Shared dependency hoisting
- Cross-package references via workspace protocol
- Single `npm install` at root
- Unified script orchestration

**Why:** Simplicity. npm workspaces are built-in, zero-config for basic needs, and sufficient for a team-scale monorepo. Additional tooling can be introduced later if build performance becomes a concern.

### Directory Structure

```
pmocore/
├── apps/
│   ├── web/                    # React frontend (Vite + TypeScript)
│   │   ├── src/
│   │   │   ├── assets/         # Static assets (images, fonts)
│   │   │   ├── components/     # Shared UI components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utilities, API client, helpers
│   │   │   ├── pages/          # Route-level page components
│   │   │   ├── providers/      # Context providers (theme, query, etc.)
│   │   │   ├── styles/         # Global styles, theme tokens, variables
│   │   │   │   ├── tokens/     # Design token files per theme
│   │   │   │   ├── _variables.css
│   │   │   │   └── global.css
│   │   │   ├── types/          # Frontend-specific type declarations
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── vite-env.d.ts
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── package.json
│   │
│   └── api/                    # Express backend (TypeScript)
│       ├── src/
│       │   ├── config/         # Environment validation, app config
│       │   ├── middleware/     # Express middleware (error, logging, etc.)
│       │   ├── routes/         # Route definitions
│       │   ├── lib/            # Utilities, helpers
│       │   ├── types/          # Backend-specific type declarations
│       │   ├── app.ts          # Express app setup (middleware, routes)
│       │   └── index.ts        # Entry point (starts server)
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types, schemas, utilities
│       ├── src/
│       │   ├── schemas/        # Zod schemas (API contracts)
│       │   ├── types/          # TypeScript type definitions
│       │   ├── utils/          # Shared utility functions
│       │   └── index.ts        # Public API barrel export
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── package.json
│
├── database/                   # Database configuration, migrations, seeds
│   ├── src/
│   │   ├── connection.ts       # Database connection pool
│   │   ├── schema/             # Drizzle table schemas (empty in AUTH-01)
│   │   └── index.ts            # Public exports
│   ├── migrations/             # Generated Drizzle migration files
│   ├── seeds/                  # Seed scripts
│   ├── drizzle.config.ts       # Drizzle Kit configuration
│   ├── tsconfig.json
│   └── package.json
│
├── docs/
│   ├── requirements/
│   │   └── README.md
│   ├── design/
│   │   └── README.md
│   ├── architecture/
│   │   └── README.md
│   └── decisions/
│       └── README.md
│
├── .env.example
├── .gitignore
├── .prettierrc
├── .prettierignore
├── eslint.config.mjs           # Flat ESLint config (ESLint 9+)
├── package.json                # Root workspace config + scripts
├── tsconfig.base.json          # Shared TS compiler options
└── README.md
```

### Package Names & References

| Workspace | Package Name | Purpose |
|-----------|-------------|---------|
| `apps/web` | `@pmocore/web` | React frontend application |
| `apps/api` | `@pmocore/api` | Express backend application |
| `packages/shared` | `@pmocore/shared` | Shared types, schemas, utilities |
| `database` | `@pmocore/database` | DB connection, schema, migrations |

Cross-references use standard version ranges. For private internal workspace packages, `"*"` is the approved convention — npm workspaces will resolve and link the local package during installation:

```json
"dependencies": {
  "@pmocore/shared": "*",
  "@pmocore/database": "*"
}
```

---

## 2. Frontend Architecture

### Technology Stack

- **React 18** — UI library
- **TypeScript** — strict mode
- **Vite** — build tool and dev server
- **Bootstrap 5** — CSS framework (utility classes + grid)
- **React Router v6** — client-side routing
- **TanStack Query v5** — server state management
- **React Hook Form** — form handling
- **Zod** — runtime validation (shared with backend)
- **Lucide React** — icon library
- **date-fns** — date utility library

### Application Shell (AUTH-01 Scope)

For AUTH-01, the frontend renders a minimal operational shell:

- `App.tsx` — Root component with providers
- `ThemeProvider` — Theme context and persistence
- A single placeholder page confirming the app is running

No routing beyond a root page is required. No business components are built.

### Providers Architecture

```
<React.StrictMode>
  <QueryClientProvider>
    <ThemeProvider>
      <RouterProvider />
    </ThemeProvider>
  </QueryClientProvider>
</React.StrictMode>
```

### Vite Configuration

Key configuration:

- **Dev proxy:** `/api` requests proxied to `http://localhost:3001` (backend dev server)
- **Resolve aliases:** `@/` maps to `src/` for clean imports
- **Build output:** `dist/` directory with production-optimized static files

### Responsive Layout Strategy

PMOCore is responsive by default. The frontend foundation establishes:

1. **Bootstrap 5 grid and utilities** — The responsive grid system (`container`, `row`, `col-*`) and responsive utility classes (`d-none d-md-block`, etc.) are available from day one.

2. **Standardized breakpoints** — PMOCore uses Bootstrap 5's breakpoint system. Custom tokens alias these for consistency:

| Token | Breakpoint | Typical Usage |
|-------|-----------|---------------|
| `--pmo-bp-sm` | 576px | Large phones landscape |
| `--pmo-bp-md` | 768px | Tablets |
| `--pmo-bp-lg` | 992px | Small desktops / tablets landscape |
| `--pmo-bp-xl` | 1200px | Standard desktops |
| `--pmo-bp-xxl` | 1400px | Wide desktops |

3. **Viewport meta tag** — `index.html` includes the standard responsive viewport meta tag.

4. **No desktop-only assumptions** — Layout containers, spacing, and structural elements use relative/fluid sizing where appropriate. Fixed-width layouts are avoided.

5. **Future module guidance** — As business modules are built, navigation, forms, dialogs, cards, tabs, tables/listings, filters, search controls, and dashboards must all consider responsive behavior in their specifications.

### API Client

A centralized API client utility (`src/lib/api-client.ts`) will:

- Provide typed `fetch` wrappers for GET, POST, PUT, DELETE
- Automatically prefix `/api`
- Handle JSON parsing
- Provide consistent error handling that integrates with TanStack Query

This is a thin utility, not a full SDK. It will grow as modules are added.

---

## 3. Backend Architecture

### Technology Stack

- **Node.js 24 LTS** — runtime
- **Express 5** — HTTP framework
- **TypeScript** — strict mode
- **Pino** — structured logging
- **Helmet** — security headers
- **CORS** — cross-origin configuration
- **Zod** — request validation

### Application Structure

```
index.ts          → Starts HTTP server, validates env, connects DB
app.ts            → Creates Express app, mounts middleware & routes
config/env.ts     → Zod-validated environment configuration
middleware/
  error-handler.ts    → Global error handling
  request-logger.ts   → Pino HTTP request logging
  not-found.ts        → 404 handler for unmatched routes
routes/
  health.ts           → GET /api/health
lib/
  logger.ts           → Pino logger instance
  api-response.ts     → Response formatting utilities
```

### Startup Sequence

```
1. Validate environment variables (fail fast if invalid)
2. Initialize logger
3. Initialize database connection pool
4. Create Express app (middleware + routes)
5. Start HTTP server
6. Log startup confirmation with port and environment
```

### Middleware Pipeline Order

```
1. Helmet (security headers)
2. CORS
3. JSON body parser (express.json())
4. Request logger (pino-http)
5. Routes
6. Not-found handler (404)
7. Global error handler (must be last)
```

### Express 5 Considerations

Express 5 provides native promise/async error handling — rejected promises in route handlers are automatically forwarded to the error handler. This eliminates the need for `express-async-errors` or wrapper utilities.

---

## 4. Shared Package Responsibility

The `@pmocore/shared` package is the single source of truth for:

1. **API contract types** — Request/response shapes shared between frontend and backend
2. **Zod schemas** — Runtime validation schemas that generate TypeScript types
3. **Utility functions** — Pure functions useful to both frontend and backend (e.g., formatting, validation helpers)

### AUTH-01 Exports

For AUTH-01, the shared package exports:

```typescript
// schemas/api.ts
ApiSuccessResponse<T>    // Standard success envelope
ApiErrorResponse         // Standard error envelope
PaginationMeta           // Pagination metadata shape

// schemas/health.ts
HealthResponse           // GET /api/health response schema

// types/
// Re-exported inferred types from schemas
```

### Design Principle

Schemas are defined once in `@pmocore/shared`. The backend validates against them; the frontend uses the inferred types for type safety. This eliminates response shape drift.

---

## 5. Environment & Configuration Strategy

### Approach

Environment configuration uses a "validate at startup" pattern:

1. Environment variables are read from `process.env`
2. A Zod schema validates all required variables exist and are correctly typed
3. If validation fails, the app logs a clear error and exits with code 1
4. If validation passes, a typed config object is exported for use throughout the app

### Config Module (`apps/api/src/config/env.ts`)

```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),  // Standardized API dev port
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;
export const env: Env = envSchema.parse(process.env);
```

### .env.example

```env
# Application
NODE_ENV=development
PORT=3001              # Standardized API port (frontend uses 5173 via Vite)

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Logging
LOG_LEVEL=debug
```

### Decision: No dotenv in Production

- Development: `.env` file loaded via a lightweight mechanism (e.g., `dotenv` or `--env-file` flag in Node 24)
- Production (Render): Environment variables injected by the platform
- Test: Inline env or `.env.test`

---

## 6. Neon PostgreSQL & Drizzle Connectivity Design

### Connection

```typescript
// database/src/connection.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
  max: 10,                             // Connection pool size
});

export const db = drizzle(pool);
export { pool };
```

### Drizzle Configuration

```typescript
// database/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### AUTH-01 Scope

- The connection pool is initialized and exported
- The schema directory exists but contains no table definitions
- No migrations are generated (no tables yet)
- Health endpoint uses the pool to verify connectivity via `SELECT 1`

### Neon-Specific Considerations

- Neon requires SSL connections (`sslmode=require` in connection string)
- Neon supports connection pooling natively; the `pg` Pool provides application-level pooling
- Neon's serverless driver (`@neondatabase/serverless`) is NOT used; we use standard `pg` for compatibility and simplicity

---

## 7. Health Check Flow

```
Client → GET /api/health
           │
           ▼
     Route Handler
           │
           ├── Get current timestamp
           ├── Get app version
           ├── Execute: pool.query('SELECT 1')
           │       │
           │       ├── Success → database: "connected"
           │       └── Error   → database: "disconnected" (log error internally)
           │
           ▼
     Determine status:
       - All checks pass → "healthy"
       - Database failed  → "degraded"
           │
           ▼
     Return 200 JSON:
     {
       "success": true,
       "data": {
         "status": "healthy" | "degraded",
         "timestamp": "2024-01-01T00:00:00.000Z",
         "version": "0.1.0",
         "database": "connected" | "disconnected"
       }
     }
```

The health endpoint always returns 200. It never returns 500 or exposes internal error messages. This ensures monitoring tools can distinguish between "app is down" (no response) and "app is running but degraded."

---

## 8. Logging Strategy

### Logger Instance

A single Pino logger instance is created at application startup and used throughout the backend.

```typescript
// apps/api/src/lib/logger.ts
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
```

### Request Logging

`pino-http` middleware logs every HTTP request/response with:

- Request method and URL
- Response status code
- Response time in milliseconds
- Request ID (auto-generated)

### Log Levels

| Level | Usage |
|-------|-------|
| `error` | Unhandled exceptions, failed critical operations |
| `warn` | Degraded states, deprecated usage, recoverable failures |
| `info` | Startup events, significant state changes, health checks |
| `debug` | Detailed flow tracing (development only) |

### Production vs Development

- **Production:** JSON output (machine-parseable for log aggregation)
- **Development:** Pretty-printed, colorized output via `pino-pretty`

---

## 9. Error Handling Strategy

### Error Classification

| Error Type | HTTP Status | Code | Example |
|-----------|------------|------|---------|
| Validation Error | 400 | `VALIDATION_ERROR` | Invalid request body |
| Not Found | 404 | `NOT_FOUND` | Unknown route |
| Internal Error | 500 | `INTERNAL_ERROR` | Unhandled exception |

Additional codes (401, 403, 409, etc.) will be introduced with authentication and business modules.

### Custom Error Class

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
```

### Error Handler Middleware

```typescript
// Catches all errors (including rejected promises in Express 5)
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    // Known operational error → return structured response
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      }
    });
  }

  // Unknown error → log full details, return safe message
  logger.error(err, 'Unhandled error');
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    }
  });
}
```

---

## 10. Theme & Design Token Architecture

### Approach

PMOCore uses CSS custom properties (variables) as design tokens. Themes are applied by swapping a `data-theme` attribute on the document root, which activates the corresponding token set.

### Token Structure

```
src/styles/
├── tokens/
│   ├── _base.css         # Shared structural tokens (spacing, radius, typography)
│   ├── light.css         # Light theme colors
│   ├── dark.css          # Dark theme colors
│   ├── emerald.css       # Emerald theme colors
│   ├── ocean.css         # Ocean theme colors
│   ├── rustic.css        # Rustic theme colors
│   └── etch.css          # Etch theme colors
├── _variables.css        # Imports all token files
└── global.css            # Global styles, resets, Bootstrap overrides
```

### Token Categories

```css
:root, [data-theme="light"] {
  /* Surface */
  --pmo-bg-primary: #ffffff;
  --pmo-bg-secondary: #f8f9fa;
  --pmo-bg-tertiary: #e9ecef;

  /* Text */
  --pmo-text-primary: #212529;
  --pmo-text-secondary: #6c757d;
  --pmo-text-muted: #adb5bd;

  /* Brand / Accent */
  --pmo-accent-primary: #0d6efd;
  --pmo-accent-hover: #0b5ed7;

  /* Borders */
  --pmo-border-color: #dee2e6;
  --pmo-border-radius: 0.375rem;

  /* Sidebar / Navigation */
  --pmo-sidebar-bg: #1a1d23;
  --pmo-sidebar-text: #e9ecef;

  /* Status Colors */
  --pmo-status-success: #198754;
  --pmo-status-warning: #ffc107;
  --pmo-status-danger: #dc3545;
  --pmo-status-info: #0dcaf0;

  /* Spacing (structural, not theme-dependent) */
  --pmo-space-xs: 0.25rem;
  --pmo-space-sm: 0.5rem;
  --pmo-space-md: 1rem;
  --pmo-space-lg: 1.5rem;
  --pmo-space-xl: 2rem;

  /* Responsive Breakpoints (reference tokens — match Bootstrap 5) */
  --pmo-bp-sm: 576px;
  --pmo-bp-md: 768px;
  --pmo-bp-lg: 992px;
  --pmo-bp-xl: 1200px;
  --pmo-bp-xxl: 1400px;
}
```

### Theme Provider

```typescript
// React context that:
// 1. Reads persisted theme from localStorage
// 2. Detects system preference if theme is "system"
// 3. Sets data-theme attribute on <html>
// 4. Provides current theme + setter to children
```

### System Theme Handling

When the user selects "System," the provider uses `window.matchMedia('(prefers-color-scheme: dark)')` to determine whether to apply the dark or light token set, and listens for changes.

---

## 11. Testing Architecture

### Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit tests | Vitest | Pure functions, utilities, hooks |
| Component tests | Vitest + React Testing Library | React component behavior |
| API integration tests | Vitest + Supertest | HTTP endpoints |
| Shared package tests | Vitest | Schema validation, utilities |

### Configuration

Each workspace has its own `vitest.config.ts` that extends shared settings:

- `apps/web` — includes `jsdom` environment, React Testing Library setup
- `apps/api` — uses Node environment, includes Supertest
- `packages/shared` — uses Node environment
- `database` — uses Node environment (connectivity tests deferred)

### Test Execution

```
npm test              → runs vitest in all workspaces
npm run test:web      → runs tests in apps/web only
npm run test:api      → runs tests in apps/api only
```

### AUTH-01 Test Scope

Only one meaningful test is required for AUTH-01:

- `GET /api/health` returns 200 with correct shape

Additional tests for shared utilities and theme logic are encouraged but not mandated.

---

## 12. Local Development Flow

### Prerequisites

- Node.js 24 LTS
- npm 10+
- A Neon PostgreSQL database (free tier sufficient)

### Setup Steps

```bash
git clone <repository>
cd pmocore
cp .env.example .env    # Edit with Neon credentials
npm install             # Installs all workspace dependencies
npm run dev             # Starts frontend + backend concurrently
```

### Development Servers (Standardized Ports)

| Service | Port | Notes |
|---------|------|-------|
| Frontend (Vite) | 5173 | Proxies /api to backend |
| Backend (Express) | 3001 | API server |

These ports are the approved development standard for PMOCore.

### Concurrent Development

The root `dev` script uses a tool like `concurrently` to run both servers simultaneously with labeled output:

```
[web] Vite dev server running on http://localhost:5173
[api] API server running on http://localhost:3001
```

---

## 13. Build Flow

### Frontend Build

```bash
cd apps/web && vite build
```

- Output: `apps/web/dist/` (static HTML/CSS/JS)
- Suitable for: Render Static Site or served by backend

### Backend Build

```bash
cd apps/api && tsc
```

- Output: `apps/api/dist/` (compiled JavaScript)
- Entry point: `dist/index.js`
- Suitable for: Render Web Service (`node dist/index.js`)

### Shared Package Build

The shared package is consumed via TypeScript path references in development. For production build, it is compiled to JavaScript so the backend `dist/` can resolve it.

### Build Order

```
1. @pmocore/shared      (no dependencies on other workspaces)
2. @pmocore/database    (depends on shared)
3. @pmocore/api         (depends on shared, database)
4. @pmocore/web         (depends on shared)
```

---

## 14. Render Deployment Readiness

### Strategy (Approved — D-005: Single Service for V1)

AUTH-01 does NOT deploy to Render. It ensures the build output is compatible.

**Approved V1 Deployment Model:**

A single Render Web Service runs the Express backend which:
- Serves the API at `/api/*`
- Serves the built frontend static files (from `apps/web/dist`) for all other routes
- Handles client-side routing by falling back to `index.html` for non-API, non-static requests

**Build command:** `npm run build`
**Start command:** `node apps/api/dist/index.js`
**Environment variables:** Set in Render dashboard

This decision may be revisited later if scaling or operational requirements justify separating frontend and backend into independent services.

### Decision: Frontend Serving Strategy (Approved — D-005)

**Approved: Option B — Single Render Web Service for V1.**

In production, Express serves both the built React/Vite frontend (static files) and the `/api/*` API from the same service and origin. The backend detects `NODE_ENV === 'production'` and serves `apps/web/dist` as static files.

This is a V1 deployment decision. It may be revisited later if scaling or operational requirements justify separating frontend and backend into independent services.

---

## 15. Important Architectural Boundaries

### What AUTH-01 Establishes (Baseline)

- Monorepo structure and workspace references
- TypeScript strict mode across all packages
- Standard API response envelope (success/error)
- Centralized error handling pattern
- Structured logging pattern
- Environment validation pattern
- Theme token system
- Testing patterns and configuration
- Build pipeline

### What AUTH-01 Does NOT Establish

- Authentication/authorization middleware (AUTH-02+)
- Database tables or migrations (AUTH-02+)
- Business domain models (PROJECT, CLIENT, etc.)
- WebSocket or real-time patterns
- File upload infrastructure
- Email/notification infrastructure
- Background job processing
- CI/CD pipelines

### Conventions Established

| Convention | Standard |
|-----------|----------|
| Package naming | `@pmocore/<name>` |
| Import aliases | `@/` → `src/` (frontend) |
| API path prefix | `/api` |
| Test file naming | `*.test.ts` / `*.test.tsx` |
| Config approach | Zod-validated env vars |
| Error format | `{ success, error: { code, message, details } }` |
| Success format | `{ success, data, meta? }` |
| Log format | Structured JSON (prod), pretty (dev) |
| CSS variable prefix | `--pmo-` |
| Theme attribute | `data-theme` on `<html>` |

---

## Assumptions

1. **Node.js 24 LTS** is available and stable for use (it is the current LTS as of the project start).
2. **Neon free tier** is sufficient for development; connection pooling limits are acceptable.
3. **Express 5** is stable enough for production use (it has been in beta for years but is now released).
4. **ESLint flat config** (eslint.config.mjs) is used since ESLint 9+ is current.
5. **Bootstrap 5** is used primarily for utility classes and grid; custom theme tokens override its variables where needed.
6. Development ports are standardized: **frontend 5173**, **backend 3001** (approved).
7. **pino-pretty** is a dev dependency only, not included in production builds.
8. The seven-theme requirement is **architectural**: establish the centralized token/theme mechanism and functional switching. Detailed visual refinement of individual themes is not required during AUTH-01.

---

## Decisions Log

| ID | Decision | Rationale | Status |
|----|----------|-----------|--------|
| D-001 | npm workspaces over Turborepo/Nx | Simplicity; sufficient for team scale | Approved (baseline) |
| D-002 | Standard `pg` over Neon serverless driver | Compatibility, simplicity, standard tooling | Approved (baseline) |
| D-003 | Express 5 over Express 4 | Native async/await error handling | Approved (baseline) |
| D-004 | CSS custom properties over CSS-in-JS | Performance, simplicity, no runtime cost | Approved (baseline) |
| D-005 | Single service deployment (Option B) | Simplicity for V1; revisit if scaling requires separation | Approved |
| D-006 | Flat ESLint config (eslint.config.mjs) | Current ESLint standard | Approved (baseline) |
| D-007 | Vitest over Jest | Faster, native ESM, Vite-aligned | Approved (baseline) |
