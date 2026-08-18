# Verification checklist

Things built but **not yet verified in a browser by a human**. Tick items off as
you confirm them. Newest batch at the top.

Start the app:

```bash
cd C:/dev/p1/backend && npm run dev
```

```bash
cd C:/dev/p1/frontend && npm run dev -- --port 5173 --strictPort
```

Logins: admin `ADMIN001` / `admin123` · HoD (CSE) `00CSE003` / `Welcome@123` ·
faculty `FAC21` / `faculty123`.

Legend: `[ ]` needs your eyes · `[x]` already confirmed · `(auto)` covered by an
automated test, listed so you know it exists.

---

## 2026-08-18 — Admin-only reopen for re-review

- [ ] **Reopen button shows only on decided rows.** Admin → Appraisals. Rows
  with APPROVED / REJECTED / FINAL_REVIEW get a `Reopen` button; SUBMITTED and
  DRAFT rows do not.
- [ ] **Reason is required.** Cancel the prompt → nothing happens. Enter under 3
  characters → rejected. A real reason → "Reopened for review".
- [ ] **Status returns to SUBMITTED** and the appraisal reappears in the HoD's
  Reviews queue.
- [ ] **HoD can now correct the marks** and approve again.
- [ ] **Faculty side is untouched** — their form stays locked, no edit access,
  and they get no email about the reopen.
- [ ] **Audit trail.** Admin → Audit shows `REVIEW_REOPENED` with your reason.
- [ ] **Final-review sign-offs reset.** If the appraisal had final reviewers who
  had approved, their decisions go back to PENDING.
- [ ] **Re-approval emails the faculty again.** Confirm whether a second
  "approved" email is acceptable, or should be suppressed on a reopened cycle.
- (auto) 2 tests: full approve → locked → reopen → correct cycle with audit
  assertion, and reopen refused on a never-decided submission.

## 2026-08-18 — Approval is final (made visible)

No rule changed here — the API already refused a second approval. This only
surfaces it before the click.

- [ ] **Decision card carries the warning** that approval is final and the marks
  lock in.
- [ ] **Approving asks for confirmation** showing the reviewed total out of 550.
  Cancelling leaves the submission untouched (status stays SUBMITTED, no review
  row written).
- [ ] **Rejecting does NOT prompt** — only approval is irreversible.
- [ ] **Note:** headless browser drivers auto-cancel `window.confirm`, so test
  this in a real browser (same caveat as the red-list clear button).

## 2026-08-18 — Reviewer can override categories 1-5

- [ ] **Marks are editable and pre-seeded.** As HoD open a SUBMITTED appraisal.
  Each Cat 1-5 row in the `HoD Review` column is a number input already filled
  with the computed value.
- [ ] **Changing a mark shows the difference.** Edit one — the input border
  highlights and the category label gains e.g. `(-20.0)`. The `/ 550` total
  updates live.
- [ ] **Category caps hold.** Try 151 in Cat 1 (max 150). The server rejects it
  with a validation error rather than saving.
- [ ] **Marks persist as awarded.** Approve, then check the stored review — the
  grand total must equal your marks + Cat 6, NOT the self score + Cat 6.
- [ ] **Downstream picks it up.** Reports "Reviewed" column, the tracking page
  total-score actual, and the PDF grand total should all reflect the overridden
  marks (they all read `review.grandTotal`).
- [ ] **A submission can only be approved once.** Re-reviewing an approved one
  returns "Already approved" — pre-existing rule, confirm it still holds.
- (auto) 3 tests: override stored + totalled, over-max rejected, omitted
  categories fall back to computed.

## 2026-08-18 — HoD Review Score column on the review page

- [ ] **Two columns show.** As HoD (`00CSE003`) open a SUBMITTED appraisal from
  Reviews. The score card (now titled just "Score") has `Self` and `HoD Review`
  columns with a Cat 1-5 row each.
- [ ] **Cat 1-5 match across both columns.** They are meant to be identical —
  the server recomputes them from the same evidence. If they ever differ, that
  is a real bug worth reporting.
- [ ] **Cat 6 row is live.** Type values into Category 6 — Core Values below.
  The Cat 6 row updates as you type, Self shows `—`, and the row caps at
  `50 / 50` even if the five inputs sum past 50.
- [ ] **Totals.** Self total reads `/ 500`, HoD Review total reads `/ 550` and
  equals self total + Cat 6.
