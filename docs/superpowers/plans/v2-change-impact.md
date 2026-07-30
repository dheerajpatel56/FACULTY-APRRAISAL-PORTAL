# V2 Form Changes — Task → Resulting Change

Branch `feature/v2-form-changes`. Companion to `v2-form-changes.md` (full spec).
Grand total stays 550 (self 500 + Cat6 HoD 50). This table = what each task actually
changes on disk, in the DB, and for the user.

| Task | Status | Files touched | Resulting changes | DB? | User-visible? |
|------|--------|---------------|-------------------|-----|---------------|
| **1. Backend scoring caps & rules** | ✅ done (`8e4f08e`) | `backend/src/services/scoringEngine.ts`, `scoringEngine.test.ts` | 1.1 cap 50→40; 2.1 cap 50→60 (conf-indexed 15→10); 2.2 cap 10→5 (tiers 3-10→1/11-50→2/51-100→3/>100→5); 2.3 scope×role matrix (Intl A10/E5, Natl A5/E3); 2.4 cap 10→20 (Published 10→5, Granted 10); 2.5 cap 25→20; 2.7 cap 10→5 (Guide5/Co3); cat3 split → `resourcePerson`(20)+`editorial`(20), `conferencesAttended` dropped from scoring; 5.2 awards by level (State5/else10). Score output now matches the AY2025-26 form. | no | scores change |
| **2. Schema + new-field scoring** | ✅ done (`318fba3`) | `schema.prisma`, `scoringEngine.ts`, `appraisalController.ts`, `reviewController.ts`, tests | +cols `postDoc`/`pgDegree`/`pgDiploma` on `Cat3AdvQual`; +new table `Cat2ConfBookChapter` (2.1-C, conf-derived indexed book chapters, separate from academic 2.3); 2.1 now scores conf book chapters (indexed 10 / else 5); 3.1 scores new qual paths (PostDoc/PGDegree/PGDiploma → 10). | **yes** — `db push` + client regen (stop dev server first) | new score paths |
| **3. Shared pure scoring module** | ✅ done (`da5eb0d`) | `frontend/src/utils/scoring.ts` (new), `scoring.test.ts` (new), shared fixture JSON | frontend can compute the identical `ScoreBreakdown` client-side from in-memory form state; parity test (shared fixture + expected breakdown asserted by both front + back) guards drift. Vitest added to frontend if missing. | no | none yet (plumbing) |
| **4. Inline scores + relabel + new UI** | ✅ done (`1bd4868`) | `frontend/src/pages/faculty/AppraisalEditPage.tsx`, `frontend/src/types` | live score badge beside EVERY subsection on steps 1–5 (updates as user types, via Task 3 module); step-6 summary total kept as-is; cat3 relabeled 3.3 "Resource Person" / 3.4 "Editorial"; new UI — 3.1 PostDoc/PGDegree/PGDiploma checkboxes + a 2.1-C conference-book-chapter section (title/authors/position/conf/indexed/proof). | no | **yes — form UX** |
| **5. Regression verification** | ✅ PASS | none (verify only) | backend 97/97 + frontend 16/16 green; browser-drove faculty form (98CSE011): live badges update on text + checkbox entry (1.2→17.5/80, 3.1 Post-Doc→10/10), frontend/backend parity in real app (both 27.5/500), step-6 3.3/3.4 fixed, new fields persist+score end-to-end, no console errors. | no | none |

**Verified 2026-07-24** on branch `feature/v2-form-changes` (8 commits, `e2c36a9`→`1bd4868`). Known cosmetic: step-6 summary shows two "2.10" (Industry Linkages + Startups) — resolves with the deferred 2.9/2.10 merge (Task 6-era).

## Deferred (NOT in this V2 pass, by owner decision)
- 1.2 attendance/feedback/results per-student formula — kept as-is.
- 2.9 institute-linkage + industry-linkage merge — kept split.
- Non-indexed publication scoring — stays 5.

## Follow-ups surfaced during review (tracked, non-blocking)
- **Task 7** — `pdfService.ts` and `fpgpReconciler.ts` don't yet include `cat2ConfBookChapters`
  (2.1-C omitted from PDF export + FPGP target crediting); the two `FULL_INCLUDE` constants
  (appraisalController + reviewController) are duplicated and can drift. Do after Tasks 1–5.
- **Task 6** — submission/evaluation workflow (quarterly+annual windows, 2-reviewer→HoD
  "evaluated"). Spec in `v2-workflow.md`. After Tasks 1–5.

## Execution model
Agent-driven (subagent-driven-development): per task → implementer subagent → spec-compliance
review → code-quality review → fix loop → commit. Controller (main thread) coordinates + runs
Task 5 verification. Each task commits separately on `feature/v2-form-changes`.
