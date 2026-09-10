import { describe, it, expect } from 'vitest';
import { citationWarnings } from './citations';
import { citationScore } from './scoring';

describe('2.2 citationScore (frontend port)', () => {
  // Same table as backend/src/services/citationScore.test.ts — keep them equal.
  const CASES: Array<[any, number]> = [
    [0, 0], [2, 0], [3, 1], [10, 1], [11, 2], [50, 2], [51, 3], [100, 3], [101, 5], [5000, 5],
    [-20, 0], [null, 0], [undefined, 0], [NaN, 0],
  ];
  for (const [tc, score] of CASES) it(`${tc} citations -> ${score}`, () => expect(citationScore(tc)).toBe(score));
});

describe('2.2 citationWarnings', () => {
  it('stays quiet when the numbers are consistent', () => {
    expect(citationWarnings({ totalPubsTillDate: 12, pubsWithCitations: 8, totalCitations: 55, hIndexScopus: 4, hIndexWos: 3 })).toEqual([]);
    expect(citationWarnings({})).toEqual([]);
    expect(citationWarnings(null)).toEqual([]);
  });

  it('flags more cited publications than publications', () => {
    expect(citationWarnings({ totalPubsTillDate: 3, pubsWithCitations: 5, totalCitations: 20 }))
      .toContain('5 publications with citations, but only 3 publications till date.');
  });

  it('flags fewer citations than cited publications, and citations with no cited publication', () => {
    expect(citationWarnings({ totalPubsTillDate: 10, pubsWithCitations: 6, totalCitations: 4 })[0]).toMatch(/^Total citations \(4\) is less than/);
    expect(citationWarnings({ totalPubsTillDate: 10, pubsWithCitations: 0, totalCitations: 9 }))
      .toContain('Citations are entered, but no publications with citations.');
  });

  it('flags an h-index larger than the cited publications, and negatives', () => {
    const w = citationWarnings({ totalPubsTillDate: 10, pubsWithCitations: 3, totalCitations: 30, hIndexScopus: 5, hIndexWos: -1 });
    expect(w).toContain('Numbers cannot be negative.');
    expect(w).toContain('h-Index (Scopus) of 5 is more than the publications with citations (3).');
  });
});
