import { describe, it, expect } from 'vitest';
import { citationScore } from './scoringEngine';

// 2.2 PDF bands: cumulative Scopus / WoS citations 3-10 -> 1, 11-50 -> 2,
// 51-100 -> 3, >100 -> 5; below 3 or blank -> 0. The frontend port has the
// same table in frontend/src/utils/citations.test.ts.
const CASES: Array<[any, number]> = [
  [0, 0], [2, 0], [3, 1], [10, 1], [11, 2], [50, 2], [51, 3], [100, 3], [101, 5], [5000, 5],
  [-20, 0], [null, 0], [undefined, 0], [NaN, 0],
];

describe('2.2 citationScore', () => {
  for (const [tc, score] of CASES) it(`${tc} citations -> ${score}`, () => expect(citationScore(tc)).toBe(score));
});
