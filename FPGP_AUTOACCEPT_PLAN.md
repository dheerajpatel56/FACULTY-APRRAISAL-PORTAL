# FPGP Auto-Accept + Target Reconciliation — Implementation Plan

## Goal
At year-end, automatically evaluate whether a faculty member met the targets
they set in their FPGP (Faculty Professional Growth Plan) by comparing against
their actual Appraisal submission data, and auto-accept the FPGP based on the
result — removing the manual HoD sign step (or making it optional).

## Core concept
- **FPGP** = the *plan* (targets/goals for the year), keyed by `userId + academicYearId`.
- **Appraisal** = the *actuals* (what was achieved), same `userId + academicYearId`.
- Both already exist per faculty per year → directly joinable.

## The hard part (read before deciding)
FPGP goals today are **free text** (`FPGPSubsection.rows[].goal/sem1/sem2` are
strings). You cannot reliably auto-compare "publish 3 Scopus papers" if "3" is
buried in prose. Auto target-checking is only feasible where:
1. the subsection is **quantifiable**, AND
2. it has a **numeric target**, AND
3. it maps to a **counted appraisal metric**.

Qualitative subsections (mentoring, lab development, "areas of interest") cannot
be auto-checked and must be handled separately (see Decision 3).

## Quantifiable FPGP → Appraisal mapping (the checkable targets)
| FPGP sub | Target (planned count) | Appraisal source | Achieved metric |
|---|---|---|---|
| 2.1 Journals (SCI/Scopus/WoS) | per-index counts | Cat2 journals | count by `indexed` |
| 2.2 Conferences (Nat/Intl) | counts | Cat2 conferences | count (indexed/scope) |
| 2.3 Books / Chapters | counts | Cat2 books + bookChapters | count |
| 2.4 Patents/Copyrights/IPR | counts | Cat2 patents | count by status |
| 2.5 R&D funded projects | counts | Cat2 projects | count by status |
| 2.6 Consultancy | counts | Cat2 consultancy | count |
| 2.8 Ph.D. guidance | count | Cat2 guidance | count |
| 3.2 Memberships | count (min 2) | Cat5 memberships | count |
| 3.4 FDP/workshops/etc | count | Cat3 training + organised + conf-attended | count |
| 3.3 Outreach | count | Cat4 student activities (approx) | count |

Subsections with **no clean appraisal counterpart** (auto-check N/A):
1.1 academic plan, 1.2 projects guided (Cat1.3 exists but UG/PG split differs),
1.3 mentoring, 2.7 PhD-pursuing status, 2.9 RIGs, 2.10 industry assoc,
3.1 lab dev, 3.5 differentiators, 3.6 innovation, 4.1 travel, 4.2 other.

## Decisions needed
1. **Target representation.** To compare numerically, FPGP quantifiable rows need
   a numeric target. Options:
   a) Add a `targetCount Int?` field per row (cleanest; faculty enters a number).
   b) Parse integers out of the existing free-text `goal` (fragile, no schema change).
2. **Which appraisal submission counts as "actuals"?** A year can have up to 4
   submissions (`maxSubmissions`). Options: the APPROVED one / the latest / sum.
3. **Qualitative subsections.** Auto-check only the quantifiable ones and treat
   qualitative as "manual"? Or require HoD to still confirm qualitative items?
4. **Auto-accept criteria.** When does the plan auto-accept?
   a) All quantifiable targets met → REVIEWED automatically.
   b) ≥ X% of targets met → auto-accept; else flag for HoD.
   c) Always auto-accept, but attach an achievement report (met/not-met per target).
5. **Keep manual HoD sign as fallback/override?** (Recommended yes.)
6. **Trigger.** When does evaluation run?
   a) On appraisal APPROVED (event-driven).
   b) On a year-end cron.
   c) On-demand button ("Evaluate & Accept").

## Decisions (LOCKED)
1. **Targets:** add numeric `targetCount` per quantifiable FPGP row (schema + UI).
2. **Accept rule:** always produce a per-target achievement report; auto-accept
   (`ACCEPTED`) only when ALL quantifiable targets met, else `NEEDS_REVIEW`.
3. **Actuals source:** the APPROVED appraisal submission for that user+year;
   fall back to the latest submission if none is APPROVED.
4. **Trigger:** quarterly cron batch evaluation (1st of Jan/Apr/Jul/Oct) + admin manual-run.
5. **Qualitative subsections:** not auto-evaluated; marked N/A in the report.
6. **HoD sign:** retained as manual override (ACCEPTED/NEEDS_REVIEW → REVIEWED).

---

## Implementation stages (each ends with verified build + tests)

### STAGE 1 — Data model
- `FPGPStatus`: add `ACCEPTED` and `NEEDS_REVIEW` (keep DRAFT/ACTIVE/REVIEWED).
- `FPGPSubsection.rows[]`: add `targetCount` to quantifiable row shapes
  (template `defaultRowsFor`), OR new `FPGPTarget` table
  (`fpgpId, subsection, metricKey, targetCount`).
- New `FPGPAchievement` (or JSON on plan): per-target `{ key, target, achieved, met }`
  snapshot + `evaluatedAt`, `autoAccepted Boolean`.

### STAGE 2 — Reconciliation service (`fpgpReconciler.ts`)
- Input: `fpgpId` (+ resolve user/year).
- Pull FPGP targets + the chosen appraisal submission(s) with `FULL_INCLUDE`.
- For each mapped subsection: compute achieved count from appraisal, compare to
  target, produce `{ key, target, achieved, met }`.
- Return `{ items, allMet, autoAcceptEligible }`. Pure + unit-testable.

### STAGE 3 — Year-end cron + flow
- Add a cron job (alongside existing `cron/reminders.ts`) that, for the closing
  academic year, finds ACTIVE FPGP plans, runs the reconciler for each, persists
  the achievement snapshot, sets status `ACCEPTED` (all met) or `NEEDS_REVIEW`,
  writes an audit log, and emails the faculty (`fpgp_evaluated`).
- Admin-only manual trigger to run the same batch on demand (for testing / re-run).
- Keep `hodSign` as manual override (ACCEPTED/NEEDS_REVIEW → REVIEWED).

### STAGE 4 — Frontend
- FPGP form: numeric target input on quantifiable rows.
- Plan detail / dept view: "Evaluate & Accept" button + achievement report
  (per-target met/not-met, overall status badge).

### STAGE 5 — Tests + end-to-end
- Unit tests for reconciler (targets met / partially met / no appraisal). [done in Stage 2]
- End-to-end: use the sample appraisal + a user-provided sample FPGP to assert the
  achievement report and auto-accept decision. (Awaiting sample FPGP.)

## Out of scope / confirm later
- Email template `fpgp_evaluated`.
- Whether NEEDS_REVIEW blocks anything else.
- Backfill for existing ACTIVE/REVIEWED plans.
