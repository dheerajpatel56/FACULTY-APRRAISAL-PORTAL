import { describe, it, expect } from 'vitest';
import { categoryRemarks, CATEGORIES, GOOD_SHARE } from './categoryRemarks';
import { renderTemplate } from './emailTemplates';

const totals = (t: [number, number, number, number, number]) => ({
  cat1: { total: t[0] }, cat2: { total: t[1] }, cat3: { total: t[2] }, cat4: { total: t[3] }, cat5: { total: t[4] },
});

describe('categoryRemarks', () => {
  it('covers Categories 1-5 only, out of 500', () => {
    expect(CATEGORIES.map((c) => c.key)).toEqual(['cat1', 'cat2', 'cat3', 'cat4', 'cat5']);
    expect(CATEGORIES.reduce((s, c) => s + c.max, 0)).toBe(500);
    expect(GOOD_SHARE).toBe(0.5);
  });

  it('flags a category below half its maximum and praises one at or above it', () => {
    // Teaching 74/150 (just under), Research 75/150 (exactly half), Dev 100/100,
    // Governance 24.9/50 (just under), Supplementary 0/50.
    const r = categoryRemarks(totals([74, 75, 100, 24.9, 0]));
    expect(r.map((x) => x.good)).toEqual([false, true, true, false, false]);
    expect(r[0].remark).toMatch(/^Needs work/);
    expect(r[0].remark).toMatch(/courses taught/);
    expect(r[1].remark).toMatch(/^Good/);
    expect(r[3].score).toBe(24.9);
  });

  it('treats a blank, missing or non-numeric total as 0, never as a good score', () => {
    const r = categoryRemarks({ cat1: { total: null }, cat2: null, cat3: { total: NaN }, cat4: {} } as any);
    expect(r.every((x) => x.score === 0 && !x.good)).toBe(true);
  });
});

describe('quarterly_feedback email — category remarks', () => {
  const html = renderTemplate('quarterly_feedback', {
    name: 'Dr. Test', year: '2026-27', quarter: 'Q1',
    strengths: 'Strong teaching', improvements: 'More journals', growthTargets: 'Research',
    categories: categoryRemarks(totals([120, 30, 60, 10, 25])),
  });

  it('shows each category with its score out of its maximum and a remark', () => {
    expect(html).toContain('Category-wise progress');
    expect(html).toContain('Cat 1 — Teaching');
    expect(html).toContain('120 / 150');
    expect(html).toContain('30 / 150');
    expect(html).toContain('Cat 5 — Supplementary');
    expect(html).toMatch(/Needs work — below half of this category\. Focus on improving your publications/);
    expect(html).toContain('Good — at or above half of this category');
  });

  it('never shows Category 6, the /550 total or tier machinery', () => {
    expect(html).not.toMatch(/Cat\s*6|550|Grand Total|core values/i);
    expect(html).not.toMatch(/\btier\b|eligib|cadre/i);
  });

  it('renders no category block when the payload has none (older queued rows)', () => {
    const old = renderTemplate('quarterly_feedback', { name: 'Dr. Test', year: '2026-27', quarter: 'Q1' });
    expect(old).not.toContain('Category-wise progress');
  });
});
