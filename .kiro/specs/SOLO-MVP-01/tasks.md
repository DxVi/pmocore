# PMOCore Solo MVP v1.0 — Accelerated Implementation Plan

**Task:** PMOCORE-ACCEL-001 (seq. 00009), decisions recorded by PMOCORE-ACCEL-002 (seq. 00011) · **Status:** Approved by Project Leadership
**Inputs:** `requirements.md` (77 requirements), `design.md` (revised ACCEL-001), `.kiro/policy.md`
**Target:** operational release **Tuesday, October 13, 2026** (fixed)

This plan organizes the Solo MVP into four outcome-based implementation packages with acceptance gates. It authorizes nothing by itself: each package starts only when Project Leadership assigns it to one implementation agent in a formal sequence (policy §4–§5).

---

## 0. Execution Rules

1. One agent owns a package at a time. Parallel execution of Package 2 and Package 3 is permitted **only** if Project Leadership explicitly authorizes it (see §3.3 conflict rules).
2. Each package: preflight → implement authorized scope → automated verification → deployment/physical checks where listed → completion report → STOP.
3. Handoffs between agents occur only at accepted Git checkpoints with clean working trees. Agents never hand work directly to each other.
4. `.kiro/**` is read-only during implementation. If implementation reveals a design gap, the agent stops the affected portion and reports (policy §4).
5. Commits, pushes, merges, and deployments happen only when authorized. Intermediate checkpoints inside a package may be requested by the agent and authorized by Project Leadership to reduce risk.
6. New dependencies are limited to those in design §17 DS-02. All of them are installed in PKG-1 (confirmed in the PKG-1 authorization) so that no dependency, lockfile, or configuration change is needed during parallel work.
7. External accounts and production credentials (Neon, Render, Cloudflare) are created and entered by Project Leadership. Agents provide exact configuration and verify behavior through the deployed HTTPS URL.
8. No SQLite, no alternative databases, no allowlist changes, no scope additions.

---

## 1. Schedule and Gates

Calendar (2026): Sep 25 Fri · Sep 28 Mon … Oct 2 Fri · Oct 3–4 weekend · Oct 5 Mon … Oct 9 Fri · Oct 10–11 weekend · Oct 12 Mon · **Oct 13 Tue go-live**.

| Gate | Target date | Meaning | Decided by |
|---|---|---|---|
| **G0 — Ready to build** | Sep 26–28 | Design + plan approved and checkpointed; decisions recorded; BASC initial values supplied (seq. 00011); Neon + Render accounts ready | Project Leadership |
| **G1 — Staging live** | Oct 2 | Package 1 accepted: login → project CRUD works on the HTTPS Render deployment against Neon | Project Leadership |
| **G2 — First operational milestone** | Oct 7 | Package 2 accepted: Login → Create Project → Create Meeting/Visit → Follow-up Action → Attach Photo (camera) → Retrieve, verified on a physical phone over HTTPS | Project Leadership |
| **G3 — Functionally complete** | Oct 9 | Package 3 accepted: plan, requirements, testing, releases, documents usable; scope-adjustment decisions for any incomplete P0-minimal item | Project Leadership |
| **G4 — Release ready** | Oct 12 | Package 4 accepted: dashboard, BASC data, end-to-end and physical acceptance passed, data reset, production configuration verified | Project Leadership |
| **G5 — Go-live** | Oct 13 | Operational use begins; release checkpoint authorized | Project Leadership |

Schedule assumptions (risks if false): gate reviews within one day; Package 2 and Package 3 run in parallel from Oct 3 (preparation approved in seq. 00011; actual parallel execution requires separate explicit authorization for each agent); some weekend work on Oct 3–4 and Oct 10–11. If parallel execution is **not** authorized, Package 3 runs Oct 8–10 and Package 4 is compressed to Oct 11–12, reducing hardening time; with Documents upload now in scope (SA-1 not deferred), this sequential path carries material schedule risk that Project Leadership should weigh at G1.

---