- [ ] **Submitting still works** and the stored grand total matches what the
  card showed.

## 2026-08-18 — Cat 2 book sections merged into one 2.3

- [ ] **Faculty form shows a single 2.3.** Log in as faculty → open/create the
  appraisal → Category 2. There should be exactly **one** heading
  "2.3 Books & Book Chapters" with **one** score badge reading `/ 10`, and
  `Books` + `Academic Book Chapters` as sub-headings inside it.
- [ ] **Section order reads 2.1-C → 2.2 Citations → 2.3 → 2.4 Patents.**
  (It used to run 2.3 → 2.2 → 2.3.)
- [ ] **Combined cap actually caps.** Add books and chapters worth more than 10
  between the two sub-lists. The single badge must stop at `10 / 10` — not 10
  for each list.
- [ ] **Existing rows survived.** Open an appraisal that already had books or
  chapters saved; both lists still show their rows, and Save keeps them.
- [ ] **PDF export.** Export an appraisal with at least one book and one
  chapter. Table is titled "2.3 Books & Book Chapters (combined, max 10)" and
  the new **Kind** column says `Book` vs `Chapter` on the right rows.

## 2026-08-18 — L4 scoring: 1.2 math deduplicated

- [ ] **HoD review page 1.2 numbers unchanged.** As HoD open a submitted
  appraisal with 1.2 course-results rows. The `A / B / C / Total` line must read
  exactly as before the change — it now calls the shared `courseResultScore()`
  instead of its own copy of the formulas.
- (auto) Parity fixture still passes on both sides — backend 219, frontend 18.

## 2026-08-18 — L3 destructive-script guards

- [x] **Seed refuses to run over imported data.** Confirmed live: blocked with
  "74 user(s) that this seed does not own", exit 1. Override is
  `npm run seed -- --force`.
- [x] **Wipe script defaults to a dry run.** Confirmed live: reported 89 users /
  8 appraisals / 283 audit logs it *would* delete, deleted nothing, exit 0.
  A wrong `--confirm=` value is refused.
- [ ] **Seed still works on an empty database.** Only if you care: point
  `DATABASE_URL` at a throwaway database and confirm `npm run seed` completes.
  Do **not** test this against `faculty_appraisal`.

## 2026-08-18 — L2 migrate guard

- [x] **`npm run prisma:migrate` is blocked.** Confirmed live: prints the reason,
  exit 1. Note it cannot stop a direct `npx prisma migrate dev`.
- [ ] **README setup steps still work end to end** if you follow them fresh
  (`prisma:generate` → `prisma:push` → seed on an empty database).

## 2026-08-18 — L1 quarterly snapshot send-gate

> This is the mass-email path. Everything below is safe **except** the final
> item, which really does send mail to real faculty addresses.

- [ ] **Button previews instead of sending.** As admin on `/tracking`, pick the
  open year → "Run quarterly snapshot". A confirm dialog must appear showing
  will-be-emailed / opted-out / already-sent / no-address counts. **No mail is
  queued at this point.**
- [ ] **Cancel is really a cancel.** Dismiss the dialog, then check the queue is
  unchanged (Prisma Studio → `EmailNotification`, or compare row count before
  and after).
- [ ] **Send button disabled when the count is zero.**
- [ ] **Real send — only when you actually intend it.** Confirming mails every
  opted-in faculty at their real `@vnrvjiet.in` address and cannot be recalled.
  Prefer proving it with a single test user: temporarily set `emailOptIn = false`
  on everyone else, or point one faculty row at your own inbox
  (`backend/scripts/send-test-feedback.ts`).
- (auto) Two tests assert the dry run queues nothing, including when `confirm`
  is a non-`true` value.

---

## Still open (not built)

- Daily 09:00 review-window cron is still ungated; it fires the same mass email
  on a window's end date without anyone clicking anything.
- **Decide:** re-approving a reopened appraisal sends the faculty a second
  "approved" email. Keep it (the outcome did change) or suppress it on a
  reopened cycle?
- Held form items awaiting the owner: 27 (3.4 nature options), 20 (outside
  collaboration), 31 (5.3 "executing" score value).
- W6.5 — PDF export of the annual feedback.
- Two academic years are open at once (`2026-27` and `2025-26`), which widens
  the quarterly mass-email scope. Close `2025-26`?
