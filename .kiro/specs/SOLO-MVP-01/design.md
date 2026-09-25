# PMOCore Solo MVP v1.0 — Architecture and Technical Design

**Tasks:** PMOCORE-DESIGN-001 (seq. 00007), revised by PMOCORE-ACCEL-001 (seq. 00009)
**Status:** Approved by Project Leadership (seq. 00011, PMOCORE-ACCEL-002) · **Baseline:** `develop` @ `83142f1`
**Target:** operational Solo MVP on **October 13, 2026** (fixed)

This document designs how the 77 approved requirements in `requirements.md` are built on the accepted AUTH-01 foundation. Implementation work is organised in `tasks.md`. This document does not change requirements or governance. Items still needing Project Leadership approval are consolidated in §17; proposed scope adjustments are in §14.3.

### Revision summary (ACCEL-001)

| Area | Previous draft | Revised |
|---|---|---|
| Authentication | Hand-built session store and cookie handling | Maintained components: `express-session` + `connect-pg-simple` (on the existing `pg` pool) + `express-rate-limit`; password hashing stays on Node's built-in `crypto.scrypt` (§4) |
| Attachment storage | Render persistent disk recommended | **S3-compatible object storage** (Cloudflare R2 recommended, S3 API only) for staging/production; local filesystem driver for development/tests; Render disk retained as documented fallback (§10.5) |
| Release traceability | One release per requirement/defect | **Join tables** `release_requirements` and `release_defects` preserving history; planning target kept as separate fields (§11.2) |
| Mobile camera | Outline | Full capture contract incl. HEIC and > 10 MB handling, no allowlist expansion (§10.2) |
| Attachment removal | Immediate object deletion | Soft delete immediately; object purge after retention via maintenance command (§10.6) |
| Deployment | Late staging | Early single-service deployment in Package 1; Neon/Render/R2 prerequisites specified (§15) |
| Reference data | Provisional values | Approved BASC initial values (seq. 00011); general status list shared by all modules; documented provisional/missing categories (§6.2) |
| Timezone | Open | `APP_TIMEZONE=Asia/Manila` (confirmed) |

---

## 1. Design Principles

1. **Reuse AUTH-01 as-is:** monorepo, Express 5 shell, error envelope, `AppError`, Pino with header redaction (D-010), Zod env validation, `@pmocore/database` pool/Drizzle with SSL ownership (D-008/D-009), shared Zod contracts, theme tokens, Bootstrap 5, Vitest/Supertest, D-011 dev startup, single-service Render deployment (D-005).
2. **Maintained components for security-sensitive plumbing; no frameworks.** No auth framework (Passport, Auth.js, Lucia, etc.), no new infrastructure beyond the approved stack plus one object-storage bucket.
3. **Project-scoped by construction:** non-null `project_id` on every business record; composite same-project foreign keys (§5.3).
4. **Derive, don't duplicate:** overdue, days open, progress, failed tests, open counts, last activity are computed.
5. **Multi-user ready, single-user shipped** (§4.6).
6. **Mobile-first where it matters:** Meetings & Visits, RAID quick-add, attachments, login.
7. **PostgreSQL (Neon) only.** No SQLite anywhere, including tests.

---

## 2. Baseline Inventory and Reuse

### 2.1 Existing (accepted AUTH-01, inherited)

| Area | Existing asset | Reuse |
|---|---|---|
| API shell | `apps/api/src/app.ts`: Helmet → CORS → JSON → pino-http → `/api` router → 404 → error handler | Session, CSRF, and auth middleware inserted before business routes |
| Errors / envelope | `AppError`, `errorHandler`, `sendSuccess`/`sendError`, shared envelope + pagination schemas | All modules |
| Config | Zod `env.ts` (API); `@pmocore/database` owns `DATABASE_URL`/`DATABASE_SSL` | New API keys added (§15.4) |
| Logging | Base-logger redaction of `cookie`, `authorization`, `set-cookie` (D-010) | Covers session cookie; add S3 credential safety (never logged) |
| Database | `pg` Pool + Drizzle; empty schema/migrations/seeds | Pool reused by Drizzle **and** the session store |
| Web | React 18, Vite, Bootstrap 5 CSS, TanStack Query, ThemeProvider (7 themes), `api-client.ts`; installed but unused: react-router-dom v7, React Hook Form, `@hookform/resolvers`, date-fns, lucide-react | Router, shell, component kit |
| Tests | Vitest everywhere; Supertest; API test-only source aliases | Extended (§16) |

### 2.2 Not yet built (to be built — not conflicts)

- **No authentication exists.** AUTH-01 deferred it ("AUTH-02+"). This design specifies it; no accepted AUTH-01 decision is replaced.
- No tables/migrations; no production static serving (D-005 approved but uncoded); no routing/business UI; no multipart handling; no live Neon/Render deployment.

---

## 3. Architecture Overview

```text
Browser (desktop / tablet / phone) ── HTTPS, same origin, HttpOnly session cookie
        │
Render Web Service (single, D-005)
  Express 5
   ├─ trust proxy (prod) · helmet · cors · json · pino-http        (AUTH-01)
   ├─ express-session (store: connect-pg-simple on shared pg Pool)  NEW
   ├─ csrfGuard (unsafe methods: Origin + X-PMO-Request header)     NEW
   ├─ /api/health · /api/auth/*  (login rate-limited)              public / session
   ├─ requireAuth
   ├─ /api/reference-data · /api/dashboard · /api/projects/**      modules
   ├─ static apps/web/dist + SPA fallback (production)             NEW (D-005)
   └─ notFound · errorHandler                                       (AUTH-01)
        │                                  │
  Neon PostgreSQL (pooled URL)       AttachmentStorage
  via @pmocore/database              ├─ S3Storage → Cloudflare R2 bucket (staging/prod)
                                     └─ LocalFsStorage (dev/test)
```

### 3.1 Workspace responsibilities

| Workspace | Adds |
|---|---|
| `database` | `src/schema/<area>.ts`, relations, generated SQL migrations, `seeds/reference-data.ts` (idempotent), `db:migrate` / `db:seed` scripts |
| `packages/shared` | `src/schemas/<module>.ts` Zod create/update/list schemas and DTO types; reference category constants; attachment policy constants |
| `apps/api` | `src/modules/<module>/` (routes, service, repository), auth/session/CSRF middleware, storage drivers, static serving, CLI scripts |
| `apps/web` | Router, AppShell, component kit, `src/features/<module>/` |

### 3.2 Backend module layout

```text
apps/api/src/
  modules/
    auth/            auth.routes.ts  auth.service.ts  password.ts  session.ts (express-session config)
    access/          project-access.service.ts          # single authorization choke point (§4.6)
    reference-data/  projects/  work-items/  requirements/  activities/  raid/
    testing/  releases/  documents/  dashboard/
    attachments/     attachments.routes.ts  attachments.service.ts  file-policy.ts
                     storage/{storage.ts, local-fs-storage.ts, s3-storage.ts}
  middleware/        require-auth.ts  csrf-guard.ts  load-project.ts
  lib/               record-code.ts  db-errors.ts  today.ts  pagination.ts
  scripts/           user-upsert.ts  attachments-purge.ts
```

| Layer | Responsibility | Must not |
|---|---|---|
| Routes | HTTP mapping, Zod parse (shared schemas), call service, `sendSuccess` | SQL, business rules |
| Service | Business rules, reference-category checks, same-project checks, code allocation, transactions, archived-project guard, derived fields | Touch `req`/`res` |
| Repository | Drizzle queries with explicit `projectId`, accepts `tx` | Authorization decisions |

Every project route is under `/api/projects/:projectId/...` behind `loadProject` → `ProjectAccessService`. No repository fetches a business record by `id` alone.

---

## 4. Authentication and Session Design

### 4.1 Options compared

| Criterion | A. Custom session store (previous draft) | **B. `express-session` + `connect-pg-simple` (selected)** | C. Auth framework (Passport/Auth.js/Lucia) |
|---|---|---|---|
| Security-sensitive custom code | Cookie parsing/signing, token rotation, expiry, pruning all hand-written | Session ID generation, signing, cookie handling, fixation-safe `regenerate`, expiry/pruning from maintained libraries | Least custom login code, but adds abstraction not needed for one local credential |
| Server-side sessions in PostgreSQL | Yes | Yes (`session` table; uses the existing `pg.Pool`, so D-008/D-009 SSL handling is inherited) | Depends on adapter |
| Dependencies | 0 | 2 small, widely used Express-ecosystem packages (+ types) | Framework + strategy + adapter |
| Fit with Express 5 / AUTH-01 | Good | Good (express org package; standard middleware) | More indirection |
| Token at rest | Hash stored | Session ID stored as-is (DB-read-access = session hijack; mitigated by Neon access control, short idle timeout) | Varies |

