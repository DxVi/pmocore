# Solo MVP Acceptance Checklist (Gates G2 and G4)

Run against the **HTTPS staging deployment**. For the free-plan staging topology (Vercel + Render Free + Neon, PMOCORE-DEPLOY-VERCEL) run `vercel-staging-acceptance.md` first; this checklist then covers the full Solo MVP scope. Record for each step: pass/fail, device, browser, and notes. Emulators and desktop "responsive mode" do not count for phone steps.

Preparation:

- Operational user created (`user:upsert`); tester knows the credentials.
- Optional demonstration data: `npm run demo:load -- <owner-email>` (projects `DEMO-HRIS`, `DEMO-PAYROLL`, `DEMO-QMS`, all marked `[DEMO]`).
- Test files on the phone: a normal photo, an image larger than 10 MB, a PDF, a DOCX, and (iPhone) a HEIC photo or `.heic` file.

## A. Desktop (Chrome or Edge)

| # | Action | Expected result |
|---|---|---|
| A1 | Open the staging URL | Login page over HTTPS |
| A2 | Sign in with a wrong password | "Invalid email or password." — no detail about which field |
| A3 | Sign in correctly | Dashboard; dev tools show cookie `pmo_sid` as HttpOnly, Secure, SameSite=Lax |
| A4 | Dashboard | Totals strip and one card per active project: phase, status, health, progress (or "No plan data"), open requirements, open/overdue actions, issues, tests (failed and awaiting retest shown separately), next milestone, target date, last activity, PM remarks |
| A5 | Projects → New project (code, name, phase, status, health, target date) → Create | Project overview opens with "Status at a glance"; empty project shows "No plan data", "Not assessed", "No requirements yet", "No milestone" — nothing shows as complete or healthy |
| A6 | Plan → New work item (milestone, planned end in the future, 50 %) | Listed; overview shows 50 % progress and the milestone as next milestone |
| A7 | Requirements → New → open it → Edit linked work items → add the work item → Save links | Requirement shows the work item; the work item shows the requirement |
| A8 | Testing → New test case for the requirement, result Failed → open it → Log defect | `TC-001` Failed; `DEF-001` linked; requirement trace shows test and defect |
| A9 | Change the test result to For Retest; on the defect set retest date and result Passed | Dashboard counts 1 awaiting retest (not failed); requirement trace shows retest result |
| A10 | Releases → New `v1.0` → Edit included requirements (add the requirement, note "initial") and defects → Record acceptance (Accepted) | Release shows scope with notes and acceptance history; requirement "Released in" shows `v1.0` with Accepted |
| A11 | New release `v1.1` → include the same requirement (note "revision 2") | Requirement shows both releases (history kept) |
| A12 | Documents → New (title, https link, related record = requirement) → Save and add files → Files → attach a PDF and an XLSX → remove one | Document detail shows link, related requirement link, and the remaining file; PDF opens inline, XLSX downloads |
| A13 | Each module list: search, filter by status, change sort | Results update; clear filters restores list; empty filters show an explanatory message |
| A14 | Archive the project | Removed from dashboard; data viewable via Projects → Archived; create/edit controls hidden; unarchive restores |
| A15 | Copy an attachment "Open" URL → Sign out → paste the URL | Login required; file not served |
| A16 | Trigger a redeploy, reload while signed in | Still signed in; attachments still open (stored in the configured attachment storage) |

## B. Physical Android phone (Chrome) — mandatory

| # | Action | Expected result |
|---|---|---|
| B1 | Open URL, sign in | Dashboard fits the screen; no horizontal scrolling; menu opens from the toggle |
| B2 | Project → Meetings & Visits → New → type Site Visit, title, findings → **Save and add attachments** | `MV-00n` opens scrolled to Attachments |
| B3 | Quick add follow-up: title, owner, due date yesterday → **+** | `ACT-00n` listed, Not Started, **Overdue** badge |
| B4 | Attachments → **Take photo** | Rear camera opens directly (no app install); after capture: Uploading → Saved; thumbnail with name, size, uploader, time, "Camera" |
| B5 | **Photos** → select 3 images | Three rows upload independently; all Saved |
| B6 | **Files** → a PDF and a DOCX | PDF opens in a new tab; DOCX downloads |
| B7 | Select an image larger than 10 MB | Size message before upload; nothing added; meeting unchanged |
| B8 | Tap a photo thumbnail | Full image opens, correctly oriented |
| B9 | Remove one photo → confirm → reload | Photo gone after reload |
| B10 | Actions & RAID (default: open items) | `ACT-00n` shows Overdue; detail links back to the meeting |
| B11 | Rotate to landscape on the meeting form and attachment list | Usable; no clipped controls |
| B12 | Dashboard | Overdue action count includes the new action |

## C. iPhone (Safari) — if available

| # | Action | Expected result |
|---|---|---|
| C1 | Repeat B1–B6 | Same results |
| C2 | **Take photo** | Camera opens directly; uploaded photo is JPEG (row shows JPG) |
| C3 | **Photos** → select a normal library photo | Uploads as JPEG (iOS converts); no HEIC rejection |
| C4 | **Files** → pick a `.heic` file | Message: "HEIC photos aren't supported yet…"; nothing added |
| C5 | Tap a photo thumbnail | Opens, correctly oriented |

If the camera input does not open the camera on a device, record browser and version: the documented fallback is `accept="image/*"` on the camera input only (design §10.2).

## D. Go-live preparation (after acceptance)

| # | Action | Expected result |
|---|---|---|
| D1 | `npm run demo:remove` (against production database settings) | "Demo projects removed: DEMO-HRIS, DEMO-PAYROLL, DEMO-QMS"; real projects untouched |
| D2 | Pre-go-live reset per `docs/architecture/deployment.md` §6 (if staging data must be cleared) | Clean system with reference data; user can sign in |
| D3 | Repeat A1–A3 and B2–B4 on production | Pass |
