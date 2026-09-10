import { describe, it, expect } from 'vitest';
import { targetStatus, targetEvidence } from './targetStatus';
import { renderTemplate } from './emailTemplates';
import { categoryRemarks } from './categoryRemarks';
import { countedItems } from './trackingEngine';

const evidenceSub = {
  cat2Journals: [
    { title: 'Deep Nets for Crop Yield', journalName: 'IEEE Access', indexed: 'SCOPUS', quartile: 'Q2', impactFactor: 3.4, dateOfPub: '2026-03-10' },
    { title: 'A Local Note', journalName: 'Local Journal', indexed: 'NONE', quartile: 'Q1' }, // not indexed — not counted
  ],
  cat2Conferences: [{ title: 'Edge AI', conferenceName: 'ICACECS 2026', indexed: 'WOS', dateOfPub: null }],
  cat2ConfBookChapters: [],
  cat2Patents: [
    { title: 'Smart Irrigation Valve', country: 'India', patentType: 'Utility', applicantIsInstitute: true, status: 'GRANTED', dateOfGrant: '2026-01-05' },
    { title: 'Not Counted', country: 'India', patentType: 'Design', applicantIsInstitute: true, status: 'GRANTED' },
  ],
  cat2Projects: [{ title: 'AI for Agriculture', fundingAgency: 'DST', amountLakhs: 12.5, status: 'ONGOING' }],
  cat2Consultancy: [],
};

describe('targetEvidence', () => {
  const e = targetEvidence(countedItems(evidenceSub));

  it('names each counted paper with venue, index, quartile, impact factor and date', () => {
    expect(e.indexed).toEqual([
      'Journal — "Deep Nets for Crop Yield" · IEEE Access · SCOPUS · Q2 · IF 3.4 · Mar 2026',
      'Conference — "Edge AI" · ICACECS 2026 · WOS',
    ]);
  });

  it('lists only patents that pass the counting rule, plus projects and consultancy', () => {
    expect(e.ppc).toEqual([
      'Patent — "Smart Irrigation Valve" · Granted · India · Jan 2026',
      'Project — "AI for Agriculture" · DST · ₹12.5 lakh · Ongoing',
    ]);
  });

  it('is empty when nothing counts', () => {
    expect(targetEvidence(countedItems({}))).toEqual({ indexed: [], ppc: [] });
  });
});

// Shaped like cadreEngine.checkEligibility's requirement rows.
const reqs = [
  { key: 'totalScore', label: 'Total score', target: '>= 350', actual: '412' }, // 412 = reviewer's /550 grand total
  { key: 'feedback', label: 'Feedback', target: '>= 4', actual: '4.25' },
  { key: 'indexed', label: 'Indexed (WOS+Scopus)', target: '>= 3', actual: '1' },
  { key: 'journal', label: 'Indexed journals', target: '>= 2', actual: '' },
  { key: 'quartile', label: 'Quartile Q1/Q2 (manual)', target: 'Q1/Q2', actual: 'manual check' },
];

describe('targetStatus', () => {
  const t = targetStatus(reqs, 300);

  it('lists each measurable target with required, current and what is left', () => {
    expect(t.rows.map((r) => [r.label, r.required, r.current, r.achieved, r.status])).toEqual([
      ['Total score (out of 500)', 350, 300, false, '50 to go'],
      ['Feedback', 4, 4.25, true, 'Achieved'],
      ['Indexed (WOS+Scopus)', 3, 1, false, '2 to go'],
      ['Indexed journals', 2, 0, false, '2 to go'],
    ]);
  });

  it("uses the faculty's own total, never the reviewer's /550 grand total", () => {
    expect(t.rows[0].current).toBe(300);
    expect(JSON.stringify(t)).not.toContain('412');
  });

  it('skips rows with no number to measure (the manual quartile check)', () => {
    expect(t.rows.find((r) => /quartile/i.test(r.label))).toBeUndefined();
    expect(t.total).toBe(4);
  });

  it('summarises what is achieved and what is left', () => {
    expect(t.achievedText).toBe('Achieved 1 of 4: Feedback.');
    expect(t.leftText).toBe(
      'Still to achieve: Total score (out of 500) (50 to go), Indexed (WOS+Scopus) (2 to go), Indexed journals (2 to go).'
    );
  });

  it('handles none achieved, all achieved, and no targets set', () => {
    expect(targetStatus(reqs.slice(2, 4), 0).achievedText).toBe('No targets achieved yet (0 of 2).');
    const all = targetStatus([{ key: 'feedback', label: 'Feedback', target: '>= 4', actual: '5' }], 0);
    expect(all.achievedText).toBe('All 1 targets achieved: Feedback.');
    expect(all.leftText).toMatch(/^Nothing left to achieve/);
    const none = targetStatus([], 0);
    expect([none.total, none.achievedText, none.leftText]).toEqual([0, '', '']);
  });
});

describe('quarterly_feedback email — target status', () => {
  const base = { name: 'Dr. Test', year: '2026-27', quarter: 'Q1' };
  const html = renderTemplate('quarterly_feedback', {
    ...base,
    categories: categoryRemarks({ cat1: { total: 90 }, cat2: { total: 20 }, cat3: { total: 60 }, cat4: { total: 30 }, cat5: { total: 10 } }),
    targets: targetStatus(reqs, 300),
  });

  it('shows the target table and the achieved / left summary', () => {
    expect(html).toContain('Your targets for 2026-27');
    expect(html).toContain('Indexed (WOS+Scopus)');
    expect(html).toContain('50 to go');
    expect(html).toContain('Achieved 1 of 4: Feedback.');
    expect(html).toContain('Still to achieve:');
  });

  it('drops the old narrative blocks, Growth focus included', () => {
    expect(html).not.toMatch(/Growth focus|Strengths|Areas to improve/);
  });

  it('never shows tier, cadre, eligibility, Category 6 or the /550 total', () => {
    expect(html).not.toMatch(/\btier\b|eligib|cadre|Cat\s*6|550|Grand Total/i);
    expect(html).not.toContain('412');
  });

  it('lists what counts so far, escaping faculty-typed titles', () => {
    const withEvidence = renderTemplate('quarterly_feedback', {
      ...base,
      targets: targetStatus(reqs, 300),
      evidence: { indexed: ['Journal — "<script>alert(1)</script>" · IEEE Access · SCOPUS · Q2'], ppc: [] },
    });
    expect(withEvidence).toContain('What counts so far');
    expect(withEvidence).toContain('Indexed publications (WOS / Scopus) (1)');
    expect(withEvidence).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(withEvidence).not.toContain('<script>');
    expect(withEvidence).not.toContain('Patents / projects / consultancy');
  });

  it('shows no evidence block when nothing counts', () => {
    expect(html).not.toContain('What counts so far');
  });

  it('says so when no targets have been set', () => {
    const empty = renderTemplate('quarterly_feedback', { ...base, targets: targetStatus([], 0) });
    expect(empty).toContain('have not been set yet');
  });

  it('an older queued row without targets keeps its narrative but not Growth focus', () => {
    const old = renderTemplate('quarterly_feedback', { ...base, strengths: 'S', improvements: 'I', growthTargets: 'G' });
    expect(old).toContain('Strengths');
    expect(old).not.toContain('Growth focus');
  });
});
