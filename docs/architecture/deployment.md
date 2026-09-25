# Deployment — Vercel + Render Free + Neon (staging)

Staging topology approved by Project Leadership in PMOCORE-DEPLOY-VERCEL (sequence 00027). No Cloudflare account, no object storage and no paid plan:

| Piece | Host | What it does |
|---|---|---|
| Web app (`apps/web`, React/Vite) | **Vercel** (Hobby) | Serves the static app and **proxies `/api/*` to Render** (same-origin) |
| API (`apps/api`, Express 5) | **Render** Free web service, Singapore | API only (`SERVE_WEB_APP=false`) |
| Database + attachment files | **Neon** Free PostgreSQL, Singapore | Business data, sessions, and attachment content (`ATTACHMENT_STORAGE_DRIVER=postgres`) |

```
Browser ──https──> https://<project>.vercel.app ──(/api/* rewrite)──> https://<service>.onrender.com ──TLS──> Neon
            static app + /api on ONE origin                  Express API                              PostgreSQL
```

Why the proxy: Vercel (`*.vercel.app`) and Render (`*.onrender.com`) are different sites. A browser calling Render directly would need a cross-site (third-party) session cookie, which Safari and Chrome Incognito block. Through the proxy the browser only ever talks to the Vercel origin, so the session cookie stays first-party (HttpOnly, Secure, SameSite=Lax) and the CSRF checks (allowed Origin + `X-PMO-Request: 1`) are unchanged. No CORS is enabled in production. The previous single-service layout (Render serves the web app too) still works with `SERVE_WEB_APP=true`.

Never commit secrets. Enter them only in the Neon, Render and Vercel dashboards, or in a terminal window for the one-time local setup (§3).

## 0. Order of operations

1. Neon: create the database (§1).
2. Your computer: create the tables, reference data and your user (§3).
3. Render: create the API service (§2). Note its URL.
4. Vercel: create the web project with that Render URL (§4). Note its URL.
5. Render: set `APP_ORIGIN` to the Vercel URL and redeploy (§4, step 7).
6. Verify (§5), then run the acceptance checklist (`docs/acceptance/vercel-staging-acceptance.md`).

## 1. Neon (database)

1. Sign in at <https://console.neon.tech> → **New project**.
2. Project name `pmocore`; Postgres version: the default; region **AWS Asia Pacific (Singapore)**. Create.
3. Create a database named `pmocore` (**Databases** → **New database**), or rename the default one.
4. **Connect** → choose database `pmocore` → turn **Connection pooling off** (the host name must **not** contain `-pooler`) → copy the connection string.
5. **Remove everything from `?` onward** (`sslmode=require&channel_binding=require`). PMOCore rejects `sslmode` in the URL; SSL is set with `DATABASE_SSL=require`. The result looks like `postgresql://<role>:<password>@ep-xxxx.ap-southeast-1.aws.neon.tech/pmocore`.
6. Keep this "direct URL" private (password manager). It is needed in §2 and §3.

Why direct, not pooled: Neon's pooler runs PgBouncer in transaction mode, which Neon advises against for migrations; one small Render instance (pool of 10) does not need it.

## 2. Render (API)

1. Sign in at <https://dashboard.render.com> → **New** → **Web Service** → connect GitHub and choose `DxVi/pmocore`.
2. Settings:

| Setting | Value |
|---|---|
| Name | `pmocore-api` (the URL becomes `https://pmocore-api.onrender.com`, or with a suffix if taken — use what Render shows) |
| Region | Singapore |
| Branch | the branch Project Leadership authorizes for staging |
| Root Directory | *(leave empty — repository root)* |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build:api` |
| Start Command | `node apps/api/dist/index.js` |
| Instance Type | **Free** |
| Health Check Path (Advanced) | `/api/health` |

3. **Environment** → add:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `24` |
| `DATABASE_URL` | Neon direct URL from §1 (no `?…`) |
| `DATABASE_SSL` | `require` |
| `APP_ORIGIN` | the Vercel URL, e.g. `https://pmocore.vercel.app` — exact, no path, no trailing slash. Use your best guess now and correct it in §4 step 7 |
| `APP_TIMEZONE` | `Asia/Manila` |
| `SESSION_SECRET` | random, ≥ 32 characters: run `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` locally and paste the output |
| `LOG_LEVEL` | `info` |
| `SERVE_WEB_APP` | `false` |
| `ATTACHMENT_STORAGE_DRIVER` | `postgres` |
| `ATTACHMENT_DB_QUOTA_MB` | `300` (§6) |

