# FPAS PDF Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the appraisal scoring engine, form and parity fixture to the official *Faculty Annual Performance Self Appraisal (AY 2025-2026)* PDF, subsection by subsection.

**Architecture:** `backend/src/services/scoringEngine.ts` is the source of truth; `frontend/src/utils/scoring.ts` is a pure mirror of it, and `docs/superpowers/plans/scoring-expected.json` is the shared parity contract asserted from BOTH sides. Every scoring change therefore touches three files in lockstep, plus the form labels/inputs in `AppraisalEditPage.tsx`.

**Tech Stack:** TypeScript, Prisma 6 + PostgreSQL (dev DB updated with `prisma db push`, never `migrate dev`), Vitest, React 18 + react-hook-form.

**Source of truth:** `C:/Users/Dheeraj/Downloads/3. FACULTY ANNUAL PERFORMANCE SELF APPRAISAL (AY 2025-2026).pdf`
(extracted text kept at the scratchpad path `fpas.txt` during this work).

**Decisions taken by the product owner (2026-08-12):**
1. **1.2** — use the PDF's explicit formulas (`A=(a/100)*5`, `C=(P/100)*10`), replacing the student-count band inputs.
2. **Cat 3 "Conferences Attended"** — KEEP it scored at 10/row cap 20 even though the PDF has no such subsection (deliberate local addition; Cat 3 stays hard-capped at 100).
3. **2.1** — strict PDF indexing: only WoS/Scopus journals score 15; ESCI/ICI drop to the 10 tier; non-indexed score 0.

**Running expected parity values** (after each task, `scoring-expected.json` must match):

| After task | cat1.total | cat2.total | selfTotal |
|---|---|---|---|
| (baseline) | 53.7 | 138 | 366.7 |
| 1 (2.1) | 53.7 | 128 | 356.7 |
| 2 (2.4) | 53.7 | 123 | 351.7 |
| 3, 4 | unchanged | unchanged | unchanged |
| 5 (2.9/2.10) | 53.7 | 118 | 346.7 |
| 6 (1.2) | 54.75 | 118 | 347.75 |

---

## File Structure

| File | Responsibility | Tasks |
|---|---|---|
| `backend/src/services/scoringEngine.ts` | Authoritative scoring | 1–6 |
| `frontend/src/utils/scoring.ts` | Pure mirror (must stay identical in behaviour) | 1–6 |
| `docs/superpowers/plans/scoring-expected.json` | Shared parity contract | 1, 2, 5, 6 |
| `docs/superpowers/plans/scoring-fixture.json` | Shared parity input | 6 |
| `backend/src/services/scoringEngine.test.ts` | Unit + full-sample assertions | 1–6 |
| `backend/src/prisma/schema.prisma` | `Cat1CourseResults` columns | 6 |
| `frontend/src/pages/faculty/AppraisalEditPage.tsx` | Form inputs + section labels + summary | 5, 6 |
| `frontend/src/components/CriteriaCompare.tsx` | Reports criterion list | 5 |

---

### Task 1: 2.1 — strict PDF indexing tiers

PDF: *"Score is 15 for Quality publications in SCI / WoS / SCOPUS Journals. Score is 10 for Indexed Conference proceedings / indexed book chapters from conferences."* Non-indexed work is not scored.

**Files:**
- Modify: `backend/src/services/scoringEngine.ts` (the `scoreCategory2` publications block)
- Modify: `frontend/src/utils/scoring.ts` (same block)
- Modify: `backend/src/services/scoringEngine.test.ts`
- Modify: `docs/superpowers/plans/scoring-expected.json`

- [ ] **Step 1: Write the failing test**

In `backend/src/services/scoringEngine.test.ts`, replace the existing 2.1 publication tests with:

