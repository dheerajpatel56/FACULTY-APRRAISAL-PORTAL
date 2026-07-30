# Plan — V2 Form Changes (FAPSA AY 2025-2026 realignment)

Branch: `feature/v2-form-changes`. Repo: `C:/dev/p1`.

Source of truth = "FACULTY ANNUAL PERFORMANCE SELF APPRAISAL (AY 2025-2026)" form.
Grand total unchanged at 550 (self 500 + Cat6 HoD 50). Sub-caps, scoring rules, and
some structure drifted from the current code. Frontend display labels were already
pre-updated to the new caps; the backend scoring logic was NOT — this plan fixes logic,
schema, adds a shared live-scoring module, and surfaces per-subsection scores inline.

## Confirmed decisions (from product owner)
- **Book chapters (2.1-C, conference-derived, indexed) are DIFFERENT from academic book
  chapters (2.3).** Keep them as two separate buckets. 2.1-C is a NEW model.
- **Cat3 "Conferences Attended": keep the DB table/model, drop it from scoring only.**
- **Deferred / keep as-is for now:** (1) the 1.2 attendance/feedback/results per-student
  formula, (2) merging institute-linkage + industry-linkage into one 2.9 bucket,
  (3) non-indexed publication scoring (stays 5). Do NOT change these.
- **Inline scoring architecture:** a shared PURE scoring module the frontend imports so
  per-subsection scores update live as the user types. Backend keeps its own copy as the
  authority on save/submit. A parity guard (shared fixture + expected breakdown) prevents drift.

## New requirement
Per-subsection score must be visible **beside each subsection** (live, all wizard steps),
**and** the final total before submission must remain (step 6 summary, as it is now).

---

## Task 1 — Backend scoring cap & rule fixes (existing schema only)

Files: `backend/src/services/scoringEngine.ts`, `backend/src/services/scoringEngine.test.ts`.
No schema change. Follow TDD: update/extend tests to the new expected numbers, then make
them pass. Run `npm test` in `backend/` (was 85/85 green) — all must pass.

### `ScoreBreakdown` interface — cat3 reshape
Replace the cat3 fields `conferencesAttended` and `resourceEditorial` with `resourcePerson`
and `editorial`. New cat3 shape:
`{ advQual, organisedPrograms, resourcePerson, editorial, training, intlTravel, total }`.
`conferencesAttended` is removed from the breakdown entirely (dropped from scoring).

### scoreCategory1
- 1.1 Lectures: cap **40** (was 50). Everything else in 1.1 unchanged.
- 1.2, 1.3, 1.4, 1.5: unchanged.

### scoreCategory2
- 2.1 Publications: cap **60** (was 50).
  - Journals: indexed (ESCI/WOS/SCOPUS/ICI) → 15, else 5. (unchanged)
  - Conferences: indexed → **10** (was 15), else 5.
- 2.2 Citations: cap **5** (was 10). Thresholds on `totalCitations`:
  `>100 → 5, 51–100 → 3, 11–50 → 2, 3–10 → 1, else 0`.
- 2.3 Books & academic book chapters: cap 10, apply scope×role matrix to BOTH
  `cat2Books` and `cat2BookChapters` (each row has `scope` and `isEdited`):
  - INTERNATIONAL: author (`!isEdited`) → 10, editor (`isEdited`) → 5.
  - NATIONAL: author → 5, editor → 3.
- 2.4 Patents: cap **20** (was 10). `GRANTED → 10`, `PUBLISHED → 5` (was 10),
  `FILED → 5` (retain; not in form, treated as pre-grant — flag as an assumption in report).
- 2.5 Sponsored projects: cap **20** (was 25). Ongoing/Applied logic unchanged.
- 2.6 Consultancy: unchanged.
- 2.7 Guidance: cap **5** (was 10). Guide → **5** (was 10), Co-Guide → **3** (was 5).
- 2.8 Research groups: unchanged.
- 2.9 Linkages + 2.10 IndustryLinkages: **unchanged** (merge deferred).
- Startups bucket: keep max 5, keep in total; just remove the stale
  "not in form / extra bucket" comment (it is now official 2.10).
- cat2 total cap stays 150.

### scoreCategory3
- 3.1 advQual — remap existing booleans (NO new fields this task; new quals are Task 2):
  `awarded → 10`, `thesisSubmitted → 10` (was 8), `clearedPrePhD → 8`,
  `registeredForPhD → 5`. Take the highest applicable.
- 3.3 Resource Person: `min(cat3ResourcePerson.length * 10, 20)` — standalone.
- 3.4 Editorial: `min(cat3Editorial.length * 10, 20)` — standalone.
- Drop `conferencesAttended` from scoring and from the total.
- total = advQual + organisedPrograms + resourcePerson + editorial + training + intlTravel,
  capped 100.

### scoreCategory4 — unchanged.

### scoreCategory5
- 5.2 Awards: cap 10, score by `level`: `state → 5`, otherwise (`international`/`national`) → 10.
  (Award `level` is a free string; values seen: `international` | `national` | `state`.)
- 5.1, 5.3, 5.4 unchanged.

Acceptance: backend build clean (`npx tsc --noEmit` or existing build script), `npm test`
all green, tests explicitly assert every new cap/rule above.

---

## Task 2 — Schema additions + new-field scoring

Files: `backend/src/prisma/schema.prisma`, `backend/src/services/scoringEngine.ts`,
`backend/src/services/scoringEngine.test.ts`, plus wherever the create/update controller
maps submission relations (`backend/src/controllers/appraisalController.ts`).

