import { describe, it, expect } from 'vitest';
import { patentWarnings } from './patents';
import { patentRowScore, computeScore } from './scoring';

describe('2.4 patentRowScore (frontend port)', () => {
  // Same table as backend/src/services/patentRowScore.test.ts — keep them equal.
  const CASES: Array<[string, any, number]> = [
    ['granted', { title: 'P', status: 'GRANTED' }, 10],
    ['published', { title: 'P', status: 'PUBLISHED' }, 5],
    ['filed', { title: 'P', status: 'FILED' }, 0],
    ['no status', { title: 'P', status: null }, 0],
    ['untitled but granted', { title: '  ', status: 'GRANTED' }, 0],
    ['a granted copyright scores like a patent', { title: 'C', status: 'GRANTED', iprType: 'Copyright' }, 10],
  ];
  for (const [name, row, score] of CASES) it(`${name} -> ${score}`, () => expect(patentRowScore(row).score).toBe(score));

  it('caps the section at 20', () => {
    const p = { title: 'P', status: 'GRANTED' as const };
    expect(computeScore({ cat2Patents: [p, p, { title: 'Q', status: 'PUBLISHED' as const }] }).cat2.patents).toBe(20);
  });
});

describe('2.4 patentWarnings', () => {
  it('stays quiet for a complete, consistent row', () => {
    const rows = [{ status: 'GRANTED', appNumber: 'IN-001', dateOfFiling: '2023-01-10', dateOfPub: '2024-02-01', dateOfGrant: '2025-03-05' }];
    expect(patentWarnings(rows, 0)).toEqual([]);
    expect(patentWarnings([{ status: 'FILED', dateOfFiling: '2025-01-01' }], 0)).toEqual([]);
  });

  it('asks for the dates the status needs', () => {
    expect(patentWarnings([{ status: 'GRANTED' }], 0)).toEqual(['Granted — enter the date of grant.', 'Enter the date of publication.']);
    expect(patentWarnings([{ status: 'PUBLISHED' }], 0)).toEqual(['Enter the date of publication.']);
  });

  it('flags dates in the wrong order, including API timestamps', () => {
    const w = patentWarnings([{ status: 'GRANTED', dateOfFiling: '2024-05-01', dateOfPub: '2024-01-01T00:00:00.000Z', dateOfGrant: '2023-12-01' }], 0);
    expect(w).toContain('The date of publication is before the date of filing.');
    expect(w).toContain('The date of grant is before the date of publication.');
  });

  it('flags an application number entered twice, ignoring case and spaces', () => {
    const rows = [{ status: 'FILED', appNumber: 'IN 2024 001' }, { status: 'FILED', appNumber: 'in2024001' }, { status: 'FILED', appNumber: 'IN-999' }];
    expect(patentWarnings(rows, 0)).toEqual(['Application number IN 2024 001 is entered more than once — each patent counts once.']);
    expect(patentWarnings(rows, 2)).toEqual([]);
  });
});