**Decision (DS-01, revised):** Option B. It removes the most security-sensitive hand-written code while adding no framework. No conflict with accepted AUTH-01 decisions was found: the session store reuses the `@pmocore/database` pool, so SSL behavior remains solely controlled by `DATABASE_SSL`; D-010 redaction already covers the session cookie.

### 4.2 Components and configuration

| Concern | Selected approach |
|---|---|
| Session middleware | `express-session`: `name: 'pmo_sid'`, `secret: SESSION_SECRET` (≥ 32 chars, env; array supported for rotation), `resave: false`, `saveUninitialized: false`, `rolling: true` |
| Cookie | `httpOnly: true`, `sameSite: 'lax'`, `secure: NODE_ENV === 'production'`, `path: '/'`, `maxAge` = idle timeout (7 days, `SESSION_IDLE_DAYS`) |
| Proxy | `app.set('trust proxy', 1)` in production (required for Secure cookies behind Render TLS termination) |
| Store | `connect-pg-simple` with `pool` = `@pmocore/database` pool, `tableName: 'session'`, `createTableIfMissing: false` (table created by our Drizzle migration using the library's documented schema), default pruning (15 min) |
| Absolute lifetime | `req.session.createdAt` set at login; `requireAuth` destroys sessions older than 30 days (`SESSION_ABSOLUTE_DAYS`) — express-session has no built-in absolute cap |
| Login | `POST /api/auth/login {email,password}` → verify → `req.session.regenerate()` (fixation defence) → set `userId`, `createdAt` → `save()` → `{user}`. Uniform 401 `INVALID_CREDENTIALS` for unknown email / wrong password / inactive user; verification runs a dummy hash on unknown email to equalise timing |
| Logout | `POST /api/auth/logout` → `req.session.destroy()` → `res.clearCookie('pmo_sid', sameOptions)` (REQ-003) |
| Current user | `GET /api/auth/me` → `{id,email,displayName}` or 401 |
| Password hashing | Node built-in `crypto.scrypt` (maintained by Node core; OWASP-listed), N=2^15, r=8, p=1, `maxmem` 64 MiB, 16-byte salt, encoded `scrypt$N$r$p$salt$hash`, `timingSafeEqual`. Chosen over Argon2 packages to avoid native binaries across Windows dev and Render Linux; parameters are encoded so they can be raised or migrated on next login |
| Login throttling | `express-rate-limit` on `POST /api/auth/login`: 5 failed attempts / 15 min per IP+email key (`skipSuccessfulRequests`), plus 50 / 15 min per IP; in-memory store (valid for the single-instance deployment) → 429 `RATE_LIMITED` |
| CSRF | Defence in depth, no deprecated `csurf`: (1) `SameSite=Lax` cookie; (2) for POST/PUT/PATCH/DELETE, `Origin` (or `Referer` fallback) must equal `APP_ORIGIN`; (3) unsafe requests must carry `X-PMO-Request: 1`, which cross-site HTML forms cannot send and cross-origin scripts cannot send without a CORS preflight that the server rejects. Failure → 403 `CSRF_REJECTED`. The `api-client` adds the header automatically |
| Session data | Only `userId`, `createdAt`; no PII or tokens in session JSON |

### 4.3 Operational user provisioning (REQ-001, REQ-005)

No registration or user-admin UI. `npm run user:upsert -w apps/api` creates or resets the single user from invocation-scoped environment variables (`PMO_USER_EMAIL`, `PMO_USER_NAME`, `PMO_USER_PASSWORD`, min 12 chars); values are never logged or committed. Run locally, then against staging/production (Render Shell or a one-off local run against the Neon URL). Password-change UI is not required by the requirements (P1 convenience).

### 4.4 Identity and route protection (REQ-002, REQ-004, REQ-074)

`requireAuth` loads `req.session.userId`, confirms the user is active, and sets `req.auth = { userId }`; otherwise 401 `UNAUTHENTICATED`. Services stamp `created_by`/`updated_by`/`uploaded_by`. Public routes: `GET /api/health`, `POST /api/auth/login`, static SPA assets. Everything else under `/api` is behind `requireAuth`; a route-table sweep test enforces it.

### 4.5 Frontend integration

`AuthProvider` (`useQuery(['auth','me'])`), `RequireAuth` route wrapper (redirect to `/login?next=`), login page usable at 360 px. `api-client` additions: `credentials: 'same-origin'`, `X-PMO-Request: 1` on unsafe methods, `upload()` for `FormData`, global 401 → clear cache → `/login`.

### 4.6 Future multi-user readiness (REQ-015, REQ-075, REQ-076)

- `users` table; audit columns reference it; `projects.owner_user_id` NOT NULL.
- `ProjectAccessService.assertAccess(actor, projectId, 'read'|'write')` is the only authorization decision point. Solo rule: project exists and `owner_user_id = actor`; otherwise **404**.
- Later (additive): `project_members(project_id, user_id, role)`, backfill owners, change `assertAccess`, add per-action permissions. No existing table, key, or path changes. Invitations, membership UI, RBAC remain deferred (REQ-077).

---

## 5. Database Design

PostgreSQL 15+ on Neon (local PostgreSQL for development/tests). Drizzle schema in `database/src/schema/`; migrations generated by `drizzle-kit generate`, committed, applied by a programmatic migrator (`npm run db:migrate`).

### 5.1 Conventions

| Convention | Rule |
|---|---|
| Primary keys | `uuid` default `gen_random_uuid()`; `reference_values.id` integer identity |
| Stable human IDs | `code`, unique per `(project_id, code)`, server-allocated, immutable (§5.5) |
| Audit | `created_at`, `created_by`, `updated_at`, `updated_by` on every business table (REQ-074) |
| Concurrency | `version integer` — PUT must send it; mismatch → 409 `VERSION_CONFLICT` |
| Dates | Business dates `date`; instants `timestamptz`; "today" in `APP_TIMEZONE=Asia/Manila` |
| Owners/assignees | Free-text `*_name` (stakeholders are not PMOCore users); additive `*_user_id` later |
| Lengths | Enforced in Zod (titles ≤ 200, long text ≤ 20 000) |

### 5.2 Entity model

```text
users 1─* projects (owner_user_id)           session (connect-pg-simple; sess.userId)
projects 1─* work_items, requirements, activities, raid_items, test_cases, defects,
             releases, acceptances, documents, attachments, record_counters
requirements *─* work_items     (requirement_work_items)
requirements 1─* test_cases     (test_cases.requirement_id)
test_cases   1─* defects        (defects.test_case_id)
releases     *─* requirements   (release_requirements)   history of inclusion
releases     *─* defects        (release_defects)        history of fixes delivered
requirements *─1 releases       (requirements.target_release_id)  planning target
defects      *─1 releases       (defects.target_fix_release_id)   planned fix version
releases     1─* acceptances    (acceptances.release_id)
activities   1─* raid_items     (raid_items.source_activity_id)   Meeting/Visit → Action
raid_items   *─1 requirements / releases (REQ-047)
activities, documents 1─* attachments (polymorphic parent, §10)
reference_values 1─* all taxonomy *_id columns
```

### 5.3 Same-project integrity

Every project-scoped table has `UNIQUE (project_id, id)`; every cross-record FK is composite with `project_id`:

```sql
FOREIGN KEY (project_id, requirement_id) REFERENCES requirements (project_id, id) ON DELETE RESTRICT
```

`MATCH SIMPLE` makes optional links work when the child column is NULL. Cross-project links are impossible at the database level.

### 5.4 Tables

**[std]** = `id`, `project_id`, `code`, audit columns, `version`.

**Identity and infrastructure**

| Table | Columns | Constraints / indexes |
|---|---|---|
| `users` | `id`, `email` (lower-cased), `display_name`, `password_hash`, `is_active`, `last_login_at`, `created_at`, `updated_at` | `UNIQUE(email)` |
| `session` | `sid varchar PK`, `sess json`, `expire timestamp(6)` — exact connect-pg-simple schema | index `expire` |
| `projects` | `id`, `code` (user-entered, `^[A-Z0-9-]{2,20}$`, immutable), `name`, `summary`, `phase_id`, `status_id`, `health_id`, `start_date`, `target_date`, `go_live_date`, `next_milestone_label`, `next_milestone_date` (manual fallback), `pm_remarks`, `owner_user_id`, `archived_at`, `archived_by`, audit, `version` | `UNIQUE(code)`; index `(owner_user_id, archived_at)` |
| `record_counters` | `project_id`, `record_type`, `next_value` | PK `(project_id, record_type)` |
| `reference_values` | `id`, `category`, `code`, `label`, `sort_order`, `semantic`, `is_active` | `UNIQUE(category, code)`; index `(category, sort_order)` |

**Plan and requirements**

| Table | Columns | Constraints / indexes |
|---|---|---|
| `work_items` | [std], `phase_id`, `workstream`, `title` (deliverable/task), `description`, `owner_name`, `planned_start`, `planned_end`, `actual_start`, `actual_end`, `percent_complete`, `status_id`, `priority_id`, `is_milestone`, `dependency_note`, `evidence_ref`, `evidence_document_id`, `remarks` | CHECK 0–100; CHECK end ≥ start; indexes `(project_id, status_id)`, `(project_id, planned_end)`, `(project_id, updated_at DESC)` |
| `requirements` | [std], `module`, `date_raised`, `source`, `statement`, `acceptance_criteria`, `type_id`, `priority_id`, `assignee_name`, `status_id`, `target_release_id`, `is_change_request`, `change_request_raid_id`, `validation_evidence`, `remarks` | indexes `(project_id, status_id)`, `(project_id, target_release_id)`, `(project_id, updated_at DESC)` |
| `requirement_work_items` | `project_id`, `requirement_id`, `work_item_id`, `created_at`, `created_by` | PK `(requirement_id, work_item_id)`; composite FKs `ON DELETE CASCADE`; index `work_item_id` |

**Meetings & Visits and RAID**

| Table | Columns | Constraints / indexes |
|---|---|---|
| `activities` | [std], `activity_type_id`, `title`, `activity_date`, `start_time`, `end_time`, `mode_id`, `location`, `end_users`, `attendees`, `agenda`, `findings`, `outcomes`, `todo_summary`, `minutes_ref`, `minutes_document_id`, `prepared_by_user_id`, `status_id`, `next_schedule_date`, `next_schedule_note`, `related_requirement_id`, `previous_activity_id` | indexes `(project_id, activity_date DESC)`, `(project_id, status_id)`, `(project_id, updated_at DESC)` |
| `raid_items` | [std], `type_id`, `title`, `description`, `impact`, `owner_name`, `date_raised`, `source_activity_id`, `probability_id`, `priority_id`, `due_date`, `status_id`, `mitigation`, `resolution`, `closed_date`, `evidence`, `remarks`, `requirement_id`, `release_id` | indexes `(project_id, type_id, status_id)`, `(project_id, due_date)`, `(project_id, source_activity_id)`, `(project_id, updated_at DESC)`; CHECK `closed_date >= date_raised` |

**Testing and defects**

| Table | Columns | Constraints / indexes |
|---|---|---|
| `test_cases` | [std], `module`, `requirement_id`, `stage_id`, `scenario`, `expected_result`, `actual_result`, `tester_name`, `test_date`, `result_id` (latest), `status_id`, `evidence`, `remarks` | indexes `(project_id, requirement_id)`, `(project_id, result_id)` |
| `defects` | [std], `test_case_id` (nullable), `external_ref`, `title`, `description`, `severity_id`, `assignee_name`, `status_id`, `target_fix_date`, `target_fix_release_id` (fix version), `retest_date`, `retest_result_id`, `remarks` | indexes `(project_id, test_case_id)`, `(project_id, status_id)` |

**Releases, acceptance, documents, attachments**

| Table | Columns | Constraints / indexes |
|---|---|---|
| `releases` | [std], `version_label`, `name`, `planned_date`, `release_date`, `environment_id`, `scope`, `deployment_status_id`, `demo_date`, `uat_date`, `uat_result_id`, `delivery_date`, `training_date`, `remarks` | `UNIQUE(project_id, version_label)`; index `(project_id, release_date)` |
| `release_requirements` | `project_id`, `release_id`, `requirement_id`, `note` (e.g., "revision 2"), `created_at`, `created_by` | PK `(release_id, requirement_id)`; composite FKs (release `CASCADE`, requirement `RESTRICT`); index `requirement_id` |
| `release_defects` | `project_id`, `release_id`, `defect_id`, `note`, `created_at`, `created_by` | PK `(release_id, defect_id)`; composite FKs (release `CASCADE`, defect `RESTRICT`); index `defect_id` |
| `acceptances` | [std], `release_id`, `status_id`, `acceptance_date`, `accepted_by`, `certificate_ref`, `certificate_document_id`, `handover_notes`, `remarks` | index `(project_id, release_id, created_at DESC)`; current = latest per release |
| `documents` | [std], `phase_id`, `document_type_id`, `title`, `doc_version`, `owner_name`, `document_date`, `status_id`, `link_url` (http/https), `related_requirement_id`, `related_activity_id`, `related_release_id`, `related_work_item_id`, `remarks` | CHECK ≤ 1 `related_*` non-null; index `(project_id, document_type_id)` |
| `attachments` | `id`, `project_id`, `parent_type` (`activity`\|`document`), `parent_id`, `original_name`, `content_type`, `extension`, `size_bytes`, `sha256`, `storage_driver`, `storage_key`, `capture_source` (`camera`\|`gallery`\|`file`, informational), `uploaded_by`, `uploaded_at`, `deleted_at`, `deleted_by`, `purged_at` | `UNIQUE(storage_key)`; CHECK `size_bytes BETWEEN 1 AND 10485760`; CHECK `parent_type IN (...)`; partial index `(project_id, parent_type, parent_id) WHERE deleted_at IS NULL` |

All taxonomy `*_id` → `reference_values(id)` `RESTRICT`; category validated by service. All `*_by` → `users(id)`.

### 5.5 Stable record codes

Allocated in the create transaction:

```sql
INSERT INTO record_counters (project_id, record_type, next_value) VALUES ($1, $2, 2)
ON CONFLICT (project_id, record_type) DO UPDATE SET next_value = record_counters.next_value + 1
RETURNING next_value - 1;
```

Prefixes: `WI`, `REQ`, `MV`, `TC`, `DEF`, `REL`, `ACC`, `DOC`; RAID by type at creation `ACT`, `RSK`, `ISS`, `DEC`, `DEP`, `CR` (code never changes on retype). Format `PREFIX-001`. BASC-specific ID formats, if the BASC taxonomy defines them, replace these prefixes in the seed/config without schema change.

### 5.6 Lifecycle, deletion, archival (REQ-016)

| Record | Behavior |
|---|---|
| Project | Archive/unarchive only; archived = read-only (409 `PROJECT_ARCHIVED`), hidden by default, visibly badged |
| Business records | Hard delete guarded by `RESTRICT` FKs → 409 `RECORD_IN_USE` listing referencing types; normal end-of-life via status |
| Link rows | `CASCADE` from the owning side as listed in §5.4 |
| Activity | Delete blocked while RAID items reference it; on delete, its attachments are soft-deleted in the same transaction |
| Attachments | Soft delete; object purged later (§10.6) |
| Reference values | Never deleted; deactivated |

---

## 6. Reference Data

### 6.1 Model

Single `reference_values` table by `category`; `semantic` carries machine meaning so logic never depends on labels:

| Semantic family | Values | Used by |
|---|---|---|
| Lifecycle | `OPEN`, `DONE`, `INACTIVE` | open counts, overdue, progress exclusion, closed-date auto-fill (`INACTIVE` = closed without completion) |
| Health | `GREEN`, `AMBER`, `RED`, `UNKNOWN` | dashboard (UNKNOWN or unset never shown as healthy) |
| Test result | `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `RETEST` | failed-test and retest-pending metrics |

Seeded by idempotent `database/seeds/reference-data.ts` (upsert by `(category, code)`; values only added or deactivated). No admin UI. `GET /api/reference-data` served from an in-memory cache; client caches with `staleTime: Infinity`.

### 6.2 BASC initial reference values (approved, seq. 00011)

**Approved values** (seeded exactly, in this order):

| Category | Values (semantic) | Used by |
|---|---|---|
| `PROJECT_PHASE` | Initiation · Data Gathering · Requirements Analysis · Design · Development · Internal Testing / SIT · UAT · Release / Deployment · Training and Turnover · Acceptance · Post-Implementation Support | `projects.phase_id`, `work_items.phase_id`, `documents.phase_id` |
| `STATUS` (general) | Not Started (OPEN) · In Progress (OPEN) · For Review / Validation (OPEN) · Blocked (OPEN) · Completed (DONE) · Accepted (DONE) · Deferred (INACTIVE) · Cancelled (INACTIVE) | every `status_id`, `releases.deployment_status_id`, and acceptance status (`acceptances.status_id`) |
| `PRIORITY` | Critical · High · Medium · Low | every `priority_id`; also defect `severity_id` (REQ-051) |
| `ACTIVITY_TYPE` | Meeting · Site Visit · Release Demo · Workshop · Training · UAT · Support Visit (REQ-030) | `activities.activity_type_id` |
| `RAID_TYPE` | Action · Risk · Issue · Decision · Dependency · Change Request (REQ-044) | `raid_items.type_id` |
| `TEST_RESULT` | Not Run (NOT_RUN) · Passed (PASS) · Failed (FAIL) · Blocked (BLOCKED) · For Retest (RETEST) | `test_cases.result_id`, `defects.retest_result_id`, `releases.uat_result_id` |
| `ENVIRONMENT` | Development · Test · UAT · Production | `releases.environment_id` |

This replaces the per-module status categories of the previous draft: all modules share the one general `STATUS` list, and severity/UAT/retest reuse `PRIORITY`/`TEST_RESULT`. No schema change results — only the category each `*_id` column is validated against.

**Derived from approved requirements (not new taxonomy):**

| Category | Values | Source |
|---|---|---|
| `TEST_STAGE` | SIT · UAT | REQ-049 names these stages; they match the approved phases "Internal Testing / SIT" and "UAT" |

**Provisional default (documented; implementation cannot proceed meaningfully without values):**

| Category | Values (semantic) | Why needed |
|---|---|---|
| `HEALTH` | Green (GREEN) · Amber (AMBER) · Red (RED) · Not Assessed (UNKNOWN) | REQ-007/013 require a settable project health; standard RAG convention. Replace or confirm via the seed at Project Leadership's direction |

**Genuinely missing — no values seeded (fields optional until Project Leadership supplies values):**

| Category | Field | Behavior until supplied |
|---|---|---|
| `REQUIREMENT_TYPE` | `requirements.type_id` (REQ-026) | Nullable; picker hidden while the category has no active values |
| `ACTIVITY_MODE` | `activities.mode_id` | Nullable and hidden; the free-text `location` field satisfies REQ-031 "location or mode" |
| `PROBABILITY` | `raid_items.probability_id` (REQ-046 "where applicable") | Nullable and hidden |
| `DOCUMENT_TYPE` | `documents.document_type_id` (REQ-060) | Nullable and hidden; document `title` identifies the document |

Adding values later is a seed change only. Notes for Project Leadership confirmation: the semantic mapping above (Deferred counts as not open; For Retest is counted separately from Failed); the general list has no "Rejected" value, so a rejected acceptance is recorded as Blocked or Cancelled with remarks unless a value is added.

---

## 7. API Design

### 7.1 Conventions

Unchanged AUTH-01 envelope; lists return `meta` pagination. `GET` list/detail, `POST` create, `PUT` update (editable fields + `version`), `DELETE`; actions as `POST …/<verb>`. List query: `q`, module filters (`statusId`, `typeId`, `open`, `overdue`, `from`, `to`, …), whitelisted `sort` + `dir`, `page`, `pageSize ≤ 100` (REQ-062/063). Detail responses embed the relationship summaries their screen needs. Invalid UUID → 404.

### 7.2 Endpoints (`…` = `/api/projects/:projectId`)

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` |
| Reference / dashboard | `GET /api/reference-data` · `GET /api/dashboard` |
| Projects | `GET/POST /api/projects` · `GET/PUT …` · `POST …/archive` · `POST …/unarchive` · `GET …/overview` |
| Work items | `GET/POST …/work-items` · `GET/PUT/DELETE …/work-items/:id` |
| Requirements | `GET/POST …/requirements` · `GET/PUT/DELETE …/requirements/:id` · `PUT …/requirements/:id/work-items {workItemIds[]}` |
| Meetings & Visits | `GET/POST …/activities` · `GET/PUT/DELETE …/activities/:id` · `POST …/activities/:id/actions` |
| RAID | `GET/POST …/raid-items` · `GET/PUT/DELETE …/raid-items/:id` |
| Testing | `GET/POST …/tests` · `GET/PUT/DELETE …/tests/:id` · `GET/POST …/defects` · `GET/PUT/DELETE …/defects/:id` |
| Releases | `GET/POST …/releases` · `GET/PUT/DELETE …/releases/:id` · `PUT …/releases/:id/requirements {items:[{requirementId,note?}]}` · `PUT …/releases/:id/defects {items:[{defectId,note?}]}` · `POST …/releases/:id/acceptances` · `PUT/DELETE …/acceptances/:id` |
| Documents | `GET/POST …/documents` · `GET/PUT/DELETE …/documents/:id` |
| Attachments | `GET …/attachments?parentType=&parentId=` · `POST …/attachments` (multipart, one file) · `GET …/attachments/:id/content[?download=1]` · `DELETE …/attachments/:id` |
| Lookups | `GET …/lookup?type=requirement|work-item|release|test|defect|activity&q=` → `{id, code, title}` |

---

## 8. Frontend Design

### 8.1 Routing and shell

`createBrowserRouter` (react-router-dom v7). Routes: `/login`, `/` (Dashboard), `/projects`, `/projects/new`, `/projects/:projectId` (Overview) with child modules `plan`, `requirements`, `meetings`, `raid`, `testing`, `releases`, `documents`, each with `new` and `:recordId`. AppShell: Bootstrap navbar with React-controlled offcanvas on `< md` (no Bootstrap JS/Popper), theme selector, logout. ProjectLayout: header badges, archived banner, horizontally scrollable module pills. Module routes lazy-loaded.

### 8.2 Component kit

`PageHeader`, `QueryState` (loading/empty/error — REQ-064), `FilterBar` (URL-state search/filters/sort; no saved views — REQ-065), `DataList` (table ≥ md, cards < md), `Pagination`, `StatusBadge`/`RefBadge` (semantic → existing `--pmo-status-*` tokens; missing → neutral "Not set"), `RefSelect`, `RecordPicker` (single/multi via `/lookup`), `FormField`/`TextArea`/`DateField` (React Hook Form + `zodResolver`, native date inputs, server field errors mapped), `ConfirmDialog`, `AttachmentPanel` (§10.2), `DerivedValue` (REQ-010). Feature code in `apps/web/src/features/<module>/`.

### 8.3 Shared schemas at runtime in web (DS-04)

Runtime import of `@pmocore/shared` would resolve to an absent `dist` in a clean checkout. Resolution, mirroring the existing API test-only alias: alias `@pmocore/shared` → `packages/shared/src/index.ts` in `apps/web/vite.config.ts` **only when `command === 'serve'`**, and in `apps/web/vitest.config.ts`. Production `vite build` resolves the compiled package (root build builds shared first). Implemented in Package 1 under its authorization.

### 8.4 Responsive rules (REQ-043, REQ-066, REQ-067)

360 px-first for login, Meetings & Visits, RAID quick-add, attachments; everything else free of horizontal page scroll at 360 px. Touch targets ≥ 44 px; sticky bottom primary action on long mobile forms; auto-growing textareas; no hover-only or drag-only interactions.

---

## 9. Meetings & Visits (Critical Path)

### 9.1 Record (REQ-029–033)

Mobile form order: **Basics** (type, title, date, times, status, mode, location) → **People** (end users, attendees as multi-line text, prepared-by defaults to current user) → **Content** (agenda, findings, outcomes/decisions, to-do summary) → **Follow-up** (actions §9.2, next schedule date/note) → **References** (related requirement, minutes ref/document) → **Attachments**. List: date-descending; filters type/status/date/text; cards show date, type, title, status, open-action count, attachment count. Future-dated activities with an OPEN status (e.g., Not Started) serve as the schedule (dedicated calendar deferred, REQ-077).

### 9.2 Relationship to Actions/RAID (REQ-033, REQ-034, REQ-068)

Follow-up actions are real `raid_items` rows with `source_activity_id`; the activity detail shows them live (code, description, owner, due date, status, overdue). `POST …/activities/:id/actions` accepts one or more compact rows `{typeCode?, title, ownerName?, dueDate?, priorityId?}` and in one transaction inherits `project_id`, `source_activity_id`, `date_raised` = activity date, `requirement_id` = activity's related requirement, default status Not Started, and a `remarks` back-reference. UI: inline three-field "Quick add action" row, repeatable, one-handed on a phone.

### 9.3 Editability and save independence

Editable while the project is not archived (Completed/Cancelled status does not lock). The activity record is saved independently of attachments; attachments are only added to an already-saved activity, so an upload failure can never roll back or corrupt meeting data (§10.4). "Save" on a new activity opens its detail view with the Attachments section in focus.

---

## 10. Attachments (Mandatory for October 13)

### 10.1 Allowlist (unchanged, approved)

| Extension | Canonical MIME | Signature | Opens |
|---|---|---|---|
| `.pdf` | `application/pdf` | `%PDF-` | inline |
| `.png` | `image/png` | `89 50 4E 47 0D 0A 1A 0A` | inline |
| `.jpg` `.jpeg` | `image/jpeg` | `FF D8 FF` | inline |
| `.webp` | `image/webp` | `RIFF????WEBP` | inline |
| `.docx` | `…wordprocessingml.document` | ZIP `50 4B 03 04` | download |
| `.xlsx` | `…spreadsheetml.sheet` | ZIP `50 4B 03 04` | download |
| `.doc` | `application/msword` | OLE `D0 CF 11 E0 A1 B1 1A E1` | download |
| `.xls` | `application/vnd.ms-excel` | OLE `D0 CF 11 E0 A1 B1 1A E1` | download |

Limit 10 MB (10 485 760 bytes). Extension and signature must match the same row; stored `content_type` is canonical, never client-declared. **HEIC/HEIF and all other types are not accepted; the allowlist is not expanded by this design.**

### 10.2 Browser-based capture contract (REQ-035–038, REQ-043, REQ-067)

`AttachmentPanel` shows three explicit buttons, each backed by a hidden input:

| Button | Input | Behavior |
|---|---|---|
| **Take photo** | `type="file" accept="image/jpeg,image/png,image/webp" capture="environment"` | Opens the rear camera directly on supporting mobile browsers (Android Chrome, iOS Safari). Where `capture` is unsupported (desktop, some browsers) it degrades to a normal image chooser — never an error |
| **Photos** | `type="file" accept="image/jpeg,image/png,image/webp" multiple` | Device gallery / photo library, multi-select. On Android the chooser also offers the camera |
| **Files** | `type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" multiple` | Documents and images from device storage or cloud providers |

- **`accept` value for the camera input:** the specific JPEG/PNG/WEBP list is preferred because it steers iOS toward JPEG. If G2 physical testing shows a target browser does not open the camera with that list, the input falls back to `accept="image/*"` (UI attribute only — the server allowlist is unchanged and still rejects HEIC). The outcome is recorded in the PKG-2 report.
- **Native capture only** — no `getUserMedia` or custom camera UI; no permission prompts to manage; no native app (REQ-037).
- **Multiple attachments:** each file uploads as its own request (max 2 concurrent). The panel lists every file with state *queued → uploading → saved* or *rejected (reason)* and offers retry for network failures. One rejection never affects other files or the meeting.
- **Client pre-checks (UX only; server authoritative):** extension/type against the allowlist and size ≤ 10 MB, before any bytes are sent.
- **HEIC behavior:** iPhones store photos as HEIC by default. Because the camera and gallery inputs request JPEG/PNG/WEBP only, iOS Safari normally delivers a JPEG-converted copy. HEIC can still arrive (e.g., picked through **Files**, other browsers, or shared originals). Then the client (by extension/MIME) or the server (by signature) rejects it with: *"HEIC photos aren't supported yet. Use Take photo or Photos (which send JPEG), or set iPhone Settings → Camera → Formats → Most Compatible."* Actual iOS behavior is a mandatory physical-acceptance check (§16.4). Adding HEIC support (server-side conversion) would be an allowlist change requiring Project Leadership approval.
- **Photos larger than 10 MB:** typical phone camera JPEGs are 2–6 MB, but high-resolution modes (48 MP+) can exceed 10 MB. P0 behavior: rejected before upload with *"This photo is X MB; the limit is 10 MB. Switch the camera to standard resolution, or use a smaller image."* The limit is not raised. **Proposed P1 (SA-4):** a user-initiated "Reduce and upload" action on that rejection, which re-encodes the image in the browser (canvas, JPEG) to ≤ 10 MB. It never runs silently and produces a JPEG within the existing allowlist.
- **Preview:** image thumbnails use the authenticated content endpoint with `loading="lazy"`; PDFs open inline in a new tab; Office files download. Each row shows name, type icon, size, uploaded by, uploaded at (REQ-038, REQ-040). Orientation relies on browser EXIF handling (verified physically).

### 10.3 Upload processing

```text
POST …/attachments   multipart: parentType, parentId, captureSource?, file
 1 requireAuth → csrfGuard → loadProject(write) → project not archived
 2 multer memoryStorage, limits {fileSize: 10 MiB + 1, files: 1, fields: 5, fieldSize: 1 KiB}
     oversize → 413 FILE_TOO_LARGE; missing/extra file → 400 VALIDATION_ERROR
 3 parent exists in this project and is editable            → 404 / 409
 4 sanitize display name (strip paths/control chars, NFC, ≤ 200 chars)
 5 extension + signature check                              → 415 UNSUPPORTED_FILE_TYPE (clear message)
 6 id = uuid; storage_key = "<projectId>/<attachmentId>"; sha256
 7 storage.put(key, buffer, contentType)
 8 INSERT attachment row + touch parent updated_at/by (one transaction)
     on failure → storage.delete(key) best effort; error returned; no row exists
 9 201 → metadata DTO
```

`multer` (v2 line) is mounted only on this route; the JSON body limit is unchanged.

### 10.4 Integrity guarantees (rejected uploads never corrupt the meeting)

- The activity row is never modified by a rejected upload; only a successful insert touches `updated_at`.
- No metadata row exists unless the object was stored first; an object without a row (crash between 7 and 8) is an orphan found by the purge/reconcile command, never visible to users.
- Validation failures happen before any storage write.
- Tests cover each failure path (§16.1).

### 10.5 Storage: comparison and recommendation (DS-03, revised)

```ts
interface AttachmentStorage {
  readonly driver: 'local' | 's3';
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  openRead(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;           // idempotent
  list?(prefix: string): AsyncIterable<string>; // reconcile only
}
```

Keys are server-generated, validated `^[0-9a-f-]{36}/[0-9a-f-]{36}$`; the local driver also asserts the resolved path is inside its root (REQ-042).

| Criterion | Render persistent disk | S3-compatible object storage (R2 recommended) |
|---|---|---|
| Deployment simplicity | Attach disk to service, set mount path | Create bucket + scoped API token; 6 env vars |
| Cost | Requires paid instance (disk not available on free instances) plus per-GB disk charge | Cloudflare R2: free allowance of storage and operations (≈10 GB), no egress fees; beyond that low per-GB. Verify current pricing at setup |
| Durability | Single disk; Render daily snapshots (restore to snapshot, i.e., up to ~24 h of photos can be lost) | Object storage durability across devices/zones; independent of the app instance |
| Backups | Disk snapshots, separate from Neon PITR | Provider durability; optional bucket-to-bucket copy (post-MVP); soft-delete retention protects against accidental removal |
| Migration effort later | Copy files out of the disk via shell (plan-dependent) | Any S3-compatible provider (AWS S3, B2, MinIO) by changing endpoint/credentials and copying objects |
| Development speed | Slightly faster (local driver only) | + one driver using `@aws-sdk/client-s3` (~half day incl. tests) |
| Operational limitations | Service pinned to a single instance; no zero-downtime deploys with a disk; disk resize/plan constraints | External account and credential rotation; server-proxied downloads use app bandwidth (acceptable at this scale) |
| Vendor lock-in | Tied to Render disk | S3 API is a de-facto standard; low lock-in |

**Recommendation:** use **S3-compatible object storage via the generic S3 API, with Cloudflare R2 as the provider** for staging and production; `LocalFsStorage` for development and automated tests. Meeting evidence (site-visit photos) gets durability independent of the Render instance, deployments stay stateless, the free Render instance tier is not forced into a paid plan by storage, and provider choice stays open. **Fallback:** if the R2 account cannot be provisioned by the Package 2 staging deployment, run `LocalFsStorage` on a Render persistent disk (same code path, paid instance required) and migrate objects to R2 after October 13 by a copy script. New dependency: `@aws-sdk/client-s3` (API only). Downloads are always server-proxied; the bucket is private; no public or presigned URLs in the MVP.

### 10.6 Retrieval, removal, and purge

- `GET …/attachments/:id/content` → `requireAuth` → `loadProject(read)` → row matches project and is not deleted → stream with canonical `Content-Type`, `X-Content-Type-Options: nosniff`, `Content-Disposition` (`inline` for images/PDF, `attachment` for Office or `?download=1`, RFC 6266 `filename*`), `Cache-Control: private, no-store`.
- `DELETE …/attachments/:id` (REQ-039) → access + parent editable → set `deleted_at/by`, touch parent (transaction). The attachment disappears and becomes unretrievable immediately.
- `npm run attachments:purge -w apps/api` deletes objects of attachments soft-deleted more than `ATTACHMENT_PURGE_DAYS` (default 30) ago, sets `purged_at`, and reports orphan objects without rows. Manual command for the MVP (P1 to schedule).
- Multi-user: the same `assertAccess` call gains membership checks; no attachment code changes (policy §8).
- Privacy: EXIF GPS metadata is stored unmodified; stripping is post-MVP (§17).

---

## 11. Dashboard, Overview, and Traceability

### 11.1 Metrics (REQ-006–010, 017, 018, 023, 048, 053)

| Metric | Source | Kind | Unavailable state |
|---|---|---|---|
| Name/code, phase, status, health, target date, PM remarks | `projects` | Manual | "Not set"; health unset or UNKNOWN → grey "Not assessed" |
| Plan progress % | mean `percent_complete` of work items excl. INACTIVE (DONE = 100) | Derived | no work items → "No plan data" (null, never 0 %) |
| Open requirements | status semantic OPEN | Derived | `{open,total}`; total 0 → "No requirements" |
| Open / overdue actions | RAID type Action, OPEN; overdue = OPEN ∧ `due_date < today(Asia/Manila)` | Derived | as above |
| Open issues | RAID type Issue, OPEN | Derived | as above |
| Failed tests / retest pending | `test_cases.result` semantic FAIL / RETEST | Derived | "No tests" |
| Days open | `(closed_date ?? today) − date_raised` | Derived | — |
| Next milestone | earliest open `is_milestone` work item with `planned_end ≥ today`; else manual fields | Derived + manual fallback | "No milestone" |
| Last activity | max `updated_at` across project and records | Derived | project `created_at` |
| Upcoming activities | OPEN-status activities with `activity_date ≥ today`, next 5 | Derived | "Nothing scheduled" |
| Release/acceptance state | latest release + its latest acceptance | Derived | "No releases" |
| Recent activity | top 10 by `updated_at` (`UNION ALL` of per-table top-10) | Derived | "No activity yet" |

RAID `closed_date` auto-set on transition to DONE/INACTIVE when blank; cleared on reopen. `GET /api/dashboard` runs one `GROUP BY project_id` query per table (~8 queries), filtered to the actor's active projects; formulas are pure functions in `dashboard/metrics.ts`. No analytics infrastructure (REQ-011).

### 11.2 Traceability (REQ-014, 052, 056, 058, 068–073)

| Relationship | Storage | On screen |
|---|---|---|
| Meeting/Visit → Action | `raid_items.source_activity_id` | Activity detail; RAID detail back-link |
| Requirement ↔ Work Item | `requirement_work_items` | Both details |
| Requirement → Test | `test_cases.requirement_id` | Requirement detail with latest results |
| Test → Defect → Retest | `defects.test_case_id`, `retest_date`, `retest_result_id` | Test and requirement details |
| Requirement → Release | `release_requirements` (history) + `requirements.target_release_id` (plan) | Release: "Included requirements"; Requirement: "Target release" and "Released in" list |
| Defect → Release | `release_defects` (history) + `defects.target_fix_release_id` (plan) | Release: "Included defects"; Defect: "Fix planned for" and "Fixed in" |
| Release → Acceptance | `acceptances.release_id` (1:N history) | Release detail |
| RAID → Requirement / Release | `raid_items.requirement_id`, `release_id` | Both details |
| Document → related record | one `related_*_id` | Document detail |

**Release traceability decision (DS-05, revised):** the one-release restriction is **withdrawn**. It could not represent a requirement delivered across releases, a revised requirement re-released, a defect fixed in a hotfix and re-verified in a later release, or the history of what each release contained. Final model:

- `release_requirements` and `release_defects` are the authoritative, many-to-many **history of inclusion**, each row with an optional `note` (e.g., "Revision 2 — added filters", "Regression fix").
- `requirements.target_release_id` and `defects.target_fix_release_id` remain single-valued **planning** fields (REQ-026 "target release", REQ-051 "fix version"). When a requirement/defect is added to a release's scope, the UI offers to set the planning field; history rows are never removed by changing the plan.
- Acceptances are 1:N per release (rejections and re-acceptance preserved).
- Cost to the MVP: two link tables and one multi-select on the release form — the same `RecordPicker` used for requirement ↔ work-item links.

Requirement detail is the trace view: statement → work items → tests (results) → defects (status/retest) → target release and released-in releases → acceptance status, in one request using indexed FK lookups.

---

## 12. Validation and Error Handling

Shared Zod schemas validate every input (API authoritative; web reuses them via DS-04). Service rules: reference id in expected category and active; related records in the same project (backed by composite FKs); date ordering; percent 0–100; `link_url` http/https only; archived-project write guard; `version` match.

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod/service validation; `details` field list |
| 401 | `UNAUTHENTICATED` / `INVALID_CREDENTIALS` | No/expired session; bad login |
| 403 | `CSRF_REJECTED` | Origin/header check failed |
| 404 | `NOT_FOUND` | Unknown or other-project id; deleted attachment |
| 409 | `VERSION_CONFLICT` · `DUPLICATE` · `RECORD_IN_USE` · `PROJECT_ARCHIVED` | Concurrency; 23505; 23503; archived |
| 413 | `FILE_TOO_LARGE` | > 10 MB |
| 415 | `UNSUPPORTED_FILE_TYPE` | Not in allowlist / signature mismatch |
| 429 | `RATE_LIMITED` | Login throttling |
| 500 | `INTERNAL_ERROR` | AUTH-01 behavior |

`lib/db-errors.ts` maps PostgreSQL error codes to `AppError`; no SQL, constraint text, paths, storage keys, or bucket details reach clients. Web: inline field errors, banner for others, "Reload latest" on `VERSION_CONFLICT`.

---

## 13. Security and Data Integrity

| Control | Solo MVP (now) | Added with multi-user |
|---|---|---|
| Authentication | express-session on all `/api` except health/login | Same |
| Authorization | `requireAuth` + `assertAccess` (owner) on every project route and attachment request | Membership/role checks inside `assertAccess`; per-action permissions |
| Project isolation | Repositories filter by `project_id`; composite FKs; cross-project → 404 | + membership |
| Cross-project lists | Filter `owner_user_id = actor` | Filter by membership |
| CSRF | SameSite=Lax + Origin + custom header | Same |
| Brute force | express-rate-limit (in-memory, single instance) | Shared store (PostgreSQL) if scaled out |
| Input | Zod everywhere; lengths; reference checks | Same |
| Attachments | Auth + project check; signature validation; generated keys; private bucket; server-proxied; nosniff; soft delete + purge | Role-based view/remove |
| Deletion | Archive projects; RESTRICT; attachment soft delete | Deletion permissions |
| Transactions | Create + code allocation; link-set replacement (work items, release scope); activity + follow-up actions; activity delete + attachment soft delete; attachment insert/delete + parent touch | Same |
| Secrets | `SESSION_SECRET`, S3 keys, DB URL only in env; never logged (D-010 + no config dumps) | Same |
| Transport | Render HTTPS; Secure cookie with trust proxy; Helmet | Same |

---

## 14. October 13 Delivery Strategy

### 14.1 Calendar

Today is Friday, 2026-09-25. October 13 (Tuesday) is 18 calendar days away. Package plan and gates are in `tasks.md`. The schedule assumes Project Leadership review turnaround of ≤ 1 day per gate and implementation on some weekend days; both assumptions are stated risks.

### 14.2 Smallest operational version per module

| Module | P0 / P0-minimal scope for October 13 | Requirements fully satisfied? |
|---|---|---|
| Authentication | Login, logout, protection, user script | Yes (001–005) |
| Projects + Overview | CRUD, archive, overview metrics and recent activity | Yes (012–018) |
| Work Items | All REQ-020/021 fields, requirement links, milestone flag, derived progress | Yes (019–023) |
| Requirements | All fields, lifecycle statuses, work-item links, target release, trace detail | Yes (024–028) |
| Meetings & Visits | Full record, quick-add follow-ups, attachments incl. camera/gallery | Yes (029–043) |
| Actions & RAID | Unified six types, all fields, derived overdue/days open, links | Yes (044–048) |
| Testing & Defects (**P0-minimal**) | One test record per scenario holding its latest result; defects linked to tests with retest date/result; list/filter/forms; failed-test metric | Yes (049–053); per-execution history not kept (SA-2) |
| Releases & Acceptance (**P0-minimal**) | Release record with all REQ-055 fields; scope selection of requirements and defects (history tables); acceptance records with certificate reference | Yes (054–058) |
| Documents (**P0-minimal**) | Document register with metadata, external link, one related record, **and basic file upload by reusing the attachment service** (`AttachmentPanel` with `parentType='document'`) | Yes (059–061) |
| Dashboard | §11.1 | Yes (006–011) |
| Search/filter/states, responsive | Shared components on every list | Yes (062–067) |

### 14.3 Scope adjustments — decided by Project Leadership (seq. 00011)

| ID | Decision | Requirement impact |
|---|---|---|
| **SA-1** | **Not deferred.** Basic Documents file upload is included for October 13 by reusing the attachment service and `AttachmentPanel` | REQ-059/060/061 fully satisfied |
| **SA-2** | Approved: tests keep the latest result; retest tracked on defects; no execution history | REQ-049–053 satisfied |
| **SA-3** | Approved: meeting attendees and end users as free text | REQ-031 satisfied |
| **SA-4** | Approved: client-side photo downscaling ("Reduce and upload") is P1; P0 rejects > 10 MB photos with guidance | REQ-041 satisfied |
| **SA-5** | Approved P1: password-change UI, a scheduled-activities view, follow-up activity cloning. The scheduled-activities view is interpreted as a filtered list/agenda of future activities inside Meetings & Visits, **not** the dedicated Calendar module that REQ-077 defers. Other P1 conveniences from the proposal (scheduled purge job, upload progress bars, document back-links) remain P1 | No approved requirement depends on them |
| **SA-6** | Approved post-MVP: thumbnails, EXIF stripping, HEIC support, test execution history, full-text search, multi-user membership (plus change-history audit log) | Not required by the 77 requirements (HEIC would be an allowlist change) |

No P1 classification applies to Meetings & Visits attachment, gallery, or camera requirements (REQ-035–043 remain P0). If schedule pressure arises, the order of risk is: Documents UI polish → Releases & Acceptance → Testing & Defects (Documents upload itself is P0-minimal and not deferrable without a new decision); Project Leadership decides at Gate G3 whether go-live may proceed with any P0-minimal module incomplete.

---

## 15. Deployment Design

### 15.1 Topology

One Render Web Service (D-005). Build: `npm ci --include=dev && npm run build`. Start: `node apps/api/dist/index.js`. Health check path: `/api/health`. Region: **Singapore** (closest to Asia/Manila), with the Neon project in AWS `ap-southeast-1` (Singapore) to minimise DB latency. Node version pinned to 24 via `NODE_VERSION` or `.node-version`.

**Environments:** one Render service and one Neon database, deployed from Package 1 onward and used as staging until Gate G4. Before go-live, staging data is cleared (truncate business tables, re-seed, re-create the user) and the same service becomes production. A separate permanent staging service is post-MVP. (DS-12)

**Instance plan (DS-13):** Render free instances sleep after inactivity (cold starts of up to about a minute) and lack a Shell. For a field tool used from phones, a paid Starter instance is recommended for production. R2 storage means a disk is not required either way.

### 15.2 Neon prerequisites

- Project in Singapore region; database `pmocore`; role for the app.
- Use the **pooled** connection string for the app (single instance, `pg` pool max 10).
- **Remove `sslmode=require`** (and any other SSL parameter) from the Neon URL — AUTH-01 D-009 rejects it — and set `DATABASE_SSL=require`. Neon strings may also contain `channel_binding=require`; confirm `pg` accepts it or remove it (verified during Package 1).
- Migrations: `npm run db:migrate && npm run db:seed` from a developer machine against Neon or as the Render pre-deploy command (paid plans). Both idempotent.
- Backups: Neon point-in-time restore window per plan; note the retention in the Package 1 report.

### 15.3 Render prerequisites

- Web service linked to GitHub `develop` (staging phase) or a release branch per Project Leadership; auto-deploy only on authorized checkpoints.
- `app.set('trust proxy', 1)` in production; `APP_ORIGIN` = the Render HTTPS URL (or custom domain).
- Production static serving + SPA fallback implemented (D-005) and Helmet CSP verified against the Vite build.

### 15.4 Environment variables (added in Package 1/2 under authorization)

| Variable | Dev default | Production |
|---|---|---|
| `NODE_ENV`, `PORT`, `DATABASE_URL`, `DATABASE_SSL`, `LOG_LEVEL` | existing | existing (Neon pooled URL without SSL params; `require`) |
| `APP_ORIGIN` | `http://localhost:5173` | `https://<service>.onrender.com` |
| `APP_TIMEZONE` | `Asia/Manila` | `Asia/Manila` |
| `SESSION_SECRET` | dev value in `.env` | random ≥ 32 chars (Render secret) |
| `SESSION_IDLE_DAYS` / `SESSION_ABSOLUTE_DAYS` | 7 / 30 | 7 / 30 |
| `ATTACHMENT_STORAGE_DRIVER` | `local` | `s3` |
| `ATTACHMENT_STORAGE_DIR` | `./.data/attachments` | — |
| `ATTACHMENT_MAX_BYTES` | 10485760 | 10485760 |
| `ATTACHMENT_PURGE_DAYS` | 30 | 30 |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` | — | R2: `https://<account>.r2.cloudflarestorage.com`, `auto`, `pmocore-attachments`, bucket-scoped token, `true` |

Startup fails fast on invalid combinations (e.g., `s3` without credentials; `local` with an unwritable directory). `.gitignore` gains `.data/`.

### 15.5 Cloudflare R2 prerequisites

Cloudflare account; private bucket `pmocore-attachments` (location hint APAC); API token with Object Read & Write scoped to that bucket only; no public access, no custom domain. A separate bucket (or prefix) for staging data is optional since staging data is cleared before go-live — prefix `staging/` is sufficient if one bucket is used.

### 15.6 HTTPS, cookies, and phones

Secure cookies require HTTPS, provided by Render. Phone testing on LAN during development uses the Vite dev server over HTTP with `Secure` off (development only). All physical camera acceptance runs against the HTTPS Render deployment.

---

## 16. Verification Strategy

### 16.1 Automated — API (Vitest + Supertest)

| Area | Coverage |
|---|---|
| Auth | Login sets `pmo_sid` HttpOnly, SameSite=Lax, Secure in production mode; session ID changes across login (fixation); uniform 401 for unknown email/wrong password; throttling → 429; logout destroys session; absolute-lifetime expiry; route-table sweep: every non-public route 401 without session |
| CSRF | Unsafe request with foreign/missing Origin or missing `X-PMO-Request` → 403 |
| Logging | Session cookie values never appear in logs; S3 secrets never logged |
| Projects / modules | CRUD; archive guard; version conflict; reference-category mismatch; search/filter/sort/pagination; other-owner project → 404 |
| Relationships | Cross-project link rejected (service + composite FK); RESTRICT → 409; atomic link-set replacement (work items, release scope); follow-up actions inherit context and roll back together; release history retained when plan changes |
| Attachments | Each allowed type accepted (fixtures); oversize 413; HEIC 415; allowed extension with wrong signature 415; wrong extension with allowed signature 415; empty file; other-project parent 404; archived project 409; path-traversal filename sanitized; content headers; soft delete hides and blocks retrieval; DB failure after `put` deletes object and leaves activity unchanged; purge command deletes only aged soft-deleted objects; S3 driver tested against an in-process fake implementing the interface (no network) |
| Dashboard | Pure metric functions: null progress without plan data, inactive (Deferred/Cancelled) exclusion, overdue boundary at Asia/Manila midnight, UNKNOWN health, failed tests, milestone derivation vs fallback |
| Regression | Existing health, redaction, DB-config tests; `lint`, `typecheck`, `test`, `build` |

**Integration database (DS-11):** real local PostgreSQL test database (`TEST_DATABASE_URL`, `DATABASE_SSL=disable`), migrated per run, truncated per file. No SQLite, pg-mem, or Testcontainers.

### 16.2 Database

Migrations apply to an empty database; seed idempotent; constraints reject invalid rows; concurrent code allocation unique.

### 16.3 Web (Vitest + RTL)

`AttachmentPanel` input attributes (`accept`, `multiple`, `capture="environment"`); client rejection messages for HEIC and > 10 MB; independent per-file states; `StatusBadge`/`DerivedValue` never show missing data as healthy/complete; `RequireAuth` redirect; server field errors rendered; `DataList` cards at mobile width.

### 16.4 Physical acceptance (real devices, HTTPS deployment)

Devices: a **physical Android phone with Chrome** (mandatory), a **physical iPhone with Safari** (mandatory if Project Leadership has access; otherwise recorded as an accepted gap), one desktop browser. Emulators/responsive mode do not satisfy camera acceptance. The executable checklists (Clicks / Actions → Expected Result) are in `tasks.md` Gates G2 and G4; they cover camera capture, gallery multi-select, files, oversize and HEIC rejection, viewing/downloading, removal, persistence across logout/redeploy, follow-up actions, and responsive layout.

---

## 17. Decisions Register

| ID | Topic | Status |
|---|---|---|
| — | PostgreSQL/Neon, Render, Asia/Manila, BASC taxonomies, single user, attachment allowlist and 10 MB, no SQLite | **Confirmed** by Project Leadership (seq. 00009) |
| DS-01 | Auth: express-session + connect-pg-simple + PostgreSQL sessions + HttpOnly/Secure cookies + proposed throttling and CSRF + `crypto.scrypt` | **Approved** (seq. 00011) |
| DS-02 | Dependencies: `express-session`, `connect-pg-simple` (approved explicitly); `express-rate-limit`, `@aws-sdk/client-s3`, `multer` v2 (+ `@types/*`) | **Approved by implication** of the approved throttling, R2 storage, and attachment architecture; each is confirmed in the authorization of the package that installs it (all in PKG-1, see `tasks.md` §3.3) |
| DS-03 | Storage: S3-compatible with Cloudflare R2 for staging/production; local FS driver for dev/tests; storage abstraction preserved; Render disk only as an explicitly approved fallback | **Approved** (seq. 00011) |
| DS-04 | Dev/test-only web alias for runtime `@pmocore/shared` | Pending — confirm in PKG-1 authorization |
| DS-05 | `release_requirements`, `release_defects`, historical acceptance records, planning fields | **Approved** (seq. 00011) |
| DS-06 | Attendees as text | **Approved** (SA-3) |
| DS-07 | Archive-only projects; RESTRICT deletes; attachment soft delete + purge | Pending — confirm in PKG-1 authorization |
| DS-08 | Environment variables §15.4 | `APP_TIMEZONE=Asia/Manila` **approved**; remaining variables confirmed in PKG-1/PKG-2 authorization |
| DS-09 | BASC reference values | **Supplied and incorporated** (§6.2) |
| DS-10 | Scope adjustments SA-1…SA-6 | **Decided** (§14.3) |
| DS-11 | Integration tests on local PostgreSQL | Pending — confirm in PKG-1 authorization |
| DS-12 | Single Render service + Neon DB used as staging then production, with pre-go-live data reset | Pending — confirm before PKG-1 deployment step |
| DS-13 | Paid Render Starter instance for production | Pending — Project Leadership decision before go-live |

| Risk | Mitigation |
|---|---|
| 18-day window; review latency | Four packages, parallel Package 2/3 after schema checkpoint, ≤ 1-day gate reviews |
| Missing reference categories (requirement type, activity mode, probability, document type) and provisional health | Fields optional/hidden until values supplied; seed-only change |
| Neon/Render/R2 first-time setup | Deployed in Package 1; R2 provisioned before Package 2 |
| iOS HEIC / oversize photos | Explicit messages; physical iPhone test; SA-4 |
| No iPhone available for testing | Record as accepted gap; Android mandatory |
| In-memory rate limiter resets on deploy | Acceptable single-instance; PostgreSQL store later |
| Migration conflicts under parallel work | Full schema delivered in Package 1; later schema changes serialized through Project Leadership |
| EXIF location in photos | Documented; strip post-MVP |

---

## 18. Requirements Traceability

Packages: **P1** Foundation, Auth, Projects & Staging · **P2** Meetings & Visits, RAID & Attachments · **P3** Plan, Requirements & Remaining Modules · **P4** Dashboard, Acceptance & Release (see `tasks.md`).

| Requirement(s) | Design § | Package | Class |
|---|---|---|---|
| 001, 002, 003 | 4.2–4.5 | P1 | P0 |
| 004, 074 | 4.4, 5.1 | P1 (columns for all tables) | P0 |
| 005 | 4.3, 4.6 | P1 | P0 |
| 006, 007, 008, 009, 010, 011 | 11.1 | P4 | P0 |
| 012, 013 | 5.4, 5.5, 7.2 | P1 | P0 |
| 014 | 5.2, 5.3, 11.2 | P1 (schema) + P2/P3 | P0 |
| 015 | 4.6, 5.4 | P1 | P0 |
| 016 | 5.6 | P1 | P0 |
| 017, 018 | 11.1 | P1 (base overview) + P4 (full metrics) | P0 |
| 019, 020, 021, 022, 023 | 5.4, 11.1 | P3 | P0 |
| 024, 025, 026, 027, 028 | 5.4, 6.2, 11.2 | P3 | P0 |
| 029, 030, 031, 032, 033 | 9.1, 6.2 | P2 | P0 |
| 034, 068 | 9.2 | P2 | P0 |
| 035, 036, 037, 038, 039, 040, 041, 042 | 10 | P2 | P0 (not reclassifiable) |
| 043, 067 | 8.4, 10.2 | P2 (+ P4 verification) | P0 |
| 044, 045, 046, 047, 048 | 5.4, 9.2, 11.1 | P2 (047 release link completes in P3) | P0 |
| 049, 050, 051, 052, 053 | 5.4, 11.1, 11.2 | P3 (053 metric in P4) | P0-minimal (SA-2) |
| 054, 055, 056, 057, 058 | 5.4, 11.2 | P3 | P0-minimal |
| 059, 060 | 5.4 | P3 | P0-minimal |
| 061 | 10, 14.3 | P2 (reusable service) + P3 (document upload UI) | P0-minimal (SA-1: not deferred) |
| 062, 063, 064, 065 | 7.1, 8.2 | P1 (kit) + all | P0 |
| 066 | 8.4 | All; verified P4 | P0 |
| 069 | 5.4, 11.2 | P3 | P0 |
| 070, 071 | 11.2 | P3 | P0-minimal |
| 072, 073 | 11.2 | P3 | P0-minimal |
| 075, 076 | 4.6, 13 | P1 | P0 (readiness); membership post-MVP |
| 077 | 14.3 | — | Post-MVP (deferred by requirements) |

All 77 requirements are mapped. With SA-1 decided as "not deferred", no approved requirement is left partially satisfied by the October 13 scope; REQ-077 items remain post-MVP by requirement.