```ts
  it('2.1 journals: WoS/Scopus = 15, ESCI/ICI = 10, non-indexed = 0', () => {
    const s = computeScore(emptySubmission({
      cat2Journals: [
        { indexed: 'SCOPUS' }, { indexed: 'WOS' },
        { indexed: 'ESCI' }, { indexed: 'ICI' },
        { indexed: 'NONE' },
      ],
    }));
    expect(s.cat2.publications).toBe(50); // 15+15+10+10+0
  });

  it('2.1 conferences and conference book chapters: indexed = 10, non-indexed = 0', () => {
    const s = computeScore(emptySubmission({
      cat2Conferences: [{ indexed: 'WOS' }, { indexed: 'NONE' }],
      cat2ConfBookChapters: [{ indexed: 'ESCI' }, { indexed: 'NONE' }],
    }));
    expect(s.cat2.publications).toBe(20); // 10+0+10+0
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/dev/p1/backend && npx vitest run src/services/scoringEngine.test.ts -t "2.1"`
Expected: FAIL — publications is 55 / 30 (non-indexed still scoring 5, ESCI counted as 15).

- [ ] **Step 3: Write the implementation**

In `backend/src/services/scoringEngine.ts`, replace the block that starts `const INDEXED: PublicationIndex[] = [` and the publications loop with:

```ts
  // 2.1 Publications — journals + conferences + conference-derived book chapters (max 60).
  // PDF: 15 for quality journals (SCI/WoS/Scopus), 10 for indexed conference
  // proceedings and indexed book chapters from conferences. Non-indexed work
  // carries no score.
  const QUALITY_JOURNAL: PublicationIndex[] = [PublicationIndex.WOS, PublicationIndex.SCOPUS];
  const OTHER_INDEXED: PublicationIndex[] = [PublicationIndex.ESCI, PublicationIndex.ICI];
  const isIndexed = (i: PublicationIndex) => QUALITY_JOURNAL.includes(i) || OTHER_INDEXED.includes(i);

  let publications = 0;
  for (const j of s.cat2Journals) {
    publications += QUALITY_JOURNAL.includes(j.indexed) ? 15 : OTHER_INDEXED.includes(j.indexed) ? 10 : 0;
  }
  for (const c of s.cat2Conferences) {
    publications += isIndexed(c.indexed) ? 10 : 0;
  }
  for (const x of s.cat2ConfBookChapters) {
    publications += isIndexed(x.indexed) ? 10 : 0;
  }
  publications = Math.min(publications, 60);
```

- [ ] **Step 4: Mirror it in the frontend port**

In `frontend/src/utils/scoring.ts`, find the publications block in `scoreCategory2` and apply the identical rule. The frontend uses plain string unions rather than the Prisma enum:

```ts
  // 2.1 Publications (max 60) — see backend scoringEngine.ts for the PDF rule.
  const QUALITY_JOURNAL = ['WOS', 'SCOPUS'];
  const OTHER_INDEXED = ['ESCI', 'ICI'];
  const isIndexed = (i: string) => QUALITY_JOURNAL.includes(i) || OTHER_INDEXED.includes(i);

  let publications = 0;
  for (const j of arr<{ indexed?: string }>(v.cat2Journals)) {
    const ix = j?.indexed ?? 'NONE';
    publications += QUALITY_JOURNAL.includes(ix) ? 15 : OTHER_INDEXED.includes(ix) ? 10 : 0;
  }
  for (const c of arr<{ indexed?: string }>(v.cat2Conferences)) {
    publications += isIndexed(c?.indexed ?? 'NONE') ? 10 : 0;
  }
  for (const x of arr<{ indexed?: string }>(v.cat2ConfBookChapters)) {
    publications += isIndexed(x?.indexed ?? 'NONE') ? 10 : 0;
  }
  publications = Math.min(publications, 60);
```

- [ ] **Step 5: Update the parity contract**

In `docs/superpowers/plans/scoring-expected.json` set `cat2.publications` to `35`, `cat2.total` to `128`, and `selfTotal` to `356.7`.
(Fixture input is 1 SCOPUS + 1 NONE journal, 1 WOS conference, 1 ESCI + 1 NONE chapter → 15 + 10 + 10.)

- [ ] **Step 6: Fix the full-sample assertion**

Run: `cd C:/dev/p1/backend && npx vitest run src/services/scoringEngine.test.ts`
The "Category 2 = 103" / "self total" cases in the V. Baby regression block will fail. Read the printed `actual` value and update those two `expect(...)` numbers to it — the sample's non-indexed rows no longer score.

