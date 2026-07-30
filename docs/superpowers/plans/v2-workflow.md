# V2 — Submission / Evaluation Workflow + Cadre Eligibility (DESIGN)

> ## ★ HoD FINAL MODEL (2026-07-29) — AUTHORITATIVE, supersedes anything below where they conflict
>
> The HoD reviewed the proposal and set a more automated, continuous, tiered model:
>
> 1. **Admin sets TARGETS first** — admin configures, as step 0: (a) the cadre targets table, and (b) the **T1/T2/T3 tier rules**. Targets/tiers are data, not constants.
> 2. **Faculty fill criteria data CONTINUOUSLY** — the appraisal is a rolling per-AY record updated through the year (not one annual submit event).
> 3. **Automated quarterly (every 3 months) targets review + criteria-wise tracking** — a scheduled job computes each faculty's status against every target-table criterion. ("Criteria" = the targets table itself: total score, feedback, indexed pubs/journal/quartile, patents/projects/consultancy.)
> 4. **Quarterly feedback auto-sent by scheduled jobs** ("agents" = cron, like existing reminders/fpgpEvaluation).
> 5. **Upload verification by INCHARGES** — a permissioned verifier role, assigned by admin/HoD. **Incharges ARE the reviewers** (their verification is the review; no separate 2-reviewer approval chain).
> 6. **Final appraisal graded into 3 tiers T1 / T2 / T3** (T1 = highest). Admin defines each tier as an **AND/OR combination of the target-table criteria** (admin's choice of which criteria and how they combine). Replaces the earlier binary eligible/not.
>
> **Reconcile:** DROP the 2-reviewer approval gate (roles merge into Incharge/Verifier). DROP binary eligibility → replace with T1/T2/T3 tier engine driven by admin AND/OR rules. KEEP: upload verification + section mapping + HoD gate; reject → HOLD/Red-List (now triggered by an incharge/HoD rejecting a proof) + HoD manual clear on re-upload. Cadre table = the criteria source. Eligibility/tier finalized at ANNUAL; quarterly = automated provisional tracking + auto-feedback.
>
> **New components vs earlier:** admin **TierRule** config (AND/OR of criteria → T1/T2/T3); **Incharge/Verifier** role + assignment; **quarterly scheduler** (tracking + auto-feedback); **criteria-tracking engine** (actuals vs each target criterion) + **tier engine** (criterion statuses + TierRules → T1/T2/T3); continuous rolling record with quarterly snapshots.
>
> **Revised build phases:** W1 admin config — CadreTarget + TierRule (AND/OR builder) + Incharge role/assignment. W2 upload verification by incharges + section map + HoD gate + reject/red-list. W3 criteria-tracking engine + tier engine (T1/T2/T3) + Cat2Patent type/applicant fields + rolling/continuous record + quarterly snapshots. W4 quarterly scheduler (auto tracking + auto-feedback). W5 reports segregated by cadre + tier. W6 feedback format (deferred).
>
> **Resolved (2026-07-29):** (a) **Cadre is fixed for the whole AY** — determined once (from designation + experience at AY start / first record) and stored; never recomputed mid-year. **Quarterly cadence = fixed calendar quarters aligned to the AY** (Jul–Sep, Oct–Dec, Jan–Mar, Apr–Jun; assessment period 01-Jul→30-Jun). (b) **Final tier is AUTO-set from the admin rules; HoD can override** (no mandatory sign-off). (c) Admin gets a **full AND/OR boolean tier-rule builder** in v1. (d) Eligibility indexed set = **WOS + SCOPUS only** (ESCI/ICI still score in the appraisal, don't count toward targets).
> **Design is fully specced — ready to build W1.**
>
> ---
> _Original manual-flow design below is retained for history; treat the box above as current._


Design phase. Build AFTER the form batches. Grand total scoring unchanged (550).
Source: owner canvas flow + FAPA AY2025-26 cadre eligibility table + owner answers.

## Target flow (from canvas)
Faculty → **Submitted** → Reviewer 1 + Reviewer 2 (parallel) → **Both approved?** →
(yes) HoD → **Evaluated by HoD** → compare actuals vs cadre targets table →
decide faculty growth state + **send feedback** (format TBD) → maintain faculty stats in reports.

## Owner decisions (locked)
- **Upload verification:** reviewers AND HoD can mark an upload verified; a HoD verification stands as authoritative; **HoD must** ensure verification — HoD's approval/decision is BLOCKED until every upload is VERIFIED.
- **Upload mapping:** every faculty upload must be mapped to the section/subsection it was uploaded under, and be visible in reports (so verification is easy).
- **Experience:** computed = (appraisal `submittedAt` − `User.dateOfJoining`) in years. **Designation** is provided (`User.designation`).
- **Total-score target:** compare against the **HoD-reviewed total**, not the self-appraisal total.
- **Feedback target:** use **avg student feedback** (mean of `cat1CourseResults.feedbackReceived`).
- **Desirable vs mandatory:** desirable = suggested only, NEVER blocks eligibility; mandatory = eligibility depends on it.
- **Reports:** faculty must be segregable by this cadre table (cadre + eligible/not) so HoD can view/filter.

## Cadre eligibility table (FAPA AY2025-26)
| Cadre | Exp | Total score | Feedback | Indexed (SCI/WoS/Scopus) | Patents/Projects/Consultancy |
|---|---|---|---|---|---|
| Assistant Professor | < 3 yr | ≥ 325 | ≥ 3.5 | 2 indexed | any one **desirable** |
| Assistant Professor | ≥ 3 yr | ≥ 350 | ≥ 3.5 | 2 indexed (min 1 journal) | any one **desirable** |
| Sr. Assistant Professor | — | ≥ 350 | ≥ 3.5 | 3 indexed (min 2 journal) | any one **mandatory** |
| Associate Professor | — | ≥ 375 | ≥ 3.5 | 3 indexed (min 2 journal, Q1–Q4) | any two **mandatory** |
| Professor | — | ≥ 375 | ≥ 3.5 | 3 indexed (min 2 journal, Q1–Q3) | any two **mandatory** |

Notes: (1) multi-author from same dept/institute (VNRVJIET) → claim counts for **one author only**;
(2) patents = **Indian or US, utility/process, Institute-as-Applicant only**.

---

## Maps to current models — and the gaps

### 1. Two reviewers + HoD (current: single `AppraisalReview` `@unique submissionId`, `ReviewerRole HOD|REVIEWER`)
GAP: only one review row allowed; no reviewer-assignment; no dual-approval gate; no EVALUATED state.
- **New model** `ReviewerAssignment { id, facultyId (or submissionId), reviewerId, academicYearId, assignedBy, ... }` — the 2 reviewers a faculty maps to (assigned by admin/HoD).
- **New model** `AppraisalReviewerDecision { id, submissionId, reviewerId, decision PENDING|APPROVED|REJECTED, comment?, decidedAt }` — per-reviewer approve/reject. (OR: drop the `@unique` on `AppraisalReview` and allow reviewer rows — but a dedicated decision table is cleaner and keeps the HoD record separate.)
- **Keep/repurpose `AppraisalReview`** as the HoD-level record (cat6 core-values, HoD-reviewed totals, grandTotal, eligibility result, feedback). It already has cat6 + grandTotal fields.
- **`SubmissionStatus` enum** add: `REVIEWED` (both reviewers approved) and `EVALUATED` (HoD done). Flow: DRAFT → SUBMITTED → UNDER_REVIEW → REVIEWED → EVALUATED (+ REJECTED bounce). Gate: → EVALUATED requires both APPROVED **and** all uploads VERIFIED.

### 2. Upload verification + section mapping (current: `UploadedFile { filename, originalName, mimeType, size, uploaderId }`; proof files also stored as string `proofFile`/`evidenceFile`/`indexProofFile` on category rows)
GAP: no verification status, no section link, upload↔row is a loose filename string.
- **`UploadedFile` add:** `submissionId?`, `section String?` (e.g. "2.1 Journal — Title X"), `verificationStatus PENDING|VERIFIED|REJECTED @default(PENDING)`, `verifiedById?`, `verifiedAt?`, `verifyComment?`.
- Upload flow passes section context so each file knows its subsection + submission.
- **Gate helper:** `allUploadsVerified(submissionId)` — HoD approve action blocked unless true.
- Reports list uploads grouped by section with their verified status (easy HoD verification).

### 3. Cadre eligibility engine (NEW)
- **`CadreTarget` config** (seed from table; admin-editable later): `cadre`, `minExpYears?/maxExpYears?`, `totalScoreTarget`, `feedbackTarget`, `indexedCount`, `minJournal`, `quartileSet String?`, `ppcRule (DESIRABLE|MANDATORY)`, `ppcCount (1|2)`.
- **Cadre derivation:** map `User.designation` → {Assistant Professor, Sr. Assistant Professor, Associate Professor, Professor}; Assistant Professor splits by computed experience <3 / ≥3 yr.
- **Eligibility engine** (pure, like scoringEngine): inputs = HoD-reviewed total, avg student feedback, verified actuals →
  - indexed count = journals+conferences+confBookChapters with `indexed ∈ {SCI-equivalent: WOS, SCOPUS}` (see open Q on ESCI/ICI), after same-dept/institute author dedup; minJournal = indexed journals; quartile check on `cat2Journals.quartile`.
  - patents = `cat2Patents` India/US + utility/process + institute-applicant + Published/Granted.
  - projects = `cat2Projects` applied/sanctioned; consultancy = `cat2Consultancy`.
  - Output: per-requirement met/not-met + `eligible` (mandatory reqs gate; desirable informational).
- **New patent fields needed:** `Cat2Patent` has no patent-TYPE (utility/process) or APPLICANT (institute) — add `patentType String?`, `applicantIsInstitute Boolean?` for the eligibility rule.
- Store the eligibility result on the HoD review (or a `EligibilityResult` record) for reports.

### 4. Reports — segregate by cadre + eligibility (NEW)
- New report/endpoint: HoD views faculty grouped/filterable by cadre and eligible/not-eligible, with per-requirement breakdown + upload-verification status.

## Build phases (later)
- **W1** reviewer assignment + dual-reviewer decisions + status enum (REVIEWED/EVALUATED) + gate.
- **W2** upload verification + section mapping + verify UI + gate on HoD decision.
- **W3** CadreTarget + eligibility engine + new patent fields (type/applicant).
- **W4** reports segregation by cadre/eligibility.
- **W5** feedback format (design later — owner deferred).

## Reject / red-list (owner-locked)
- **Reviewer reject:** notify Faculty **and** HoD, put submission on **HOLD**, add faculty to **RED LIST**, wait for HoD **manual** decision. Faculty stays on hold.
- **HoD reject:** same — HOLD + RED LIST, await HoD decision.
- **Recovery:** HoD removes faculty from the red list AFTER they re-upload the correct docs (re-verify → HoD clears → submission re-enters flow).
- Schema: add status `HOLD`; `AppraisalSubmission += redListed Boolean @default(false)`, `holdReason?`, `heldAt?`. Red-list = HoD view of held faculty to manage.
- New `AppraisalReviewerDecision.decision` REJECTED drives this; `verificationStatus REJECTED` on an upload can also trigger it.

## Resolved open questions
- **Author dedup (Q3):** handled **at verification** — the verifier (HoD/reviewer) applies the "one author per dept/institute" rule manually. Add an optional verifier toggle `eligibilityCounts Boolean?` per publication upload/row so the human decision is recorded (no auto-dedup).
- **Reviewer assignment (Q4):** assigned by **HoD or Admin**.
- **Timing / windows (Q5):** this is a **post-submission** workflow. Eligibility is **FINALIZED after the ANNUAL submission**; before that, quarterly submissions just **map actuals against the target table provisionally** (progress tracking, no final verdict). → needs submission-period typing (quarterly vs annual) so the engine knows when to finalize vs show provisional.

## Still open (defaulted, confirm later)
- **Q2 Indexed set for eligibility:** table says SCI/WoS/Scopus. DEFAULT = count only `WOS` + `SCOPUS` toward eligibility (exclude `ESCI`/`ICI`); they still SCORE in the appraisal. Confirm.