## 2. Package Overview and Critical Path

| Package | Outcome | Suggested owner | Window |
|---|---|---|---|
| **PKG-1** Foundation, Authentication, Projects & Staging | Deployed, authenticated app with projects on Neon/Render; full schema in place | Claude | Sep 28 – Oct 2 |
| **PKG-2** Meetings & Visits, Actions/RAID & Attachments | First operational milestone including camera, on staging | Claude | Oct 3 – Oct 7 |
| **PKG-3** Plan, Requirements & Remaining Modules | Work items, requirements, testing/defects, releases/acceptance, documents | Codex | Oct 3 – Oct 9 (parallel) |
| **PKG-4** Dashboard, Acceptance & Release | Dashboard/overview metrics, BASC data, E2E, physical acceptance, go-live | Claude | Oct 8 – Oct 12 |

**Why the package boundaries differ from the starting structure:** the required first milestone (… → Follow-up Action → Attach Photo) needs Meetings & Visits, RAID, **and** attachments together, so attachments move into Package 2 and Work Items/Requirements move to Package 3. The complete database schema moves into Package 1 so Packages 2 and 3 can proceed in parallel without migration conflicts. Deployment happens in Package 1 and physical camera testing in Package 2, not at the end.

```text
G0 ─► PKG-1 ─► G1 ─┬─► PKG-2 (M&V, RAID, attachments, camera on staging) ─► G2 ─┐
                   │                                                             ├─► PKG-4 ─► G4 ─► G5 (Oct 13)
                   └─► PKG-3 (plan, requirements, testing, releases, documents) ─► G3 ─┘
Critical path: G0 → PKG-1 (schema, auth, deploy) → PKG-2 (attachments + physical camera) → PKG-4 → G4
```

---

## 3. Agent Assignment Strategy

### 3.1 Recommendation

| Package | Owner | Rationale |
|---|---|---|
| PKG-1 | **Claude** | Authentication/session/CSRF integration, deployment integration (static serving, proxy/cookies, Neon), and the full relational schema with composite same-project keys are security- and architecture-heavy. One owner avoids a handoff inside the critical path |
| PKG-2 | **Claude** (continues) | Complex activity↔RAID relationships, attachment architecture, S3 driver, mobile capture, physical verification. Continuing avoids a switch on the critical path |
| PKG-3 | **Codex** | Mostly repetitive CRUD modules on the established patterns from PKG-1, relationship pickers, and many automated tests — matches Codex strengths; runs in parallel with PKG-2 |
| PKG-4 | **Claude** | Cross-module dashboard derivations, end-to-end integration of PKG-2 and PKG-3, release hardening. Codex may be assigned bounded regression-test or bug-fix sub-scopes by Project Leadership |

These are strengths, not exclusive roles. Agents switch only at gates.

### 3.2 Handoffs

- PKG-1 → PKG-3 (Claude → Codex): at the G1 checkpoint. Codex preflight reads PKG-1's patterns (one reference module: `projects`) and the report.
- PKG-3 → PKG-4 (Codex → Claude): at the G3 checkpoint.
- Integration of the PKG-2 and PKG-3 branches into `develop` is a Project Leadership–authorized Git operation at the start of PKG-4 (or by Project Leadership directly).

### 3.3 Parallel-work boundaries and integration procedure (PKG-2 ‖ PKG-3)

Preparation for parallel work is approved (seq. 00011). **Actual parallel execution requires separate explicit authorization for each agent.**

