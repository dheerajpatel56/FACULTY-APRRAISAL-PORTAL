import { describe, it, expect } from 'vitest';
import { reconcileFpgp } from './fpgpReconciler';

const subs = (overrides: Record<string, any[]> = {}) =>
  Object.entries(overrides).map(([subsection, rows]) => ({ subsection, rows }));

describe('reconcileFpgp', () => {
  it('all targets met → autoAcceptEligible', () => {
    const r = reconcileFpgp(
      subs({
        '2.1': [{ name: 'Scopus', targetCount: 2 }],
        '2.4': [{ name: 'Patents', targetCount: 1 }],
      }),
      { cat2Journals: [{}, {}, {}], cat2Patents: [{}] },
    );
    expect(r.items).toHaveLength(2);
    expect(r.allMet).toBe(true);
    expect(r.autoAcceptEligible).toBe(true);
  });

  it('a target missed → not auto-accept', () => {
    const r = reconcileFpgp(
      subs({ '2.1': [{ targetCount: 5 }] }),
      { cat2Journals: [{}, {}] },
    );
    expect(r.items[0]).toMatchObject({ subsection: '2.1', target: 5, achieved: 2, met: false });
    expect(r.allMet).toBe(false);
    expect(r.autoAcceptEligible).toBe(false);
  });

  it('sums targetCount across rows', () => {
    const r = reconcileFpgp(
      subs({ '2.1': [{ name: 'SCI', targetCount: 1 }, { name: 'Scopus', targetCount: 2 }, { name: 'WoS', targetCount: 0 }] }),
      { cat2Journals: [{}, {}, {}] },
    );
    expect(r.items[0]).toMatchObject({ target: 3, achieved: 3, met: true });
  });

  it('subsection with no numeric target is skipped', () => {
    const r = reconcileFpgp(
      subs({ '2.1': [{ targetCount: null }, { targetCount: '' }] }),
      { cat2Journals: [{}] },
    );
    expect(r.items).toHaveLength(0);
    expect(r.autoAcceptEligible).toBe(false); // nothing evaluated
  });

  it('null appraisal → achieved 0', () => {
    const r = reconcileFpgp(subs({ '2.4': [{ targetCount: 1 }] }), null);
    expect(r.items[0]).toMatchObject({ achieved: 0, met: false });
  });

  it('3.4 combines training + conferences attended', () => {
    const r = reconcileFpgp(
      subs({ '3.4': [{ targetCount: 4 }] }),
      { cat3Training: [{}, {}], cat3ConferencesAttended: [{}, {}] },
    );
    expect(r.items[0]).toMatchObject({ target: 4, achieved: 4, met: true });
  });

  it('unmapped subsection ignored', () => {
    const r = reconcileFpgp(subs({ '1.1': [{ targetCount: 3 }] }), {});
    expect(r.items).toHaveLength(0);
  });
});

// End-to-end using the real sample FPGP (Dr V. Baby half-yearly review).
// Targets: 2.1 journals = Scopus 2 + WoS 1 = 3; 2.2 conferences = 5x1 = 5;
// 2.4 IPR = 2x1 = 2. Other subsections have only text goals → not evaluated.
// At half-year the outcomes are mostly "communicated/submitted", so the
// appraisal actuals fall short → NEEDS_REVIEW.
describe('sample FPGP — half-yearly reconciliation', () => {
  const planSubs = [
    { subsection: '2.1', rows: [{ name: 'SCI', targetCount: null }, { name: 'Scopus', targetCount: 2 }, { name: 'Web of Science', targetCount: 1 }] },
    { subsection: '2.2', rows: [{ targetCount: 1 }, { targetCount: 1 }, { targetCount: 1 }, { targetCount: 1 }, { targetCount: 1 }] },
    { subsection: '2.4', rows: [{ name: 'Process Patent', targetCount: 1 }, { name: 'Process patent', targetCount: 1 }] },
    { subsection: '2.5', rows: [{ goal: 'Applied', targetCount: null }, { goal: 'Applied', targetCount: null }] },
    { subsection: '3.2', rows: [{ name: 'CSI', targetCount: null }, { name: 'ISTE', targetCount: null }] },
  ];

  it('only quantifiable subsections with numeric targets are evaluated', () => {
    const r = reconcileFpgp(planSubs, {});
    expect(r.items.map((i) => i.subsection)).toEqual(['2.1', '2.2', '2.4']);
  });

  it('mid-progress actuals fall short → not auto-accepted', () => {
    // Half-year actuals: 0 journals published, 2 conferences published, 1 patent published
    const appraisal = {
      cat2Journals: [],
      cat2Conferences: [{}, {}],
      cat2Patents: [{}],
    };
    const r = reconcileFpgp(planSubs, appraisal);
    expect(r.items).toEqual([
      { subsection: '2.1', label: 'Journal Publications', target: 3, achieved: 0, met: false },
      { subsection: '2.2', label: 'Conference Publications', target: 5, achieved: 2, met: false },
      { subsection: '2.4', label: 'Patents / IPR', target: 2, achieved: 1, met: false },
    ]);
    expect(r.allMet).toBe(false);
    expect(r.autoAcceptEligible).toBe(false);
  });

  it('year-end actuals meeting every target → auto-accept', () => {
    const appraisal = {
      cat2Journals: [{}, {}, {}],            // 3 >= 3
      cat2Conferences: [{}, {}, {}, {}, {}], // 5 >= 5
      cat2Patents: [{}, {}],                 // 2 >= 2
    };
    const r = reconcileFpgp(planSubs, appraisal);
    expect(r.allMet).toBe(true);
    expect(r.autoAcceptEligible).toBe(true);
  });
});
