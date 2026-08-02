import { describe, it, expect } from 'vitest';
import { evaluateCell, assignCadreTier, defaultTierCriteria, TIER_CRITERIA, type CadreTierCell } from './tierEngine';
import type { CriteriaActuals } from './trackingEngine';
import type { CadreTargetRow } from './cadreEngine';

// W7 per-cadre flat tier thresholds.

const actuals: CriteriaActuals = {
  totalScore: 380,
  totalScoreSource: 'HOD',
  feedback: 3.6,
  indexedCount: 3,
  journalCount: 2,
  patentCount: 1,
  projectCount: 0,
  consultancyCount: 0,
};

describe('evaluateCell', () => {
  it('passes when every enabled criterion meets-or-exceeds its value', () => {
    const cell = {
      totalScore: { enabled: true, value: 375 },
      indexedCount: { enabled: true, value: 3 },
    };
    expect(evaluateCell(cell, actuals)).toBe(true);
  });

  it('fails when any enabled criterion falls short', () => {
    const cell = {
      totalScore: { enabled: true, value: 375 },
      projectCount: { enabled: true, value: 1 }, // actual 0
    };
    expect(evaluateCell(cell, actuals)).toBe(false);
  });

  it('ignores disabled criteria', () => {
    const cell = {
      totalScore: { enabled: true, value: 375 },
      projectCount: { enabled: false, value: 5 }, // would fail if counted
    };
    expect(evaluateCell(cell, actuals)).toBe(true);
  });

  it('a cell with no enabled criterion is not satisfied', () => {
    expect(evaluateCell({}, actuals)).toBe(false);
    expect(evaluateCell({ totalScore: { enabled: false, value: 0 } }, actuals)).toBe(false);
  });

  it('meets-or-exceeds is inclusive (>=)', () => {
    expect(evaluateCell({ totalScore: { enabled: true, value: 380 } }, actuals)).toBe(true);
    expect(evaluateCell({ totalScore: { enabled: true, value: 381 } }, actuals)).toBe(false);
  });
});

describe('assignCadreTier', () => {
  const cells: CadreTierCell[] = [
    { tier: 'T1', criteria: { totalScore: { enabled: true, value: 375 }, indexedCount: { enabled: true, value: 3 } } },
    { tier: 'T2', criteria: { totalScore: { enabled: true, value: 350 } } },
    { tier: 'T3', criteria: { totalScore: { enabled: true, value: 300 } } },
  ];

  it('returns the highest satisfied tier', () => {
    const r = assignCadreTier(cells, actuals);
    expect(r.tier).toBe('T1');
    expect(r.satisfied).toEqual({ T1: true, T2: true, T3: true });
  });

  it('falls to a lower tier when T1 not met', () => {
    const r = assignCadreTier(
      [
        { tier: 'T1', criteria: { patentCount: { enabled: true, value: 5 } } },
        { tier: 'T2', criteria: { totalScore: { enabled: true, value: 350 } } },
      ],
      actuals
    );
    expect(r.tier).toBe('T2');
    expect(r.satisfied.T1).toBe(false);
  });

  it('returns null when no cell is satisfied', () => {
    const r = assignCadreTier([{ tier: 'T1', criteria: { totalScore: { enabled: true, value: 500 } } }], actuals);
    expect(r.tier).toBeNull();
  });

  it('treats a missing tier cell as not satisfied', () => {
    const r = assignCadreTier([{ tier: 'T3', criteria: { totalScore: { enabled: true, value: 300 } } }], actuals);
    expect(r.tier).toBe('T3');
    expect(r.satisfied.T1).toBe(false);
    expect(r.satisfied.T2).toBe(false);
  });
});

describe('defaultTierCriteria', () => {
  const target: CadreTargetRow = {
    cadre: 'PROFESSOR',
    minExpYears: 0,
    maxExpYears: null,
    totalScoreTarget: 375,
    feedbackTarget: 3.5,
    indexedCount: 3,
    minJournal: 2,
    quartileSet: 'Q1-Q3',
    ppcRule: 'MANDATORY',
    ppcCount: 2,
  };

  it('seeds the four target-backed metrics enabled at target values', () => {
    const c = defaultTierCriteria(target);
    expect(c.totalScore).toEqual({ enabled: true, value: 375 });
    expect(c.feedback).toEqual({ enabled: true, value: 3.5 });
    expect(c.indexedCount).toEqual({ enabled: true, value: 3 });
    expect(c.journalCount).toEqual({ enabled: true, value: 2 });
  });

  it('starts the PPC counts disabled', () => {
    const c = defaultTierCriteria(target);
    expect(c.patentCount).toEqual({ enabled: false, value: 0 });
    expect(c.projectCount).toEqual({ enabled: false, value: 0 });
    expect(c.consultancyCount).toEqual({ enabled: false, value: 0 });
  });

  it('covers every criterion in the catalog', () => {
    const c = defaultTierCriteria(target);
    for (const key of TIER_CRITERIA) expect(c[key]).toBeDefined();
  });
});