`PORT` is set by Render. Free instances have no pre-deploy command and no Shell, so migrations and user creation run from your computer (§3). The build does **not** run migrations.

4. **Create Web Service** and wait for "Live". Open `https://<service>.onrender.com/api/health` → `"status":"healthy"`, `"database":"connected"`.

Free-plan behaviour: the service sleeps after 15 minutes without requests; the next request wakes it in about a minute (the first page load after a pause is slow). The filesystem is temporary, which is why attachments are stored in Neon.

## 3. One-time database setup from your computer

In a PowerShell window in the repository folder (with Node 24):

```powershell
npm ci
$env:DATABASE_URL = Read-Host 'Neon direct URL'   # paste; not saved in command history
$env:DATABASE_SSL = 'require'
npm run db:migrate          # creates all tables (safe to re-run)
npm run db:seed             # BASC reference values (safe to re-run)
npm run user:upsert         # asks for your email, name and password
Remove-Item Env:DATABASE_URL, Env:DATABASE_SSL   # or close the window
```

Values set this way apply to this window only and take precedence over `apps/api/.env`. Optional demonstration projects: `npm run demo:load -- <your-email>` in the same window (remove before go-live with `npm run demo:remove`).

Re-run `npm run db:migrate` the same way whenever a new release adds a migration, **before** deploying that release (migrations are additive).

## 4. Vercel (web app)

1. Sign in at <https://vercel.com> → **Add New…** → **Project** → import `DxVi/pmocore`.
2. **Project Name**: `pmocore` (the URL becomes `https://pmocore.vercel.app` if available).
3. **Framework Preset**: Other. **Root Directory**: `./` (repository root — do not choose `apps/web`; the npm workspace is installed from the root).
4. Leave Build and Output settings at their defaults: `vercel.mjs` sets install `npm ci`, build `npm run build:web`, output `apps/web/dist`, the `/api` proxy, client-side routing and security headers.
5. **Environment Variables**: `PMOCORE_API_ORIGIN` = the Render URL from §2, e.g. `https://pmocore-api.onrender.com` (https, no path, no trailing slash). The build stops with a clear error if it is missing or malformed — the site never proxies sign-ins to a guessed host.
6. **Deploy**. Then **Settings** → **General** → **Node.js Version** → `24.x`, and **Settings** → **Git** → **Production Branch** → the authorized staging branch.
7. Copy the production domain Vercel shows (**Domains**). If it differs from the `APP_ORIGIN` you entered in Render, update `APP_ORIGIN` in Render (**Environment** → Save, rebuild and deploy).

Only the production domain is allowed by `APP_ORIGIN`. Preview deployments (`…-git-….vercel.app`) will refuse sign-in with "Request was rejected by cross-site request protection" — expected; use the production domain.

## 5. Verification (Gate G1)

| # | Action | Expected result |
|---|---|---|
| 1 | Open `https://<vercel-domain>/api/health` | `status: healthy`, `database: connected` (through the proxy) |
| 2 | Open `https://<vercel-domain>/` and a deep link such as `/projects` | Login page over HTTPS (no 404) |
| 3 | Sign in; browser dev tools → Application → Cookies | `pmo_sid` on the **Vercel** domain: HttpOnly, Secure, SameSite=Lax |
| 4 | Create a project; reload | Persists |
| 5 | Meeting → attach a photo close to 10 MB, open it | Uploads and opens (confirms the proxy passes 10 MB bodies — see §6) |
| 6 | Render → **Manual Deploy** → reload while signed in | Still signed in; attachments still open (sessions and files are in Neon) |

## 6. Capacity and limits (free plans, checked 2026-09-25)