**Shared contracts delivered and frozen by PKG-1 (before any parallel work):**
- Complete database schema and migrations for all modules (design §5.4).
- `packages/shared`: Zod create/update/list-query schemas and DTO types for **every** module, reference category constants, attachment policy constants and `AttachmentParentType` (`'activity' | 'document'`), barrel exports.
- All approved dependencies installed (`package.json` / `package-lock.json` final for the MVP).
- All environment keys in `apps/api/src/config/env.ts` and `.env.example`, including storage/S3 keys.
- API router registration for every module (placeholder routers) and web route registration for every module (placeholder pages).
- `AttachmentPanel` **contract**: final props signature (`projectId`, `parentType`, `parentId`, `editable`) and a placeholder implementation, plus the attachment DTO/API contract in `packages/shared`.
- Build/lint/test configuration (`tsconfig*`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.mjs`).

**Frozen during parallel work** (no edits by either package): `database/**` (schema, migrations, seeds), `packages/shared/**`, root and workspace `package.json` files and the lockfile, `apps/api/src/config/**`, `apps/api/src/app.ts`, `apps/api/src/routes/index.ts`, the web router file, all build/lint/test configuration, `.env.example`, `README.md`. If a package needs a change here, the agent stops that portion and reports; Project Leadership approves the change and designates which package applies it, and the other branch receives it only through the integration procedure.

**Branch and file ownership:**

| | PKG-2 (`feature/solo-pkg2`) | PKG-3 (`feature/solo-pkg3`) |
|---|---|---|
| API | `apps/api/src/modules/{activities,raid,attachments}/`, `apps/api/src/scripts/attachments-purge.ts` | `apps/api/src/modules/{work-items,requirements,testing,releases,documents}/` |
| Web | `apps/web/src/features/{meetings,raid}/`, `apps/web/src/components/attachments/` (implements the `AttachmentPanel` body behind the frozen props contract) | `apps/web/src/features/{plan,requirements,testing,releases,documents}/` (**uses** `AttachmentPanel` on document detail with `parentType='document'`; does not edit it) |
| Tests | Tests inside owned directories | Tests inside owned directories |
| Staging deploys | Yes (G2) | No; verified locally, reaches staging after integration |

Shared kit files (`apps/web/src/components/` except `attachments/`, `apps/web/src/lib/`, `apps/api/src/middleware/`, `apps/api/src/lib/`) are also frozen; defects found there are reported, not fixed in parallel.

**Checkpoints:** each agent checkpoints its own branch independently after its gate is accepted (authorized commit, clean tree). No agent merges, rebases, or pushes the other agent's branch.

**Integration procedure (requires Project Leadership authorization):**
1. Both branches accepted and checkpointed.
2. Merge `feature/solo-pkg2` into `develop`, then `feature/solo-pkg3` into `develop` (merge commits, no rebase). Given the ownership rules no conflicts are expected; any conflict is reported before resolution.
3. Run lint, typecheck, the full test suite (incl. integration database), and build.
4. Deploy the integrated `develop` to staging; run the Documents upload check (PKG-4 G4 step 12) and G2 regression steps 3–8.
5. Record the integration commit hash in the PKG-4 report.

---

## 4. G0 Prerequisites (Project Leadership actions)

| # | Item | Needed by |
|---|---|---|
| 1 | Design decisions and scope adjustments: done (seq. 00011). Still pending: DS-04, DS-07, DS-08 (other than timezone), DS-11, DS-12 to be confirmed in the PKG-1 authorization; DS-13 before go-live (design §17) | PKG-1 start |
| 2 | Documentation checkpoint of `design.md` + `tasks.md`: done (seq. 00011) | PKG-1 start |
| 3 | BASC initial values: done (design §6.2). Optional: supply values for the missing categories (requirement type, activity mode, probability, document type) and confirm or replace provisional `HEALTH` | Any time before G4 |
| 4 | Authorize actual parallel execution of PKG-2 and PKG-3 (separately for each agent) | G1 |
| 5 | Neon: project in Singapore (`aws-ap-southeast-1`), database `pmocore`, pooled connection string (SSL params removed) entered in Render | PKG-1 deployment (≈ Oct 1) |
| 6 | Render: account, Web Service (Singapore) linked to the GitHub repository; plan decision (DS-13); environment variables per design §15.4; `SESSION_SECRET` generated | PKG-1 deployment |
| 7 | Cloudflare R2: private bucket `pmocore-attachments`, bucket-scoped Object Read & Write token, endpoint; entered in Render | PKG-2 deployment (≈ Oct 5) |
| 8 | Physical devices: Android phone with Chrome (mandatory); iPhone with Safari (if available) | G2 |
| 9 | Initial user email/name for the user script; password set by Project Leadership | PKG-1 deployment |

---

## 5. PKG-1 — Foundation, Authentication, Projects & Staging

**Objective.** A deployed, HTTPS, authenticated PMOCore where the user can log in, create/update/archive projects, and see a basic project overview, running on Render with Neon — with the complete Solo MVP schema, reference data, shared UI kit, and module scaffolding that all later packages build on.

**Included requirements.** REQ-001–005, 012–016, 017/018 (base overview: phase, status, health, dates, recent activity from projects), 062–065 (component kit, applied to projects), 066 (shell/projects responsive), 074 (audit columns everywhere), 075, 076; schema foundations for REQ-014 and all module tables.

**Authorized implementation scope.**
1. **Schema & data:** Drizzle schema for **all** tables in design §5.4 (incl. `session`, composite same-project FKs, checks, indexes); generated migration(s); `db:migrate` and `db:seed` scripts; idempotent reference seed with the approved BASC initial values, `TEST_STAGE` (SIT, UAT), and provisional `HEALTH` exactly as documented in design §6.2 (no other values invented); `record_counters` allocation helper.
2. **Auth & security:** `express-session` + `connect-pg-simple` (shared pool), `express-rate-limit` on login, scrypt password module, `requireAuth`, CSRF guard, `trust proxy` in production, auth routes, `user:upsert` script; env additions (`APP_ORIGIN`, `APP_TIMEZONE`, `SESSION_*`); `.env.example`; README env table.
3. **API infrastructure:** `loadProject` + `ProjectAccessService`; DB error mapping; pagination/list-query helpers; `today()` in Asia/Manila; reference-data endpoint; generic `/lookup` endpoint for all record types; placeholder routers for all modules.
4. **Projects:** CRUD, archive/unarchive, archived write guard, overview endpoint (manual fields + recent activity + counts that are already derivable).
5. **Shared contracts for parallel work:** everything listed in §3.3 "Shared contracts delivered and frozen by PKG-1" (all module Zod schemas/DTOs, attachment contract and `AttachmentPanel` props placeholder, all module router/route registrations, all env keys, all approved dependencies).
6. **Web:** router, AppShell (responsive nav, theme selector relocated, logout), `AuthProvider`/`RequireAuth`/login page, api-client additions (`credentials`, `X-PMO-Request`, `upload()` stub, 401 handling), component kit (design §8.2 except `AttachmentPanel`), projects list/form/detail, ProjectLayout with module navigation placeholders, DS-04 dev/test-only alias.
7. **Deployment:** production static serving + SPA fallback (D-005); Helmet CSP check; Render build/start/health configuration; migrations + seed on Neon; user created; HTTPS verification.

**Dependencies.** G0 items 1–3, 5, 6, 9. New dependencies (all installed in PKG-1 per §0 rule 6): `express-session`, `connect-pg-simple`, `express-rate-limit`, `multer`, `@aws-sdk/client-s3` (+ types).

**Deliverables.** Schema, migrations, seed; auth; projects module (reference pattern for all later modules); UI kit and shell; deployed staging URL; PKG-1 report listing any provisional reference categories and the Neon/Render configuration used (no secrets).

**Automated verification.**
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass; existing AUTH-01 tests still pass.
- Integration tests on local PostgreSQL: migrations apply to an empty DB; seed idempotent; composite FKs reject cross-project links; code allocation unique under concurrency.
- Auth tests (design §16.1 Auth, CSRF, Logging rows), route-table sweep.
- Projects API tests (CRUD, archive guard, version conflict, other-owner → 404, list filters/pagination).
- Web tests: `RequireAuth`, login error, `QueryState`, `StatusBadge` "Not set".

**Physical acceptance (G1).**

| # | Clicks / Actions | Expected Result |
|---|---|---|
| 1 | Desktop: open the Render HTTPS URL | Login page loads over HTTPS without certificate warnings |
| 2 | Enter wrong password → Sign in | Generic "invalid email or password" message; no detail about which field |
| 3 | Enter correct credentials → Sign in | Dashboard placeholder / project list loads; browser dev tools show `pmo_sid` cookie as HttpOnly, Secure, SameSite=Lax |
| 4 | Projects → New → fill code, name, phase, status, health, target date → Save | Project appears in list with its code; detail shows entered values |
| 5 | Edit project remarks → Save; reload page | Change persists |
| 6 | Archive project | Project shows "Archived" badge, disappears from default list, edit controls unavailable |
| 7 | Phone (Android Chrome): open URL → log in → open the project | Layout fits the screen, no horizontal scroll, navigation usable via menu |
| 8 | Logout → press browser Back | Redirected to login; no project data visible |
| 9 | Trigger a new Render deploy (authorized), then reload while logged in | Session survives the redeploy (sessions are in PostgreSQL) |

**Completion criteria.** All automated checks pass; G1 checklist passes; report delivered; no out-of-scope module functionality implemented beyond placeholders.

**Checkpoint.** Project Leadership–authorized commit(s) on `develop`; deployed commit hash recorded; clean working tree. Recommended intermediate checkpoint after schema + auth (before deployment work) if authorized.

**Rollback / recovery.** Migrations are forward-only; before first Neon migration, Project Leadership may create a Neon branch as a restore point. Render keeps prior deploys for rollback. If Neon or Render setup blocks, local PostgreSQL verification continues and deployment is reported as a G1 blocker (not silently deferred).

---

## 6. PKG-2 — Meetings & Visits, Actions/RAID & Attachments

**Objective.** The first operational milestone on staging: **Login → Create Project → Create Meeting/Visit → Create Follow-up Action → Attach Photo (camera) → Retrieve saved records**, plus full Meetings & Visits and Actions/RAID modules and the reusable attachment service, verified on a physical phone.

**Included requirements.** REQ-029–048 (047: requirement link now; release link via lookup, fully exercised after PKG-3), 061 (reusable attachment service), 062–067 for these modules, 068.

**Authorized implementation scope.**
1. **Meetings & Visits:** API (CRUD, list filters, detail with follow-ups and attachment count), follow-up actions endpoint (transactional context inheritance), mobile-first list and form (design §9).
2. **Actions & RAID:** unified API and UI for six types; derived overdue/days open; closed-date rules; filters by type/status/owner/due/overdue/source activity; links to requirement and release via `RecordPicker`.
3. **Attachments:** `file-policy` (allowlist, signatures, name sanitizer), parent resolvers for **both** `activity` and `document` parents (the `documents` table exists from PKG-1), `multer` upload route, storage interface, `LocalFsStorage`, `S3Storage` (`@aws-sdk/client-s3`), list/content/delete endpoints, soft delete, `attachments:purge` command, env validation for storage settings.
4. **AttachmentPanel:** Take photo / Photos / Files inputs per design §10.2; client pre-checks with HEIC and > 10 MB messages; per-file states and retry; thumbnails; open/download; remove with confirm. Wired into the activity detail.
5. **Staging:** deploy with `ATTACHMENT_STORAGE_DRIVER=s3` to R2; verify.

**Dependencies.** G1 accepted; G0 items 7–8 (R2, devices). No new dependencies (installed in PKG-1). If R2 is unavailable by Oct 5, the fallback (Render disk + `LocalFsStorage`, paid instance) requires an explicit Project Leadership decision.

**Deliverables.** Two modules, attachment service and panel, S3 + local drivers, purge command, staging deployment, physical acceptance record, report.

**Automated verification.**
- lint / typecheck / test / build pass; PKG-1 tests still pass.
- API: activities and RAID CRUD/filters/version/archive guard; follow-up transaction and rollback; overdue boundary at Asia/Manila midnight; RESTRICT on activity with actions.
- Attachments: every row of design §16.1 "Attachments", including HEIC 415, extension/signature mismatch 415, oversize 413, DB-failure cleanup leaving the activity unchanged, soft delete blocking retrieval, purge selectivity, S3 driver against an in-process fake (no network).
- Web: `AttachmentPanel` attributes (`capture="environment"`, `accept`, `multiple`), rejection messages, independent per-file states.

**Physical acceptance (G2) — HTTPS staging, physical Android/Chrome (mandatory) and iPhone/Safari (if available).**

| # | Clicks / Actions | Expected Result |
|---|---|---|
| 1 | Phone: open staging URL → log in | Dashboard/project list loads; no horizontal scroll |
| 2 | Projects → New → create project | Project created with its code |
| 3 | Project → Meetings → New → type Site Visit, date today, title, attendees, findings → Save | Activity saved with `MV-001`; detail opens with Attachments section in view |
| 4 | Quick add action → description, owner, due date yesterday → Add | `ACT-001` listed under the activity with owner, due date, status Not Started, **Overdue** flag |
| 5 | Attachments → **Take photo** | Rear camera opens directly (no app install). Capture → confirm → row shows uploading then saved; thumbnail visible with name, size, uploader, time |
| 6 | **Photos** → select 3 images | Three rows upload independently; all saved |
| 7 | **Files** → select one PDF and one DOCX | Both saved; tapping PDF opens it in a new tab; tapping DOCX downloads it |
| 8 | **Files** → select a HEIC photo (iPhone) or any `.heic`/`.zip` file | Rejected with the HEIC/unsupported-format message; no row added; other attachments unchanged |
| 9 | Select an image larger than 10 MB (prepared test file) | Rejected before upload with the size message; meeting and other attachments unchanged |
| 10 | Tap a photo thumbnail | Full photo opens, correctly oriented |
| 11 | Remove one photo → confirm | Row disappears; reload confirms removal |
| 12 | Edit the activity findings → Save | Saved; attachments and action still present |
| 13 | Log out → log in on desktop → open the activity | Activity, action, and all remaining attachments present; photo downloads and opens |
| 14 | RAID list → filter type Action, Overdue | `ACT-001` listed with source `MV-001`; tapping it shows the back-link |
| 15 | Authorized redeploy → reopen the activity on the phone | Attachments still present and viewable (persistence independent of the app instance) |
| 16 | Desktop: copy an attachment content URL → log out → open the URL | 401 / login redirect; file not served |
| 17 | Phone: rotate to landscape on the activity form and attachment list | Usable; no clipped controls |

iPhone steps 5–10 are mandatory if an iPhone is available; otherwise the gap is recorded in the G2 decision.

**Completion criteria.** Automated checks pass; G2 checklist passes on Android (and iPhone if available); first milestone demonstrated end-to-end on staging; report delivered.

**Checkpoint.** Authorized commit on `feature/solo-pkg2` (or `develop` if not parallel); deployed commit hash recorded; clean tree.

**Rollback / recovery.** No schema changes. Render rollback to the G1 deploy restores prior behavior; R2 objects are keyed by UUID and harmless if orphaned (purge/reconcile reports them). If the S3 driver fails on staging, switch `ATTACHMENT_STORAGE_DRIVER` only with Project Leadership approval of the disk fallback.

---

## 7. PKG-3 — Plan, Requirements & Remaining Modules

**Objective.** Work items, requirements, and the minimal Testing & Defects, Releases & Acceptance, and Documents modules usable with all required relationships, following the PKG-1 module pattern.

**Included requirements.** REQ-019–028, 049–060, 061 (document upload UI), 062–066 for these modules, 069–073; REQ-047 release link data.

**Authorized implementation scope.**
1. **Work Items:** API + UI; milestone flag; percent complete; requirement links (shared `requirement_work_items` endpoint); derived progress helper for overview.
2. **Requirements:** API + UI; lifecycle statuses; work-item link set; target release; trace detail (work items, tests with results, defects, target release, released-in releases, acceptance status).
3. **Testing & Defects (P0-minimal):** tests with latest result; defects linked to tests with retest date/result; target fix release; lists with stage/result/status filters.
4. **Releases & Acceptance (P0-minimal):** release CRUD with all REQ-055 fields; scope editing via `release_requirements` / `release_defects` with notes; acceptance records (1:N) with certificate reference.
5. **Documents (P0-minimal, with basic upload; SA-1 not deferred):** register with metadata, link URL, one related record, and `AttachmentPanel` mounted on the document detail with `parentType='document'` using the frozen PKG-1 props contract. In parallel mode the panel is PKG-1's placeholder on this branch, and working uploads are verified after integration (§3.3 step 4, PKG-4 G4 step 12). In sequential mode (after PKG-2) uploads are verified within PKG-3.

**Dependencies.** G1 accepted (schema, shared contracts, kit, lookup, patterns). Independent of PKG-2 except the `AttachmentPanel` implementation (contract-only dependency). No new dependencies. No schema changes.

**Deliverables.** Five modules (API, shared schemas, UI), tests, report listing any P0-minimal item not completed.

**Automated verification.** lint / typecheck / test / build pass; per-module CRUD/filters/version/archive-guard tests; relationship tests (cross-project rejection, RESTRICT, link-set replacement atomicity, release history retained when target release changes, multiple acceptances per release); requirement trace-detail test; web form validation tests for one representative module.

**Physical acceptance (local, desktop + phone browser on LAN or after integration on staging).**

| # | Clicks / Actions | Expected Result |
|---|---|---|
| 1 | Plan → New work item (milestone, planned dates, 50 %) → Save | `WI-001` listed; milestone marked |
| 2 | Requirements → New → link `WI-001`, target release (after step 5) → Save | `REQ-001` shows linked work item; work item shows the requirement |
| 3 | Testing → New test for `REQ-001`, stage UAT, result Failed → Save → New defect from the test | `TC-001` Failed; `DEF-001` linked to `TC-001` |
| 4 | Defect: set retest date and result Passed | Retest recorded; requirement detail shows test → defect → retest chain |
| 5 | Releases → New `v1.0` → add `REQ-001` and `DEF-001` to scope → add acceptance with status In Progress | Release lists included items; acceptance history shows In Progress |
| 6 | New release `v1.1` → add `REQ-001` again with note "revision 2" | Requirement detail lists both releases (history kept) |
| 7 | Documents → New (type Minutes, link URL, related `MV-001` if integrated) | Listed; link opens in a new tab |
| 8 | Phone width: open each module list | Cards layout; filters usable; no horizontal scroll |

**Completion criteria.** Automated checks pass; checklist passes; report states which requirements are fully satisfied and flags any gap.

**Checkpoint.** Authorized commit on `feature/solo-pkg3` (or `develop`); clean tree.

**Rollback / recovery.** No schema changes; modules are isolated by directory; an incomplete module can be hidden from navigation only with Project Leadership approval at G3 (never silently).

---

## 8. PKG-4 — Dashboard, Acceptance & Release

**Objective.** Integrate all modules, deliver the dashboard and full project overview, load representative BASC data, pass end-to-end and physical acceptance on the HTTPS deployment, and make the service production-ready for October 13.

**Included requirements.** REQ-006–011, 017/018 (full), 023 (display), 053 (metric), 043/066/067 (final verification), plus regression across all 77.

**Authorized implementation scope.**
1. Integration of PKG-2 and PKG-3 branches (Git operation authorized by Project Leadership) and staging deploy.
2. Documents upload verification on the integrated build (SA-1 not deferred), fixing integration defects only.
3. Dashboard API and UI (design §11.1) and full overview metrics; pure metric functions.
4. Representative BASC data: a seeding/import script or guided manual entry for one or more real BASC projects as directed by Project Leadership (no production personal data in tests).
5. Reference data completion: load any values Project Leadership supplies for the missing categories and confirm or replace provisional `HEALTH` (seed change only).
6. Regression, end-to-end, and physical acceptance; critical and high-severity bug fixes only.
7. Production readiness: final env review, pre-go-live data reset procedure (truncate business data, re-seed, re-create user, clear R2 `staging/` prefix), backup/restore notes (Neon PITR, R2), operational runbook in README.

**Dependencies.** G2 and G3 accepted (or Project Leadership decision on incomplete items).

**Automated verification.** lint / typecheck / test / build; full suite; dashboard metric unit tests (null progress, cancelled exclusion, overdue boundary, UNKNOWN health, failed tests, milestone fallback); dashboard endpoint scoped to active owned projects; migrations/seed re-run idempotency against a fresh database.

**Physical acceptance (G4) — HTTPS deployment, desktop + physical phone.**

| # | Clicks / Actions | Expected Result |
|---|---|---|
| 1 | Log in on desktop | Dashboard shows each active BASC project: phase, status, health, progress (or "No plan data"), open requirements, open/overdue actions, open issues, failed tests, next milestone, target date, last activity, remarks |
| 2 | Create a project with no records | Its card shows "No plan data", "Not assessed" health, and "No …" states — nothing shown as complete or healthy |
| 3 | Close an overdue action | Dashboard overdue count decreases; last activity updates |
| 4 | Mark a test Failed | Failed-test count increases on dashboard and overview |
| 5 | Phone: repeat G2 steps 3–11 on a BASC project | All pass |
| 6 | Walk the full trace: requirement → work item → test → defect → release → acceptance | Every link navigable both ways where designed |
| 7 | Search and filter on each module list (text, status, date) and sort by date/priority | Results correct; empty state shown for no matches |
| 8 | Archive a project | Removed from dashboard; data still viewable under archived filter |
| 9 | Tablet width (~768 px) walk-through of all modules | Usable, no horizontal scroll |
| 10 | Execute the pre-go-live data reset procedure on staging, re-create the user, log in | Clean system with reference data; login works |
| 11 | Authorized production deploy, then repeat G1 steps 1–3 and G2 steps 3–5 | Pass on the production configuration |
| 12 | Desktop and phone: Documents → New document → Attachments → **Files** → attach a PDF and an XLSX; then remove one | Both upload and appear with metadata; PDF opens inline, XLSX downloads; the removed file disappears; the document record is unchanged |

**Completion criteria.** All automated checks pass; G4 checklist passes; no open critical/high defects; requirements coverage re-verified; Project Leadership go-live decision recorded.

**Checkpoint.** Authorized release checkpoint on `develop` (and `main` if Project Leadership directs); tag per Project Leadership; deployed hash recorded.

**Rollback / recovery.** Render rollback to the last accepted deploy; Neon PITR or pre-reset branch for data; R2 objects retained by soft-delete retention; go-live fallback is the existing spreadsheet tracker until the issue is resolved.

---

## 9. Requirements-to-Package Map

Full mapping with design sections and classification is in `design.md` §18. Summary:

| Package | Requirements |
|---|---|
| PKG-1 | 001–005, 012–016, 017–018 (base), 062–065 (kit), 066 (shell), 074, 075, 076; schema for 014 and all modules |
| PKG-2 | 029–048, 061 (service), 067, 068 |
| PKG-3 | 019–028, 049–060, 061 (document upload UI), 069–073 |
| PKG-4 | 006–011, 017–018 (full), 023/053 (display), 043/066/067 final verification, regression of all |
| Deferred | 077 (post-MVP by requirement) |

Classification: P0 — all except those listed as P0-minimal; **P0-minimal** — 049–060, 070–073 (Testing & Defects, Releases & Acceptance, Documents) and 061 for documents; **P1** — no approved requirement (SA-1 decided: Documents upload is not deferred); **post-MVP** — REQ-077 items. Meetings & Visits attachment, gallery, and camera requirements (REQ-035–043) are P0 and not reclassifiable.
