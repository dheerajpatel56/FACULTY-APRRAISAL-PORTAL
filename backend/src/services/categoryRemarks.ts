// Per-category remarks for the quarterly email. Half of a category's maximum
// is the line: below it the faculty is told to work on that category, at or
// above it they are told it is in good shape. Pure function — no I/O.
//
// Faculty-facing, so it covers Categories 1-5 only (out of 500). Category 6 and
// the /550 grand total are the reviewer's assessment and never appear here.
import type { ScoreBreakdown } from './scoringEngine';

/** Share of a category's maximum that counts as a good score. */
export const GOOD_SHARE = 0.5;

export const CATEGORIES = [
  { key: 'cat1', label: 'Teaching', max: 150, focus: 'courses taught, results, projects guided and e-content' },
  { key: 'cat2', label: 'Research', max: 150, focus: 'publications, funded projects, patents and research guidance' },
  { key: 'cat3', label: 'Development', max: 100, focus: 'programmes organised or attended, resource-person roles and training' },
  { key: 'cat4', label: 'Governance', max: 50, focus: 'committee responsibilities and student activities' },
  { key: 'cat5', label: 'Supplementary', max: 50, focus: 'memberships, awards, differentiators and internships' },
] as const;

export interface CategoryRemark {
  key: string;
  label: string;
  score: number;
  max: number;
  good: boolean;
  remark: string;
}

type CategoryTotals = { [K in (typeof CATEGORIES)[number]['key']]?: { total?: number | null } | null };

export function categoryRemarks(breakdown: CategoryTotals | Pick<ScoreBreakdown, 'cat1' | 'cat2' | 'cat3' | 'cat4' | 'cat5'>): CategoryRemark[] {
  return CATEGORIES.map((c) => {
    // A blank or missing total counts as 0 — it must never read as a good score.
    const raw = Number((breakdown as CategoryTotals)[c.key]?.total);
    const score = Number.isFinite(raw) && raw > 0 ? Math.round(raw * 10) / 10 : 0;
    const good = score >= c.max * GOOD_SHARE;
    const remark = good
      ? 'Good — at or above half of this category. Keep it up.'
      : `Needs work — below half of this category. Focus on improving your ${c.focus}.`;
    return { key: c.key, label: c.label, score, max: c.max, good, remark };
  });
}
