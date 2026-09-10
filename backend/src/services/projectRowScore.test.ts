import { describe, it, expect } from 'vitest';
import { projectRowScore, computeScore } from './scoringEngine';
import { dropBlankRows } from '../utils/blankRows';

// 1.3 per-row rules. The frontend port has the same table in
// frontend/src/utils/projectRowScore.test.ts — keep them equal.
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

const base: any = {
  cat1Courses: [], cat1CourseResults: [], cat1EContent: [], cat1ICT: [], cat2Journals: [], cat2Conferences: [],
  cat2ConfBookChapters: [], cat2BookChapters: [], cat2Books: [], cat2Citations: null, cat2Patents: [], cat2Projects: [],
  cat2Consultancy: [], cat2Guidance: [], cat2ResearchGroups: [], cat2Linkages: [], cat2Startups: [], cat2IndustryLinkages: [],
  cat3AdvQual: null, cat3Organised: [], cat3ConferencesAttended: [], cat3ResourcePerson: [], cat3Editorial: [], cat3Training: [],
  cat3IntlTravel: [], cat4AdminResp: [], cat4StudentAct: [], cat5Memberships: [], cat5Awards: [], cat5Differentiators: [],
  cat5Internships: [], voidedSources: [],
};

describe('1.3 projectRowScore', () => {
  for (const [name, input, expected] of CASES) {
    it(name, () => expect(projectRowScore(input)).toEqual(expected));
  }

  it('a negative row never subtracts from the rest of the section', () => {
    const rows = [{ course: 'BTECH', projectType: 'MAJOR', count: 2 }, { course: 'BTECH', projectType: 'MINI', count: -3 }];
    expect(computeScore({ ...base, cat1Projects: rows }).cat1.projects).toBe(10); // was 4
  });

  it('the section is capped at 20', () => {
    expect(computeScore({ ...base, cat1Projects: [{ course: 'BTECH', projectType: 'MAJOR', count: 5 }] }).cat1.projects).toBe(20);
  });
});

describe('dropBlankRows — 1.3 projects', () => {
  it('keeps only rows with a positive count, as the form does', () => {
    const cats: any = { cat1Projects: [
      { course: 'BTECH', projectType: 'MINI', count: 0 },
      { course: 'BTECH', projectType: 'MINI', count: -3 },
      { course: 'MTECH', projectType: 'MAJOR', count: 2 },
    ] };
    dropBlankRows(cats);
    expect(cats.cat1Projects).toEqual([{ course: 'MTECH', projectType: 'MAJOR', count: 2 }]);
  });
});
