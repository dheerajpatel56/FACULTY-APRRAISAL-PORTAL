import { describe, it, expect } from 'vitest';
import { lectureRowScore, computeScore } from './scoring';

// Same table as backend/src/services/lectureRowScore.test.ts — keep them equal.
type Row = [planned: number | null, conducted: number | null, used: boolean, method: string];
const CASES: Array<[string, Row, { pct: number | null; engagement: number; novelty: number; total: number }]> = [
  ['100% with a method', [60, 60, true, 'Flipped Classroom'], { pct: 100, engagement: 10, novelty: 5, total: 15 }],
  ['95.5% rounds up to 96 -> 10', [200, 191, false, ''], { pct: 96, engagement: 10, novelty: 0, total: 10 }],
  ['95.4% rounds down to 95 -> 8', [1000, 954, false, ''], { pct: 95, engagement: 8, novelty: 0, total: 8 }],
  ['89.5% rounds up to 90 -> 8', [200, 179, false, ''], { pct: 90, engagement: 8, novelty: 0, total: 8 }],
  ['78% -> 4', [60, 47, false, ''], { pct: 78, engagement: 4, novelty: 0, total: 4 }],
  ['more conducted than planned -> 10', [60, 65, false, ''], { pct: 108, engagement: 10, novelty: 0, total: 10 }],
  ['conducted 0 -> whole row 0, novelty included', [60, 0, true, 'Flipped Classroom'], { pct: null, engagement: 0, novelty: 0, total: 0 }],
  ['conducted blank -> 0', [60, null, false, ''], { pct: null, engagement: 0, novelty: 0, total: 0 }],
  ['planned 0 -> 0', [0, 50, true, ''], { pct: null, engagement: 0, novelty: 0, total: 0 }],
  ['a named method counts even with the box unticked', [60, 60, false, 'Case Study / Case-Based'], { pct: 100, engagement: 10, novelty: 5, total: 15 }],
  ['a blank method with the box unticked earns no novelty', [60, 60, false, '   '], { pct: 100, engagement: 10, novelty: 0, total: 10 }],
];

const row = ([planned, conducted, used, method]: Row) =>
  ({ periodPlanned: planned as any, periodsConducted: conducted as any, novelPedagogyUsed: used, novelPedagogyMethod: method });

describe('1.1 lectureRowScore (frontend port)', () => {
  for (const [name, input, expected] of CASES) {
    it(name, () => expect(lectureRowScore(row(input))).toEqual(expected));
  }

  it('a blank number input (NaN from react-hook-form) scores 0', () => {
    expect(lectureRowScore({ periodPlanned: 60, periodsConducted: NaN }).total).toBe(0);
  });

  it('the section score is the sum of the rows, capped at 40', () => {
    const rows = [row([200, 191, false, '']), row([60, 47, false, '']), row([60, 0, true, 'X'])];
    expect(computeScore({ cat1Courses: rows }).cat1.lectures).toBe(14);
    const full = Array.from({ length: 3 }, () => row([60, 60, true, 'Flipped Classroom']));
    expect(computeScore({ cat1Courses: full }).cat1.lectures).toBe(40);
  });
});
