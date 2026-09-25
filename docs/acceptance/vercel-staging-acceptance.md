# Staging Acceptance — Vercel + Render Free + Neon (PMOCORE-DEPLOY-VERCEL)

Run against the Vercel **production domain** (`https://<project>.vercel.app`) after `docs/architecture/deployment.md` §0–§5. Record for each step: pass/fail, date/time, device, browser and version, and notes. Nothing counts as passed until a person has performed the step and seen the expected result. Emulators and desktop "responsive mode" do not count for phone steps.

Preparation:

- User created with `npm run user:upsert` (§3); the tester knows the credentials.
- Test files: on the computer a PDF, a DOCX, an XLSX, and an image of **9–10 MB**; on the phone a normal photo, an image **larger than 10 MB**, and a PDF.
- If the site has not been used for 15 minutes, expect the first request to take up to about a minute (Render Free wakes up).

## A. Desktop (Chrome or Edge)

| # | Action | Expected result |
|---|---|---|
| A1 | Open `https://<vercel-domain>/api/health` | JSON with `"status":"healthy"` and `"database":"connected"` |
| A2 | Open `https://<vercel-domain>/projects` directly (deep link) | Login page over HTTPS — not a Vercel 404 |
| A3 | Sign in with a wrong password | "Invalid email or password" |
| A4 | Sign in correctly; dev tools → Application → Cookies | Dashboard. Cookie `pmo_sid` listed under the **vercel.app** domain: HttpOnly ✓, Secure ✓, SameSite Lax |
| A5 | Dev tools → Network → any `/api/...` request | Request URL is on the vercel.app domain (never onrender.com); response header `Cache-Control: no-store` |
| A6 | Projects → New project (code, name, target date) → Create; reload | Project persists |
| A7 | Project → Meetings & Visits → New → title, date, findings → **Save and add attachments** | `MV-00n` opens at Attachments |
| A8 | **Files** → select the PDF, DOCX and XLSX together | Three rows upload independently; all Saved with name, size, uploader, time |
| A9 | **Files** → the 9–10 MB image | Saved (confirms 10 MB passes the Vercel proxy). If it fails, record the exact message and HTTP status from dev tools |
| A10 | Open the PDF; download the DOCX; open the image | PDF opens in the browser; DOCX downloads and opens in Word; image displays |
| A11 | Remove the XLSX → confirm → reload | Gone after reload; others remain |
| A12 | Copy an attachment's "Open" link → Sign out → paste the link | Login required / not served |
| A13 | Render → **Manual Deploy** → wait for Live → reload the meeting while signed in | Still signed in; all attachments still open (sessions and files are in Neon) |
| A14 | Vercel → Deployments → **Redeploy** the production deployment → reload | Still signed in; attachments still open |
| A15 | Open a Vercel **preview** URL (if one exists) and try to sign in | Rejected ("cross-site request protection") — only the production domain may sign in |

## B. Physical Android phone (Chrome) — mandatory

| # | Action | Expected result |
|---|---|---|
| B1 | Open the Vercel domain, sign in | Dashboard fits the screen; no horizontal scrolling; menu opens from the toggle |
| B2 | Projects → New project → Create | Project opens |
| B3 | Project → Meetings & Visits → New → type Site Visit, title, findings → **Save and add attachments** | `MV-00n` opens at Attachments |
| B4 | **Take photo** | Rear camera opens directly (no app install); after capture: Uploading → Saved; row shows "Camera" |
| B5 | **Take photo** again (second capture) | Second photo Saved; both listed |
| B6 | **Photos** → select 3 images | Three rows upload independently; all Saved |
| B7 | **Files** → a PDF | Saved; tapping it opens the PDF |
| B8 | Select an image larger than 10 MB | Size message before upload; nothing added |
| B9 | Tap a photo thumbnail | Full image opens, correctly oriented |
| B10 | Download a photo (download action) | File saved to the phone's Downloads |
| B11 | Remove one photo → confirm → reload | Gone after reload |
| B12 | Close Chrome completely, reopen the site | Still signed in; meeting and remaining attachments present |
| B13 | After A13/A14 (redeploys), reopen the meeting on the phone | Still signed in; attachments still open |

## C. Capacity check (after A and B)

| # | Action | Expected result |
|---|---|---|
| C1 | Neon console → project → **Monitoring**/**Storage** | Storage well below 0.5 GB; note the value |
| C2 | Neon → **Usage**: data transfer this month | Note the value (limit 5 GB/month) |

Record results in the sequence report to Project Leadership. Any failure: note the step, the exact message, the time, and (desktop) the failing request's status in dev tools → Network.
