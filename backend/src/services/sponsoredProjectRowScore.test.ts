import { describe, it, expect } from 'vitest';
import { sponsoredProjectRowScore, computeScore } from './scoringEngine';

// 2.5 per-row rules (owner decisions 2026-09-11): Ongoing 20, Applied 5 PER
// PROJECT, summed and capped at 20; Completed 0; untitled 0. The frontend port
// has the same table in frontend/src/utils/sponsoredProjects.test.ts.
const CASES: Array<[string, any, number]> = [
  ['ongoing', { title: 'P', status: 'ONGOING' }, 20],
  ['applied', { title: 'P', status: 'APPLIED' }, 5],
  ['completed', { title: 'P', status: 'COMPLETED' }, 0],
  ['no status', { title: 'P', status: null }, 0],
  ['untitled but ongoing', { title: '', status: 'ONGOING' }, 0],
];

const base: any = {
  cat1Courses: [], cat1CourseResults: [], cat1Projects: [], cat1EContent: [], cat1ICT: [], cat2Journals: [], cat2Conferences: [],
  cat2ConfBookChapters: [], cat2BookChapters: [], cat2Books: [], cat2Citations: null, cat2Patents: [], cat2Projects: [],
  cat2Consultancy: [], cat2Guidance: [], cat2ResearchGroups: [], cat2Linkages: [], cat2Startups: [], cat2IndustryLinkages: [],
  cat3AdvQual: null, cat3Organised: [], cat3ConferencesAttended: [], cat3ResourcePerson: [], cat3Editorial: [], cat3Training: [],
  cat3IntlTravel: [], cat4AdminResp: [], cat4StudentAct: [], cat5Memberships: [], cat5Awards: [], cat5Differentiators: [],
  cat5Internships: [], voidedSources: [],
};
const applied = (t: string) => ({ title: t, status: 'APPLIED' });

describe('2.5 sponsoredProjectRowScore', () => {
  for (const [name, row, score] of CASES) it(`${name} -> ${score}`, () => expect(sponsoredProjectRowScore(row).score).toBe(score));

  it('applied projects add up, 5 each (they used to count once)', () => {
    const score = (rows: any[]) => computeScore({ ...base, cat2Projects: rows }).cat2.sponsoredProjects;
    expect(score([applied('A'), applied('B')])).toBe(10);
    expect(score([applied('A'), applied('B'), applied('C')])).toBe(15);
    expect(score([applied('A'), applied('B'), applied('C'), applied('D')])).toBe(20);
  });

  it('caps the section at 20 and ignores completed projects', () => {
    const score = (rows: any[]) => computeScore({ ...base, cat2Projects: rows }).cat2.sponsoredProjects;
    expect(score([{ title: 'O', status: 'ONGOING' }, applied('A')])).toBe(20);
    expect(score([applied('A'), { title: 'C', status: 'COMPLETED' }])).toBe(5);
  });
});