| Limit | Value (official documentation) | Effect on PMOCore |
|---|---|---|
| Neon Free storage | **0.5 GB per project** (hard: inserts/updates fail when exceeded — including sign-in sessions) | Attachments capped by `ATTACHMENT_DB_QUOTA_MB` (default 300 MiB) so the app keeps working; uploads beyond it get "Attachment storage is full" (HTTP 507) |
| Neon Free compute | 100 CU-hours/project/month; scales to zero after 5 min idle | Ample for one user |
| Neon Free egress | 5 GB/month public transfer; compute suspended until next month if exceeded | Every photo view/download is read from Neon (thumbnails load the full image, no browser caching) |
| Neon restore | point-in-time restore 6 hours; 1 manual snapshot | Take a snapshot before migrations |
| Render Free | sleeps after 15 min idle, ~1 min wake; 750 instance hours/month; temporary filesystem; no Shell, pre-deploy or one-off jobs | Local setup (§3); slow first request |
| Vercel proxy | proxied requests time out after 120 s | Covers a Render wake-up (~1 min) |
| Vercel Hobby | non-commercial personal use only; 100 GB Fast Data Transfer, 10 GB Fast Origin Transfer per month | Plan-eligibility decision for Project Leadership |

Measured locally: stored attachment content occupies about **1.05×** its file size (10.0 MiB file → 10.5 MiB table); an empty PMOCore database is about 10 MB.

With the default 300 MiB quota (≈ 315 MiB on disk) plus ≈ 10 MB of base data, about 175 MB stays free for records, sessions and table maintenance. Typical capacity:

| Mix | Average file | Files in 300 MiB |
|---|---|---|
| Phone photos only | 3 MB | ≈ 100 |
| Photos + PDFs + Office documents | 1.5 MB | ≈ 200 |
| Mostly documents | 0.5 MB | ≈ 600 |

Removed attachments keep counting until purged (`ATTACHMENT_PURGE_DAYS`, default 30). To free space sooner, run the purge from your computer with the Neon values (§3 style) plus `$env:ATTACHMENT_STORAGE_DRIVER = 'postgres'`: `npm run attachments:purge`. Check usage in Neon → **Monitoring**/**Storage**.

The **hard** limits are Neon's 0.5 GB and 5 GB transfer. The 300 MiB quota is a **recommended operating limit**; raise it only with Project Leadership approval and never above ≈ 400 MiB on the Free plan.

## 7. Maintenance commands (run locally with the Neon values, §3)

| Purpose | Command |
|---|---|
| Load demo projects `DEMO-HRIS`, `DEMO-PAYROLL`, `DEMO-QMS` | `npm run demo:load -- <owner-email>` |
| Remove all `DEMO-` projects (never touches others) | `npm run demo:remove` |
| Purge files of attachments removed > `ATTACHMENT_PURGE_DAYS` ago; report orphans | `npm run attachments:purge` (also set `ATTACHMENT_STORAGE_DRIVER=postgres`) |
| Create or reset the user | `npm run user:upsert` |

## 8. Rollback and recovery

- Web app: Vercel → **Deployments** → previous deployment → **Promote**/**Instant Rollback**.
- API: Render → **Events**/**Deploys** → roll back to the previous successful deploy.
- Database: migrations are forward-only; take a Neon snapshot/branch before migrating; use point-in-time restore (6 hours on Free) if needed.
- Attachments: removed attachments remain in the database until purged, so an accidental removal is recoverable within `ATTACHMENT_PURGE_DAYS` by clearing `deleted_at` on its row.
- Pre-go-live cleanup (Gate G4): `npm run demo:remove`; if staging data must go, reset the Neon database (drop/recreate or new branch), then §3 again.

## 9. Future production option: object storage (S3-compatible)

The S3 driver is kept unchanged for a later production move off the free tier. With a paid Render instance the API can also serve the web app itself again.

1. Create a private S3-compatible bucket (for example Cloudflare R2 `pmocore-attachments`, no public access) and an access key limited to that bucket (object read & write).
2. On Render set `ATTACHMENT_STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_REGION` (`auto` for R2), `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE=true`. Startup rejects missing S3 values.
3. No CORS rule is needed: downloads always stream through the authenticated API.
4. Files are read through the **currently configured** driver. Before switching drivers, existing files must be copied to the new store (a separate, approved task); otherwise they show "This file is no longer available". The purge command only touches files recorded with the configured driver.

Single-service layout (Render serves web + API, paid plan): build `npm ci --include=dev && npm run build`, `SERVE_WEB_APP=true` (default), `APP_ORIGIN` = the Render URL, optional pre-deploy `npm run db:migrate -w database && npm run db:seed -w database`.
