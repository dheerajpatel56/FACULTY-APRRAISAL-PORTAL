import { describe, it, expect } from 'vitest';
import { patentRowScore, computeScore } from './scoringEngine';

// 2.4 per-row rules. PDF: Published 5, Granted 10 (any kind of IPR); Filed 0.
// The frontend port has the same table in frontend/src/utils/patents.test.ts.
const CASES: Array<[string, any, number]> = [
  ['granted', { title: 'P', status: 'GRANTED' }, 10],
  ['published', { title: 'P', status: 'PUBLISHED' }, 5],
  ['filed', { title: 'P', status: 'FILED' }, 0],
  ['no status', { title: 'P', status: null }, 0],
  ['untitled but granted', { title: '  ', status: 'GRANTED' }, 0],
  ['a granted copyright scores like a patent', { title: 'C', status: 'GRANTED', iprType: 'Copyright' }, 10],
];

const base: any = {
  cat1Courses: [], cat1CourseResults: [], cat1Projects: [], cat1EContent: [], cat1ICT: [], cat2Journals: [], cat2Conferences: [],
  cat2ConfBookChapters: [], cat2BookChapters: [], cat2Books: [], cat2Citations: null, cat2Patents: [], cat2Projects: [],
  cat2Consultancy: [], cat2Guidance: [], cat2ResearchGroups: [], cat2Linkages: [], cat2Startups: [], cat2IndustryLinkages: [],
  cat3AdvQual: null, cat3Organised: [], cat3ConferencesAttended: [], cat3ResourcePerson: [], cat3Editorial: [], cat3Training: [],
  cat3IntlTravel: [], cat4AdminResp: [], cat4StudentAct: [], cat5Memberships: [], cat5Awards: [], cat5Differentiators: [],
  cat5Internships: [], voidedSources: [],
};

describe('2.4 patentRowScore', () => {
  for (const [name, row, score] of CASES) it(`${name} -> ${score}`, () => expect(patentRowScore(row).score).toBe(score));

  it('explains a zero', () => {
    expect(patentRowScore({ title: 'P', status: 'FILED' }).reason).toMatch(/^Filed/);
    expect(patentRowScore({ title: '', status: 'GRANTED' }).reason).toMatch(/title/i);
  });

  it('caps the section at 20', () => {
    const p = { title: 'P', status: 'GRANTED' };
    expect(computeScore({ ...base, cat2Patents: [p, p, { title: 'Q', status: 'PUBLISHED' }] }).cat2.patents).toBe(20);
  });
});