- [ ] **Step 7: Run the whole suite**

Run: `cd C:/dev/p1/backend && npx vitest run` — expect all green.
Run: `cd C:/dev/p1/frontend && npx vitest run` — expect all green (parity mirror).

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/scoringEngine.ts backend/src/services/scoringEngine.test.ts frontend/src/utils/scoring.ts docs/superpowers/plans/scoring-expected.json
git commit -m "fix(scoring): 2.1 strict PDF indexing tiers (WoS/Scopus 15, ESCI/ICI 10, non-indexed 0)"
```

---

### Task 2: 2.4 — a merely *Filed* patent scores nothing

PDF: *"Score for Published Patents -5, Granted - 10"*. `FILED` is a selectable status but carries no score.

**Files:**
- Modify: `backend/src/services/scoringEngine.ts`
- Modify: `frontend/src/utils/scoring.ts`
- Modify: `backend/src/services/scoringEngine.test.ts`
- Modify: `docs/superpowers/plans/scoring-expected.json`

- [ ] **Step 1: Write the failing test**

```ts
  it('2.4 patents: granted 10, published 5, filed 0', () => {
    const s = computeScore(emptySubmission({
      cat2Patents: [{ status: 'GRANTED' }, { status: 'PUBLISHED' }, { status: 'FILED' }],
    }));
    expect(s.cat2.patents).toBe(15);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/dev/p1/backend && npx vitest run src/services/scoringEngine.test.ts -t "2.4"`
Expected: FAIL — received 20 (FILED still adds 5).

- [ ] **Step 3: Write the implementation**

In `backend/src/services/scoringEngine.ts`:

```ts
  // 2.4 Patents / IPR (max 20) — PDF scores Granted 10 and Published 5 only;
  // a patent that is merely Filed carries no score.
  let patents = 0;
  for (const p of s.cat2Patents) {
    if (p.status === PatentStatus.GRANTED) patents += 10;
    else if (p.status === PatentStatus.PUBLISHED) patents += 5;
  }
  patents = Math.min(patents, 20);
```

- [ ] **Step 4: Mirror it in the frontend port**

In `frontend/src/utils/scoring.ts`, the patents loop becomes:

```ts
  let patents = 0;
  for (const p of arr<{ status?: string }>(v.cat2Patents)) {
    if (p?.status === 'GRANTED') patents += 10;
    else if (p?.status === 'PUBLISHED') patents += 5;
  }
  patents = Math.min(patents, 20);
```

- [ ] **Step 5: Update the parity contract**

In `docs/superpowers/plans/scoring-expected.json` set `cat2.patents` to `15`, `cat2.total` to `123`, `selfTotal` to `351.7`.

- [ ] **Step 6: Run both suites**

Run: `cd C:/dev/p1/backend && npx vitest run` then `cd C:/dev/p1/frontend && npx vitest run`. Update any full-sample number the run reports as changed.

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/scoringEngine.ts backend/src/services/scoringEngine.test.ts frontend/src/utils/scoring.ts docs/superpowers/plans/scoring-expected.json
git commit -m "fix(scoring): 2.4 a filed-only patent scores 0 per the FPAS form"
```

---

### Task 3: 2.6 — consultancy band boundary at exactly 10 lakhs

PDF: *"upto 1.0 Lakh – 2, 1 to 2 Lakhs -4, 2 to 5 Lakhs – 6, 5 to10 Lakhs – 8, above 10 Lakhs – 10"*. Exactly ₹10 L falls in the *5 to 10* band → 8, not 10.

**Files:**
- Modify: `backend/src/services/scoringEngine.ts`
- Modify: `frontend/src/utils/scoring.ts`
- Modify: `backend/src/services/scoringEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
  it('2.6 consultancy: exactly 10 lakhs is the 5-10 band (8), above 10 scores 10', () => {
    const at10 = computeScore(emptySubmission({ cat2Consultancy: [{ amountLakhs: 10 }] }));
    expect(at10.cat2.consultancy).toBe(8);
    const above = computeScore(emptySubmission({ cat2Consultancy: [{ amountLakhs: 10.5 }] }));
    expect(above.cat2.consultancy).toBe(10);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/dev/p1/backend && npx vitest run src/services/scoringEngine.test.ts -t "2.6"`
Expected: FAIL — exactly 10 currently returns 10.

- [ ] **Step 3: Write the implementation**

In `backend/src/services/scoringEngine.ts`:

```ts
  // 2.6 Consultancy (max 10) — PDF bands: <=1L 2, 1-2L 4, 2-5L 6, 5-10L 8, >10L 10.
  let consultancy = 0;
  for (const c of s.cat2Consultancy) {
    const a = c.amountLakhs;
    consultancy += a > 10 ? 10 : a >= 5 ? 8 : a >= 2 ? 6 : a >= 1 ? 4 : 2;
  }
  consultancy = Math.min(consultancy, 10);
```

- [ ] **Step 4: Mirror it in the frontend port**

Apply the identical `a > 10 ? 10 : ...` ladder to the consultancy loop in `frontend/src/utils/scoring.ts`.

- [ ] **Step 5: Run both suites**

Run: `cd C:/dev/p1/backend && npx vitest run` then `cd C:/dev/p1/frontend && npx vitest run`.
The parity fixture uses 6 L and 1.5 L, which are unaffected — expect no fixture edit.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/scoringEngine.ts backend/src/services/scoringEngine.test.ts frontend/src/utils/scoring.ts
git commit -m "fix(scoring): 2.6 exactly 10 lakhs falls in the 5-10 consultancy band"
```

---

### Task 4: 3.5 — training duration boundary

PDF: *"Score is 10 for Duration > 5days and 5 for duration min. of 5 days"*. A 5-day programme scores 5; only **more than** 5 days scores 10.

**Files:**
- Modify: `backend/src/services/scoringEngine.ts`
- Modify: `frontend/src/utils/scoring.ts`
- Modify: `backend/src/services/scoringEngine.test.ts`

- [ ] **Step 1: Write the failing test**

Replace the existing 3.5 test with:

```ts
  it('3.5 training: >5 days scores 10, exactly 5 days scores 5, capped 25', () => {
    const s = computeScore(emptySubmission({
      cat3Training: [{ durationDays: 6 }, { durationDays: 5 }, { durationDays: 2 }],
    }));
    expect(s.cat3.training).toBe(20); // 10 + 5 + 5
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/dev/p1/backend && npx vitest run src/services/scoringEngine.test.ts -t "3.5"`
Expected: FAIL — received 25 (exactly 5 days currently scores 10).

- [ ] **Step 3: Write the implementation**

In `backend/src/services/scoringEngine.ts`:

```ts
  // 3.5 Training (max 25) — PDF: >5 days -> 10, a minimum of 5 days -> 5.
  let training = 0;
  for (const t of s.cat3Training) {
    training += t.durationDays > 5 ? 10 : 5;
  }
  training = Math.min(training, 25);
```

- [ ] **Step 4: Mirror it in the frontend port**

```ts
  let training = 0;
  for (const t of arr<Cat3TrainingInput>(v.cat3Training)) {
    training += n(t?.durationDays) > 5 ? 10 : 5;
  }
  training = Math.min(training, 25);
```

- [ ] **Step 5: Run both suites**

Run: `cd C:/dev/p1/backend && npx vitest run` then `cd C:/dev/p1/frontend && npx vitest run`.
Fixture durations are 10 and 3 — unaffected, so no fixture edit. If the full-sample cat3 assertion changes, update it to the printed value.

- [ ] **Step 6: Update the form hint**

In `frontend/src/pages/faculty/AppraisalEditPage.tsx`, find the 3.5 Training section and make the rule explicit above the rows:

```tsx
              <p className="text-xs text-ink-muted mb-3">Score 10 for more than 5 days, 5 for 5 days or fewer. Max 25.</p>
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/scoringEngine.ts backend/src/services/scoringEngine.test.ts frontend/src/utils/scoring.ts frontend/src/pages/faculty/AppraisalEditPage.tsx
git commit -m "fix(scoring): 3.5 only >5-day training scores 10"
```

---

### Task 5: 2.9 / 2.10 — correct the subsection structure

PDF **2.9** is a single subsection worth **max 10** covering *"Interaction/Association with National/International reputed Institutes/Higher Learning Organizations/**Industry linkage** Associated"* — 5 per linkage. PDF **2.10** is *"Initiation/Motivation/Guidance towards innovation/start-ups"* — max 5.

The app currently scores institute linkages (cap 10) and industry linkages (cap 10) as two separate subsections and treats start-ups as an unnumbered extra, so Cat 2's subsection maxima total **160 instead of 150**. Institute and industry rows keep their separate data tables and form sections (useful detail), but they now share one capped 2.9 score.

**Files:**
- Modify: `backend/src/services/scoringEngine.ts`
- Modify: `frontend/src/utils/scoring.ts`
- Modify: `backend/src/services/scoringEngine.test.ts`
- Modify: `docs/superpowers/plans/scoring-expected.json`
- Modify: `frontend/src/pages/faculty/AppraisalEditPage.tsx`
- Modify: `frontend/src/components/CriteriaCompare.tsx`

- [ ] **Step 1: Write the failing test**

Replace the existing linkage/industry tests with:

```ts
  it('2.9 institute + industry linkages share one cap of 10', () => {
    const s = computeScore(emptySubmission({
      cat2Linkages: [{}],
      cat2IndustryLinkages: [{}, {}],
    }));
    expect(s.cat2.linkages).toBe(10); // 3 x 5 = 15, capped at 10
    expect((s.cat2 as any).industryLinkages).toBeUndefined();
  });

  it('2.10 start-ups: 5 each, capped 5', () => {
    const s = computeScore(emptySubmission({ cat2Startups: [{}, {}] }));
    expect(s.cat2.startups).toBe(5);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/dev/p1/backend && npx vitest run src/services/scoringEngine.test.ts -t "2.9"`
Expected: FAIL — `linkages` is 5 and `industryLinkages` still exists.

- [ ] **Step 3: Write the implementation**

In `backend/src/services/scoringEngine.ts` replace the three blocks (`2.9 Linkages`, `2.10 Industry linkage`, `Startups`) with:

```ts
  // 2.9 Interaction/association with institutes AND industry linkage — ONE
  // subsection in the PDF, 5 per linkage, max 10 shared across both tables.
  const linkages = Math.min((s.cat2Linkages.length + s.cat2IndustryLinkages.length) * 5, 10);

  // 2.10 Initiation/motivation/guidance towards innovation & start-ups (max 5).
  const startups = Math.min(s.cat2Startups.length * 5, 5);
```

Update the total and the returned object (drop `industryLinkages`):

```ts
  const total = Math.min(
    publications + citations + books + patents + sponsoredProjects +
    consultancy + guidance + researchGroups + linkages + startups,
    150
  );
  return { publications, citations, books, patents, sponsoredProjects, consultancy, guidance, researchGroups, linkages, startups, total };
```

Then remove `industryLinkages: number;` from the `cat2` block of the `ScoreBreakdown` interface near the top of the file.

- [ ] **Step 4: Mirror it in the frontend port**

In `frontend/src/utils/scoring.ts` apply the same three edits: combined `linkages`, unchanged `startups`, drop `industryLinkages` from both the returned object, the `total` sum and the `ScoreBreakdown` interface:

```ts
  const linkages = Math.min((arr(v.cat2Linkages).length + arr(v.cat2IndustryLinkages).length) * 5, 10);
  const startups = Math.min(arr(v.cat2Startups).length * 5, 5);
```

- [ ] **Step 5: Update the parity contract**

In `docs/superpowers/plans/scoring-expected.json`, inside `cat2`: set `linkages` to `10`, **delete the `industryLinkages` key**, keep `startups` at `5`, set `total` to `118`, and set `selfTotal` to `346.7`.

- [ ] **Step 6: Fix the form labels and summary**

In `frontend/src/pages/faculty/AppraisalEditPage.tsx`:

Relabel the institute section heading and badge (it now carries the shared score):

```tsx
                <h2 className="font-semibold text-ink-primary">2.9 Institute &amp; Industry Linkages</h2>
                <ScoreBadge value={live.cat2.linkages} max={10} />
```

Relabel the industry section so it reads as the second half of 2.9, and point its badge at the same shared value:

```tsx
                <h2 className="font-semibold text-ink-primary">2.9 Industry Linkage</h2>
                <ScoreBadge value={live.cat2.linkages} max={10} />
```

Add a hint under the industry heading:

```tsx
              <p className="text-xs text-ink-muted mb-3">Scored with Institute Linkages — 5 per linkage, 10 max across both.</p>
```

Relabel the start-ups section as 2.10:

```tsx
                <h2 className="font-semibold text-ink-primary">2.10 Innovation / Start-ups</h2>
```

In the Preview summary table (around line 1506) replace the `'2.10 Industry Linkages'` row with a start-ups row and fold industry into 2.9:

```tsx
                      ['2.9 Institute & Industry Linkages', score.cat2.linkages, 10],
                      ['2.10 Innovation / Start-ups', score.cat2.startups, 5],
```

- [ ] **Step 7: Fix the reports criterion list**

In `frontend/src/components/CriteriaCompare.tsx` delete the `c2_ind` entry and relabel the linkages one:

```tsx
  { group: 'Cat 2 — Research', key: 'c2_link', label: '2.9 Institute & Industry Linkages', get: (r) => r.breakdown.cat2.linkages },
  { group: 'Cat 2 — Research', key: 'c2_start', label: '2.10 Innovation / Start-ups', get: (r) => r.breakdown.cat2.startups },
```

- [ ] **Step 8: Typecheck and run both suites**

Run: `cd C:/dev/p1/backend && npx tsc --noEmit && npx vitest run`
Run: `cd C:/dev/p1/frontend && npx tsc -b && npx vitest run && npm run build`
Expected: all green, no remaining reference to `industryLinkages` in a score breakdown. Verify with:
`grep -rn "cat2.industryLinkages" backend/src frontend/src` → no matches.

- [ ] **Step 9: Commit**

```bash
git add backend/src/services/scoringEngine.ts backend/src/services/scoringEngine.test.ts frontend/src/utils/scoring.ts frontend/src/components/CriteriaCompare.tsx frontend/src/pages/faculty/AppraisalEditPage.tsx docs/superpowers/plans/scoring-expected.json
git commit -m "fix(scoring): 2.9 merges industry linkage (shared cap 10); start-ups become 2.10"
```

---

### Task 6: 1.2 — use the PDF's attendance and results formulas

PDF: *"For each Course Max. Score=20 - Attendance (A)=5, Feedback (B)=5, Results (C)=10. If avg. attendance of the students in the class is 'a', A=(a/100)\*5. If pass percentage in the course is 'P', C=(P/100)\*10."*

The current model stores student **counts** per attendance band and per grade band. Those are replaced by the two percentages the form actually asks for. This is the only task with a schema change.

**Files:**
- Modify: `backend/src/prisma/schema.prisma` (`Cat1CourseResults`)
- Modify: `backend/src/services/scoringEngine.ts`
- Modify: `frontend/src/utils/scoring.ts`
- Modify: `backend/src/services/scoringEngine.test.ts`
- Modify: `frontend/src/pages/faculty/AppraisalEditPage.tsx`
- Modify: `docs/superpowers/plans/scoring-fixture.json`, `docs/superpowers/plans/scoring-expected.json`

- [ ] **Step 1: Change the schema**

In `backend/src/prisma/schema.prisma` replace the `Cat1CourseResults` model body with:

```prisma
model Cat1CourseResults {
  id                String @id @default(uuid())
  submissionId      String
  courseName        String
  classSize         Int // Y — size of the class
  avgAttendancePct  Float  @default(0) // a — A = (a/100) * 5
  feedbackReceived  Float  @default(0) // B (out of 5)
  passPercentage    Float  @default(0) // P — C = (P/100) * 10

  submission AppraisalSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Push the schema and regenerate the client**

Stop the backend dev server first (Windows locks the query-engine DLL), then:

```bash
cd C:/dev/p1/backend
npx prisma db push --schema src/prisma/schema.prisma
```

Expected: `Your database is now in sync with your Prisma schema.` followed by `Generated Prisma Client`.
NOTE: this drops the five band columns. That is intended — no production data exists for them yet. Never run `migrate dev` on this project.

- [ ] **Step 3: Write the failing test**

Replace the existing 1.2 test with:

```ts
  it('1.2 uses the PDF formulas: A=(a/100)*5, B as given, C=(P/100)*10, capped 20/course', () => {
    const s = computeScore(emptySubmission({
      cat1CourseResults: [
        { courseName: 'DS', classSize: 50, avgAttendancePct: 80, feedbackReceived: 4, passPercentage: 90 },
      ],
    }));
    // A = 4, B = 4, C = 9
    expect(s.cat1.attendanceFeedback).toBe(17);
  });

  it('1.2 clamps a course to 20 and the section to 80', () => {
    const row = { courseName: 'X', classSize: 10, avgAttendancePct: 100, feedbackReceived: 5, passPercentage: 100 };
    const one = computeScore(emptySubmission({ cat1CourseResults: [row] }));
    expect(one.cat1.attendanceFeedback).toBe(20); // 5 + 5 + 10
    const many = computeScore(emptySubmission({ cat1CourseResults: Array(5).fill(row) }));
    expect(many.cat1.attendanceFeedback).toBe(80); // 100 capped at 80
  });
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd C:/dev/p1/backend && npx vitest run src/services/scoringEngine.test.ts -t "1.2"`
Expected: FAIL — TypeScript/runtime error on the removed band fields, or a 0 score.

- [ ] **Step 5: Write the implementation**

In `backend/src/services/scoringEngine.ts` replace the 1.2 block with:

```ts
  // 1.2 Attendance / Feedback / Results (per course max 20, section max 80).
  // PDF: A = (avg attendance % / 100) * 5, B = feedback out of 5,
  //      C = (pass % / 100) * 10.
  let attendanceFeedback = 0;
  for (const c of s.cat1CourseResults) {
    const A = Math.min(Math.max(c.avgAttendancePct, 0) / 100 * 5, 5);
    const B = Math.min(Math.max(c.feedbackReceived, 0), 5);
    const C = Math.min(Math.max(c.passPercentage, 0) / 100 * 10, 10);
    attendanceFeedback += Math.min(A + B + C, 20);
  }
  attendanceFeedback = Math.min(attendanceFeedback, 80);
```

Also update the `FullSubmission` type's `cat1CourseResults` entry if it lists the old columns explicitly.

- [ ] **Step 6: Mirror it in the frontend port**

In `frontend/src/utils/scoring.ts` update the `Cat1CourseResultsInput` interface to `{ classSize?: number; avgAttendancePct?: number; feedbackReceived?: number; passPercentage?: number }` and replace the loop:

```ts
  let attendanceFeedback = 0;
  for (const c of arr<Cat1CourseResultsInput>(v.cat1CourseResults)) {
    const A = Math.min(Math.max(n(c?.avgAttendancePct), 0) / 100 * 5, 5);
    const B = Math.min(Math.max(n(c?.feedbackReceived), 0), 5);
    const C = Math.min(Math.max(n(c?.passPercentage), 0) / 100 * 10, 10);
    attendanceFeedback += Math.min(A + B + C, 20);
  }
  attendanceFeedback = Math.min(attendanceFeedback, 80);
```

- [ ] **Step 7: Replace the form inputs**

In `frontend/src/pages/faculty/AppraisalEditPage.tsx`, in the 1.2 section, delete the five band inputs (`attnGte75`, `attnLt75Gte65`, `gradeOAPlus`, `gradeAB`, `gradeCD`) and add the two percentage inputs, keeping `courseName`, `classSize` and `feedbackReceived`:

```tsx
                    <div>
                      <label className={labelCls}>Avg. Attendance %</label>
                      <input type="number" step="0.01" min="0" max="100" {...register(`cat1CourseResults.${i}.avgAttendancePct`, { valueAsNumber: true })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Pass %</label>
                      <input type="number" step="0.01" min="0" max="100" {...register(`cat1CourseResults.${i}.passPercentage`, { valueAsNumber: true })} className={inputCls} />
                    </div>
```

Update the section hint to state the formula:

```tsx
              <p className="text-xs text-ink-muted mb-3">Per course max 20 — Attendance = (avg attendance % ÷ 100) × 5, Feedback out of 5, Results = (pass % ÷ 100) × 10. Section max 80.</p>
```

Update the `append(...)` default for this field array to `{ courseName: '', classSize: 0, avgAttendancePct: 0, feedbackReceived: 0, passPercentage: 0 }`.

- [ ] **Step 8: Update the parity fixture and contract**

In `docs/superpowers/plans/scoring-fixture.json` replace the `cat1CourseResults` array with:

```json
  "cat1CourseResults": [
    { "courseName": "Data Structures", "classSize": 50, "avgAttendancePct": 85, "feedbackReceived": 4.5, "passPercentage": 80 }
  ],
```

In `docs/superpowers/plans/scoring-expected.json` set `cat1.attendanceFeedback` to `16.75` (4.25 + 4.5 + 8), `cat1.total` to `54.75`, and `selfTotal` to `347.75`.

- [ ] **Step 9: Typecheck, test and build everything**

```bash
cd C:/dev/p1/backend && npx tsc --noEmit && npx vitest run
cd C:/dev/p1/frontend && npx tsc -b && npx vitest run && npm run build
```
Expected: all green. Fix any remaining reference to the deleted columns that the compiler reports (e.g. seed data or the PDF export service).

- [ ] **Step 10: Verify in the browser**

Start both dev servers, log in as `DEMOFAC1` / `Demo@1234`, open the draft appraisal, go to **2. Teaching (Cat 1)** and confirm the 1.2 rows now ask for *Avg. Attendance %* and *Pass %*, and that entering 80 / 4 / 90 shows **17** on the section badge.

- [ ] **Step 11: Commit**

```bash
git add backend/src/prisma/schema.prisma backend/src/services/scoringEngine.ts backend/src/services/scoringEngine.test.ts frontend/src/utils/scoring.ts frontend/src/pages/faculty/AppraisalEditPage.tsx docs/superpowers/plans/scoring-fixture.json docs/superpowers/plans/scoring-expected.json
git commit -m "fix(scoring): 1.2 uses the FPAS attendance and pass-percentage formulas"
```

---

### Task 7: Documentation sweep

**Files:**
- Modify: `CAT_ALIGNMENT_PLAN.md`

- [ ] **Step 1: Record the alignment**

Append a section to `CAT_ALIGNMENT_PLAN.md` summarising this pass: the seven findings, the three product-owner decisions (PDF 1.2 formulas, Cat 3 Conferences Attended deliberately kept scored, strict 2.1 indexing), and the resulting subsection maxima per category (Cat 1 150, Cat 2 150, Cat 3 100 category cap with 120 of subsection maxima because of the local Conferences Attended addition, Cat 4 50, Cat 5 50).

- [ ] **Step 2: Commit**

```bash
git add CAT_ALIGNMENT_PLAN.md
git commit -m "docs: record the FPAS PDF alignment pass"
```

---

## Verification Checklist

- [ ] Cat 1 subsection maxima sum to 150 (40 + 80 + 20 + 5 + 5)
- [ ] Cat 2 subsection maxima sum to 150 (60 + 5 + 10 + 20 + 20 + 10 + 5 + 5 + 10 + 5)
- [ ] Cat 3 category cap is 100 (subsection maxima total 120 only because Conferences Attended is a deliberate local addition)
- [ ] Cat 4 subsection maxima sum to 50 (40 + 10)
- [ ] Cat 5 subsection maxima sum to 50 (15 + 10 + 20 + 5)
- [ ] `npx vitest run` green in both `backend` and `frontend`
- [ ] `npm run build` green in `frontend`
- [ ] Parity fixture asserts identical values from both engines
