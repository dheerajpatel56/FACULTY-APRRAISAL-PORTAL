# Reports — Criterion Filter (cross-faculty criterion comparison)

Status: PLANNED (2026-07-31). Build after usage reset. Decisions locked as recommended.

## Goal
HoD/Admin picks a **criterion** and sees **all faculty's mark for just that criterion** in one sortable, exportable grid — instead of opening each appraisal individually.

## Locked decisions
- Build **both** v1 (category-level) and v2 (subsection-level). v2 is the real value.
- Surface = a **mode toggle on the existing Reports pages** (DeptReportsPage / AdminReportsPage), reusing their year/dept filters — not a new page.
- Score source = **reviewed submission if present, else latest**.

## Data facts (verified)
- `getDeptReport` returns `AppraisalReview` rows with `cat1Score..cat5Score`, `cat6*` fields, `totalScore`, `grandTotal` per faculty — category-level data already available.
- `computeScore(sub)` (`scoringEngine.ts`) returns the full per-subsection `ScoreBreakdown`:
  - cat1: lectures, attendanceFeedback, projects, eContent, ict
  - cat2: publications, citations, books, patents, sponsoredProjects, consultancy, guidance, researchGroups, linkages, industryLinkages, startups
  - cat3: advQual, organisedPrograms, resourcePerson, editorial, training, intlTravel
  - cat4: adminResp, studentActivities
  - cat5: memberships, awards, differentiators, internships
- `trackingService.buildTrackingRows` / TRACKING_INCLUDE gives the full-include loader to reuse.

## v1 — category-level (frontend-only)
- Add a **Criterion** dropdown to DeptReportsPage + AdminReportsPage: Cat1 Teaching · Cat2 Research · Cat3 Development · Cat4 Governance · Cat5 Supplementary · Cat6 Core Values · Self Total · Grand Total.
- On a chosen criterion: render a focused grid `Faculty | Code | <criterion>`, sortable desc, all faculty at once. "All" → the current full table.
- Uses existing review data (`cat1Score..cat5Score`; cat6 = sum of the five cat6* fields; `totalScore`; `grandTotal`). No backend change.
- Export: extend the existing `exportReport` output or reuse as-is.

## v2 — subsection-level (backend + frontend)
- **Backend**: `GET /reports/criteria?academicYearId=&dept=` (roleGuard `[HOD, ADMIN]`, dept-ownership enforced for HoD).
  - For each faculty's reviewed-else-latest submission in scope: load with TRACKING_INCLUDE, run `computeScore`, return `{ faculty:{id,name,employeeCode,department}, breakdown: ScoreBreakdown }`.
  - Reuse the tracking loader / `latestPerFaculty`.
- **Frontend**: criterion dropdown grows to grouped subsections (Cat1 › Lectures / Attendance-Feedback / Projects / e-Content / ICT; Cat2 › Publications / Citations / Books / Patents / Sponsored Projects / Consultancy / Guidance / Research Groups / Linkages / Industry Linkages / Startups; Cat3 …; Cat4 …; Cat5 …). Pick → faculty × chosen-subsection grid, sortable, Excel export (reuse the `/tracking/export` XLSX blob pattern).

## Phases
- **A1** v1 category grid (frontend) — DeptReports + AdminReports.
- **A2** v2 endpoint `GET /reports/criteria` (backend) + dept-ownership check.
- **A3** v2 subsection grid + XLSX export (frontend).

## Verify
- API: aggregate/grid endpoint returns correct per-subsection values for a seeded submission; dept-scope enforced (HoD can't read another dept).
- Browser: pick a criterion → grid shows all faculty; sort; export a valid .xlsx.
- Backend tsc + tests; frontend tsc + tests.
