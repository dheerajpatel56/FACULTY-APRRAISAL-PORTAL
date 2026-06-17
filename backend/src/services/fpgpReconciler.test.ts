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
