import { describe, it, expect } from 'vitest';
import { projectRowScore, computeScore } from './scoring';

// Same table as backend/src/services/projectRowScore.test.ts — keep them equal.
const CASES: Array<[string, any, { rate: number; count: number; unit: string; score: number }]> = [
  ['B.Tech mini: 2 per batch', { course: 'BTECH', projectType: 'MINI', count: 3 }, { rate: 2, count: 3, unit: 'batch', score: 6 }],
  ['B.Tech major: 5 per batch', { course: 'BTECH', projectType: 'MAJOR', count: 2 }, { rate: 5, count: 2, unit: 'batch', score: 10 }],
  ['M.Tech mini: 3 per student', { course: 'MTECH', projectType: 'MINI', count: 4 }, { rate: 3, count: 4, unit: 'student', score: 12 }],
  ['M.Tech major: 5 per student', { course: 'MTECH', projectType: 'MAJOR', count: 3 }, { rate: 5, count: 3, unit: 'student', score: 15 }],
  ['a negative count scores 0', { course: 'BTECH', projectType: 'MINI', count: -3 }, { rate: 2, count: 0, unit: 'batch', score: 0 }],
  ['a fraction is dropped (the DB stores an Int)', { course: 'BTECH', projectType: 'MAJOR', count: 2.5 }, { rate: 5, count: 2, unit: 'batch', score: 10 }],
  ['a blank count scores 0', { course: 'MTECH', projectType: 'MINI', count: null }, { rate: 3, count: 0, unit: 'student', score: 0 }],
  ['no course/type scores 0', { count: 4 }, { rate: 0, count: 4, unit: 'batch', score: 0 }],
];

describe('1.3 projectRowScore (frontend port)', () => {
  for (const [name, input, expected] of CASES) {
    it(name, () => expect(projectRowScore(input)).toEqual(expected));
  }

  it('a blank number input (NaN) scores 0', () => {
    expect(projectRowScore({ course: 'BTECH', projectType: 'MINI', count: NaN }).score).toBe(0);
  });

  it('a negative row never subtracts, and the live badge matches what the server stores for a fraction', () => {
    expect(computeScore({ cat1Projects: [{ course: 'BTECH', projectType: 'MAJOR', count: 2 }, { course: 'BTECH', projectType: 'MINI', count: -3 }] }).cat1.projects).toBe(10);
    expect(computeScore({ cat1Projects: [{ course: 'BTECH', projectType: 'MAJOR', count: 2.5 }] }).cat1.projects).toBe(10);
    expect(computeScore({ cat1Projects: [{ course: 'BTECH', projectType: 'MAJOR', count: 5 }] }).cat1.projects).toBe(20);
  });
});
