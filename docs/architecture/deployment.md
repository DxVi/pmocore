# Deployment — Render + Neon (+ Cloudflare R2)

Approved V1 topology (D-005, DS-12): **one Render Web Service** serves `/api/*` and the built React app, backed by **Neon PostgreSQL**. Attachments (Package 2) use **Cloudflare R2** through the S3 API (DS-03). The same service is used as staging until Gate G4, then reset and used as production.

Account creation, paid plans and all credentials are handled by Project Leadership. Never commit secrets; enter them only in the Render dashboard.

## 1. Neon PostgreSQL

1. Create a Neon project in region **AWS Asia Pacific (Singapore) `aws-ap-southeast-1`** and a database named `pmocore`.
2. Copy the **direct** connection string (hostname **without** `-pooler`). Neon's pooled endpoint runs PgBouncer in transaction mode, which Neon advises against for schema migrations; the Render pre-deploy migration uses the same `DATABASE_URL`, and a single Solo MVP instance (pool of 10) does not need the pooler.
3. **Remove every query parameter** from the URL: `sslmode=require` (PMOCore rejects `sslmode`, `sslcert`, `sslkey`, `sslrootcert` — AUTH-01 D-009; SSL is controlled by `DATABASE_SSL=require`) and `channel_binding=require` (a libpq option; the Node `pg` driver is not libpq-based). The result looks like `postgresql://<role>:<password>@ep-xxxx.ap-southeast-1.aws.neon.tech/pmocore`.
4. Note the point-in-time restore window of the Neon plan (backup/recovery).

## 2. Render Web Service

| Setting | Value |
|---|---|
| Runtime | Node |
| Region | Singapore |
| Branch | `develop` during staging (deploy only authorized checkpoints) |
| Root directory | repository root |
| Build command | `npm ci --include=dev && npm run build` |
| Pre-deploy command (paid plans) | `npm run db:migrate -w database && npm run db:seed -w database` |
| Start command | `node apps/api/dist/index.js` |
| Health check path | `/api/health` |
| Plan | Paid Starter recommended for production (free instances sleep and have no pre-deploy command or shell) — requires Project Leadership approval of the subscription (DS-13) |

Node 24 is selected from `package.json` `engines`; set `NODE_VERSION=24` if Render does not pick it up.

### Environment variables

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon **direct** URL with no query parameters (§1) |
| `DATABASE_SSL` | `require` |
| `APP_ORIGIN` | the service's HTTPS URL, e.g. `https://pmocore.onrender.com` (no trailing slash) |
| `APP_TIMEZONE` | `Asia/Manila` |
| `SESSION_SECRET` | random, ≥ 32 characters (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) |
| `LOG_LEVEL` | `info` |
| `ATTACHMENT_STORAGE_DRIVER` | `s3` (Cloudflare R2). `local` only if Project Leadership approves the Render-disk fallback (paid instance + disk mounted at `ATTACHMENT_STORAGE_DIR`) |
| `S3_ENDPOINT`, `S3_REGION=auto`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE=true` | from Cloudflare R2 (§5) — required before any upload |

`PORT` is provided by Render. Production enables `trust proxy`, so the session cookie is issued with `Secure` behind Render's TLS termination; over plain HTTP no session cookie is issued.

## 3. First deployment

1. Create the service with the settings above and deploy an authorized checkpoint.
2. Migrations and reference data: run by the pre-deploy command, or — without a paid plan — from a developer machine with `DATABASE_URL`/`DATABASE_SSL` set to the Neon values for that shell only:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
3. Create the operational user (credentials entered at execution time, never stored):
   - Render Shell (paid plans): `npm run user:upsert:prod -w apps/api`
   - or locally against Neon: `npm run user:upsert` with the Neon `DATABASE_URL` for that shell.

## 4. Verification (Gate G1)

| # | Action | Expected result |
|---|---|---|
| 1 | Open `https://<service>/api/health` | `status: healthy`, `database: connected` |
| 2 | Open `https://<service>/` | Login page over HTTPS |
| 3 | Sign in | Browser dev tools show `pmo_sid` as HttpOnly, Secure, SameSite=Lax |
| 4 | Create, edit and archive a project | Changes persist after reload |
| 5 | Trigger a new deploy, reload while signed in | Still signed in (sessions stored in PostgreSQL) |
| 6 | Repeat 2–4 on a physical phone | Usable without horizontal scrolling |

## 5. Cloudflare R2 (before Package 2 staging, ≈ Oct 5)

1. Create a private bucket `pmocore-attachments` (location hint: Asia-Pacific). No public access, no custom domain.
2. Create an API token with **Object Read & Write** scoped to that bucket only.
3. Enter the endpoint (`https://<account-id>.r2.cloudflarestorage.com`), bucket, key id and secret in Render, and set `ATTACHMENT_STORAGE_DRIVER=s3`.
4. No CORS rule is needed: browsers never access the bucket directly — every download is streamed through the authenticated API.
5. Startup validates that all S3 variables are present when `ATTACHMENT_STORAGE_DRIVER=s3`; the first real upload is the connectivity test (acceptance checklist, section A, step A12 and section B, step B4).

## 6. Demonstration data and maintenance commands

| Purpose | Development | Production (Render Shell, after build) |
|---|---|---|
| Load synthetic BASC demo projects (`DEMO-HRIS`, `DEMO-PAYROLL`, `DEMO-QMS`) | `npm run demo:load -- <owner-email>` | `node apps/api/dist/scripts/demo-data.js load <owner-email>` |
| Remove all `DEMO-` projects (never touches other projects) | `npm run demo:remove` | `node apps/api/dist/scripts/demo-data.js remove` |
| Purge files of attachments removed > `ATTACHMENT_PURGE_DAYS` ago; report orphans | `npm run attachments:purge` | `node apps/api/dist/scripts/attachments-purge.js` |

Without a Render Shell, run the development commands from a workstation with `DATABASE_URL`, `DATABASE_SSL`, and (for attachments) the S3 variables set to production values for that shell only.

## 7. Rollback and recovery

- Application: redeploy the previous successful Render deploy.
- Database: migrations are forward-only; before the first migration of a release, create a Neon branch as a restore point; use Neon point-in-time restore if needed.
- Attachments: removed attachments stay in R2 for `ATTACHMENT_PURGE_DAYS` (30) and are only deleted by the manual `attachments:purge` command, so accidental removals are recoverable within that window (restore by clearing `deleted_at` on the row). R2 objects are not versioned; take a periodic bucket copy if longer retention is required.
- Pre-go-live cleanup (Gate G4): remove demonstration data with `demo:remove`. If other staging test projects must go, archive them, or — before any real data exists — reset the database (drop and recreate the Neon branch/database, `db:migrate`, `db:seed`, `user:upsert`) and empty the R2 bucket (no key prefix is used; the bucket holds only this application's attachments).
- Acceptance checklist: `docs/acceptance/solo-mvp-acceptance.md`.