### Schema
- `Cat3AdvQual`: add `postDoc Boolean @default(false)`, `pgDegree Boolean @default(false)`,
  `pgDiploma Boolean @default(false)`.
- New model `Cat2ConfBookChapter` (2.1-C, conference-derived indexed book chapters —
  SEPARATE from academic `Cat2BookChapter`):
  fields: `id`, `submissionId`, `title`, `authors`, `authorPosition`, `conferenceName`,
  `indexed PublicationIndex @default(NONE)`, `proofFile String?`, `onDelete: Cascade`
  relation to `AppraisalSubmission`, and the back-relation on `AppraisalSubmission`.
- `Cat3ConferenceAttended`: KEEP as-is (no change).

### Apply DB (Windows gotchas — from memory)
- **Stop the backend dev server first** (tsx watch locks the Prisma query-engine DLL →
  EPERM on client regen).
- Dot-source env: `set -a; . backend/.env; set +a` (or export `DATABASE_URL`) before Prisma CLI.
- `cd backend && npx prisma db push --accept-data-loss` then `npx prisma generate`.
  (Schema has drifted from migration history — use `db push`, NOT `migrate dev`.)

### Scoring wiring
- 2.1: also loop `cat2ConfBookChapters` → indexed → 10, else 5; add into the 2.1
  publications sum (still capped 60).
- 3.1: extend advQual to take the highest of: `postDoc → 10`, `awarded → 10`,
  `thesisSubmitted → 10`, `pgDegree → 10`, `pgDiploma → 10`, `clearedPrePhD → 8`,
  `registeredForPhD → 5`; cap 10.
- Update `FullSubmission` type + controller include to load `cat2ConfBookChapters`.

Acceptance: build clean, client regenerated, `npm test` green with new fixtures covering
conf-book-chapters and the new qual paths.

---

## Task 3 — Shared pure scoring module for the frontend

Files: `frontend/src/utils/scoring.ts` (new), `frontend/src/utils/scoring.test.ts` (new),
shared fixture + expected-breakdown files used by BOTH sides.

- Port every category function from the final `scoringEngine.ts` into a pure module typed
  against plain frontend types (string-union enums matching the form values, e.g.
  `'ESCI'|'WOS'|'SCOPUS'|'ICI'|'NONE'`), input = the form values object, output = the same
  `ScoreBreakdown` shape. No `@prisma/client` import.
- Parity guard: commit a representative fixture (`docs/superpowers/plans/scoring-fixture.json`)
  and its expected breakdown. `frontend/.../scoring.test.ts` asserts the frontend module
  produces the expected breakdown; `backend/.../scoringEngine.test.ts` asserts the backend
  engine produces the SAME expected breakdown on the same fixture. Either side drifting fails.
- If the frontend has no test runner, add Vitest (Vite project — minimal config).

Acceptance: frontend build clean, both parity tests green.

---

## Task 4 — Inline per-subsection scores + cat3 relabel + new-field UI

File: `frontend/src/pages/faculty/AppraisalEditPage.tsx` (+ `frontend/src/types` as needed).
Large file (~1250 lines). Follow existing patterns; if it grows a lot, report
DONE_WITH_CONCERNS rather than restructuring beyond scope.

- Compute a live `ScoreBreakdown` from `watch()`ed form values via the Task 3 shared module
  (memoized; light debounce acceptable). 
- Render a score badge beside EVERY subsection header on steps 1–5, showing that
  subsection's live value against its max, e.g. `1.1 Lectures — {cat1.lectures}/40`.
  Cover all subsections in cat1–cat5.
  **HARD REQUIREMENT (owner-reinforced):** the mark must be visible right there beside
  the form fields and must UPDATE AS THE USER ENTERS DATA — no Save, no "Recompute"
  button, no step-6 round-trip needed. Recompute on every relevant field change
  (react-hook-form `watch`), light debounce OK. This live-beside-the-field behavior is
  the whole point of the task; a badge that only appears after save/submit does NOT satisfy it.
- Keep the step-6 summary block (final total before submit) working AS NOW
  (backend `loadScore` authority). Do not remove it.
- Relabel cat3: 3.3 → "Resource Person", 3.4 → "Editorial" (currently 3.3 "Conferences
  Attended" / 3.4 "Resource Person + Editorial"); update the summary labels too. Reconcile
  the cat3 form sections with the new 3.3/3.4 identity (keep a Conferences-Attended input
  section if present, since the table is retained, but it no longer contributes to score —
  label it clearly as non-scoring, or confirm with controller).
- Add UI for the new 3.1 quals: checkboxes for Post Doc, PG Degree, PG Diploma (alongside
  the existing Registered / Pre-PhD / Thesis Submitted / Awarded).
- Add a new form section (field array) for 2.1-C conference book chapters
  (title, authors, authorPosition, conferenceName, indexed select, proof upload).

Acceptance: frontend build clean; browser check that inline badges appear and update.

---

## Task 5 — Regression (controller-run verification, not a subagent)

- `cd backend && npm test` → all green (baseline was 85/85).
- Browser: start backend (:5000) + frontend (:5180 preview or :5173 dev). Log in
  (`98CSE011` / `Welcome@123`, or seed). Open the appraisal edit form:
  - confirm per-subsection badges render and change as fields are filled;
  - confirm caps clamp (no badge exceeds its max);
  - confirm step-6 summary total still computes and matches;
  - confirm grand-total ceiling stays 550.
- Final code review over the whole branch, then `finishing-a-development-branch`.
