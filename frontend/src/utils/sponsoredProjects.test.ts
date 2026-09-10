import { describe, it, expect } from 'vitest';
import { sponsoredProjectWarnings } from './sponsoredProjects';
import { sponsoredProjectRowScore, computeScore } from './scoring';

describe('2.5 sponsoredProjectRowScore (frontend port)', () => {
  // Same table as backend/src/services/sponsoredProjectRowScore.test.ts — keep them equal.
  const CASES: Array<[string, any, number]> = [
    ['ongoing', { title: 'P', status: 'ONGOING' }, 20],
    ['applied', { title: 'P', status: 'APPLIED' }, 5],
    ['completed', { title: 'P', status: 'COMPLETED' }, 0],
    ['no status', { title: 'P', status: null }, 0],
    ['untitled but ongoing', { title: '', status: 'ONGOING' }, 0],
  ];
  for (const [name, row, score] of CASES) it(`${name} -> ${score}`, () => expect(sponsoredProjectRowScore(row).score).toBe(score));

  it('applied projects add up to the cap of 20', () => {
    const a = (t: string) => ({ title: t, status: 'APPLIED' as const });
    expect(computeScore({ cat2Projects: [a('A'), a('B')] }).cat2.sponsoredProjects).toBe(10);
    expect(computeScore({ cat2Projects: [a('A'), a('B'), a('C'), a('D'), a('E')] }).cat2.sponsoredProjects).toBe(20);
  });
});

describe('2.5 sponsoredProjectWarnings', () => {
  it('stays quiet for complete rows', () => {
    expect(sponsoredProjectWarnings({ status: 'APPLIED', dateOfApplication: '2025-05-01', amountLakhs: 12 })).toEqual([]);
    expect(sponsoredProjectWarnings({ status: 'ONGOING', durationPeriod: '3 years, 2024-27', amountLakhs: 25 })).toEqual([]);
  });

  it('asks for the detail each status needs, and the amount', () => {
    expect(sponsoredProjectWarnings({ status: 'APPLIED', amountLakhs: 5 })).toEqual(['Enter the date of application.']);
    expect(sponsoredProjectWarnings({ status: 'COMPLETED', amountLakhs: 5 })).toEqual(['Enter the project duration & period.']);
    expect(sponsoredProjectWarnings({ status: 'ONGOING', durationPeriod: '2 years', amountLakhs: 0 })).toEqual(['Enter the amount in Rs. lakhs.']);
  });
});
