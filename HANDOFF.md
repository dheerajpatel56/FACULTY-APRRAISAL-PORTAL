# Session Handoff — VNRVJIET Faculty Appraisal System

_Last updated: 2026-07-06. Paste this into a new session to resume context._

## Environment

- **Repo:** `C:/dev/p1` — use this absolute path. (The agent's session cwd may point at a stale OneDrive path; ignore it.)
- **Git:** repo on branch `main`, remote `origin` = `github.com/dheerajpatel56/FACULTY-APRRAISAL-PORTAL`. Working tree clean, everything pushed.
- **Backend:** `cd backend && npm run dev` → `http://localhost:5000` (runs `tsx watch`, hot-reloads on `src/` save; dependency changes need a manual restart). Health: `GET /health`, `GET /health/ready`.
- **Frontend:** `cd frontend && npm run dev` → `http://localhost:5173` (proxies `/api` → :5000). A preview launch config `appraisal-frontend` runs it on `:5180` (strictPort).
- **DB:** PostgreSQL, database `faculty_appraisal`, user `postgres`, password `Dheeraj@123`. `psql` at `/c/Program Files/PostgreSQL/18/bin/psql.exe`. Open academic year label = `2026-27`.
- **Email:** `EMAIL_DISABLED=true` in dev (SMTP creds invalid). All queued emails end up `FAILED`/`PENDING` — expected, not a bug.
- **Stack:** Backend = Node + TS, Express 4, Prisma 6, Postgres, JWT, Nodemailer, Puppeteer (PDF), SheetJS (Excel export), Vitest. Frontend = React 18 + TS, Vite, Tailwind v4, Axios, Zustand, react-hook-form + Zod, SheetJS (client-side xlsx).

## What shipped this session (all on `origin/main`)

Latest commit: `e2c36a9`. In order:

1. `25b9deb` — docs: Phase 10 E2E regression test recorded in `PROJECT_HISTORY.md`.
2. `e3a54d4` — Bulk faculty import switched to institutional roster format: `S.NO, EMP ID, Name of the Faculty, Designation, D.O.J, Mobile Number, E - Mail ID`. Headers fuzzy-matched (aliases + normalization). Every row imports as **FACULTY** into an admin-selected department (required, applied to all rows), password `Welcome@123`. `D.O.J` accepts `DD-MM-YYYY` or `YYYY-MM-DD`.
3. `8751b56` — Admin Users table: checkbox row selection + select-all + bulk delete.
4. `da792a3` — Bulk import accepts `.xlsx/.xls` (first sheet parsed client-side to CSV via SheetJS, lazy-loaded). Uses patched **SheetJS 0.20.3** from the SheetJS CDN (npm's `xlsx@0.18.5` has open CVEs).
5. `2fd1c9e` — Security: `npm audit` = **0 vulnerabilities** in both repos. multer 2.1.1→2.2.0, nodemailer 8→9.0.3, xlsx→0.20.3, esbuild + form-data via audit fix. No source changes needed.
6. `248949d` — Bulk import auto-detects the real header row: skips leading title banners (e.g. `CSE-TEACHING`) and mid-sheet section banners (e.g. `CSE-NON TEACHING`); error rows cite true spreadsheet line numbers. Verified on a real 76-row staff sheet → 73/73 faculty parsed, 0 false errors.
7. `f1803b8` — README rewritten to match reality (correct env var names, HoD role, Tailwind v4, Puppeteer PDF, xlsx import, bulk delete, doc index).
8. `722c662` + `e2c36a9` — **Blank-row score bug fixed** (see below).

## Bug fixed: empty appraisal scored non-zero

**Symptom:** faculty who entered nothing still had a self-score (~170). Cause: the appraisal edit form's "Add Row" buttons append placeholder rows with dropdown/enum defaults (and `count:1` for projects); autosave/Save Draft persisted them, and the scoring engine scored the blanks (e.g. a blank course with `periodPlanned=0` hit `0/0 = NaN` → fell to the `base=4` branch; blank journal `indexed=NONE` → 5; etc.).

**Fix (both layers, same predicate — a row counts only if a free-text identifier contains an alphanumeric char):**
- Backend `722c662` — `updateAppraisal` in `backend/src/controllers/appraisalController.ts` drops blank rows before persisting (defends direct API calls + FPGP reconciliation).
- Frontend `e2c36a9` — `saveData` in `frontend/src/pages/faculty/AppraisalEditPage.tsx` strips blank rows before sending (`stripBlankRows` / `ROW_CONTENT_FIELDS`); "Add Project" now defaults `count:0` so untouched project rows drop via the `count>0` filter.

Verified in-browser: adding a blank journal + Save Draft persists 0 rows, selfTotal stays 0. Backend: 85/85 tests pass; empty→0, real WOS journal→15.

## Open / known items

- **Non-admin seed logins return 401** (`HOD001/hod123`, `HOD002`, `FAC13`, `FAC11`, `CSE003`); only `ADMIN001/admin123` works. Cause not diagnosed (NOT the test suite — it only touches ADMIN001). **User does not want this fixed right now.** If a workflow needs a HoD/faculty login later: `cd backend && npm run seed`, or reset a single password.
- **Imported CSE faculty** exist in DB from a real staff-list import (codes like `98CSE011`, password `Welcome@123`). `98CSE011`'s polluted draft was cleaned. Other imported faculty who opened the form may have stale blank rows in drafts — these self-clean on the next save now. A one-time bulk-clean of all existing drafts was offered but not run.
- Reference/E2E driver scripts live in `backend/scripts/` (`live-workflow.mjs`, `smoke-all.mjs`). Note: `live-workflow.mjs` includes an `hod-sign` FPGP step that is now optional — current design auto-approves FPGP via target evaluation (`ACCEPTED` / `NEEDS_REVIEW`).

## Gotchas when driving the app in a browser

- Login form uses react-hook-form; setting inputs via simple fill can race it. Reliable pattern: native value setter + dispatch `input` event, then `form.requestSubmit()`.
- The preview screenshot tool timed out intermittently this session — prefer `read_page` / DOM inspection via JS for verification.

## Docs in the repo

`README.md` (updated), `PROJECT_HISTORY.md` (Phases 0–10), `FACULTY_APPRAISAL_SYSTEM_LLD.md`, `TUTORIAL.md`, `DEPLOYMENT.md`, `GO_LIVE_CHECKLIST.md`, `IT_HANDOFF.md`, `OBSERVABILITY.md`, `FILE_UPLOAD_PLAN.md`, `FPGP_AUTOACCEPT_PLAN.md`, `CAT_ALIGNMENT_PLAN.md`, `sample_appraisal.md`, `sample_fpgp.md`, `frontend/README.md`.
