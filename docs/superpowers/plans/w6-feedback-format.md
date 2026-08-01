# W6 — Feedback Format (annual HoD feedback)

Status: PLANNED (2026-07-31). Final phase of the V2 workflow. Decisions locked as recommended.

## Goal
A structured **annual feedback record** the HoD issues per faculty per AY: auto-filled data + HoD narrative + growth guidance, visible to the faculty. Fills the design's "compare actuals vs targets → decide growth state + send feedback" step.

## Locked decisions (recommended forks)
1. **Scope** = Annual final feedback report (per faculty per AY).
2. **Author** = auto data + HoD narrative (structured freeform fields).
3. **Delivery** = in-app "My Feedback" (faculty, read-only) + email on issue; **PDF deferred to W6.5** (ship in-app + email first).
4. **Growth targets** = freeform text (FPGP retired, so no structured target rows).

Relationship to W4: `quarterly_feedback` email stays (automated, provisional). W6 = HoD-authored **annual final** feedback. Both coexist.

## Model
```
model Feedback {
  id             String   @id @default(uuid())
  submissionId   String   @unique
  userId         String
  academicYearId String
  snapshot       Json     // HoD-reviewed cat scores + grandTotal + cadre + tier + eligibility gaps, captured at issue
  strengths      String?
  improvements   String?
  growthTargets  String?
  status         FeedbackStatus @default(DRAFT) // DRAFT | ISSUED
  issuedById     String?
  issuedAt       DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  // relations: submission, user, academicYear, issuedBy(User)
}
enum FeedbackStatus { DRAFT ISSUED }
```

## Backend
- **Autofill** snapshot from `AppraisalReview` scores + `trackingService.computeRow` (cadre / tier / eligibility per-criterion gaps).
- `GET /appraisals/:id/feedback` — owner + HoD/Admin(dept). Returns the Feedback, or a prefilled draft (auto snapshot) if none exists. Faculty only sees it when `status = ISSUED`.
- `PUT /appraisals/:id/feedback` — roleGuard `[HOD, ADMIN]`, dept check. Save narrative (strengths / improvements / growthTargets), keep DRAFT.
- `POST /appraisals/:id/feedback/issue` — roleGuard `[HOD, ADMIN]`. Re-snapshot, set `status = ISSUED`, `issuedAt`, enqueue `feedback_issued` email. Idempotent-ish (re-issue updates).
- Gate: allow issue once an `AppraisalReview` exists for the submission.
- **Email**: new `feedback_issued` template (faculty) — link to view. Add to `EmailTemplateKey` + subjects + bodies + `emailTemplates.test.ts` ALL_KEYS.

## Frontend
- **HoD**: Feedback panel on `ReviewAppraisalPage` (or a Feedback tab) — read-only auto snapshot + narrative textareas (strengths / improvements / growth targets) + **Save draft** / **Issue** buttons.
- **Faculty**: "My Feedback" view (on `AppraisalViewPage` or a new page + nav link) — read-only issued feedback.

## Phases
- **W6.1** schema (Feedback model + FeedbackStatus) + db push.
- **W6.2** backend — autofill + GET/PUT + issue + `feedback_issued` email.
- **W6.3** frontend — HoD feedback panel (save draft / issue).
- **W6.4** frontend — faculty "My Feedback" view + nav.
- **W6.5** (deferred) PDF export via `pdfService`/puppeteer — `GET /appraisals/:id/feedback/pdf` + download button.

## Verify
- API: autofill snapshot correct; PUT saves narrative; issue flips to ISSUED + enqueues `feedback_issued`; faculty sees it only after issue; dept-scope enforced.
- Browser: HoD writes + issues; faculty views read-only.
- Backend tsc + tests (template render covers new key); frontend tsc + tests.
