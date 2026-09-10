import { describe, it, expect } from 'vitest';
import { bookRowScore, computeScore } from './scoringEngine';

// 2.3 per-row rules. PDF: international publisher author 10 / editor 5,
// national author 5 / editor 3. Owner decision 2026-09-11: no publisher level
// chosen scores 0 (it used to default to International). The frontend port has
// the same table in frontend/src/utils/bookRowScore.test.ts.
const CASES: Array<[string, any, number]> = [
  ['international, author', { title: 'B', scope: 'INTERNATIONAL', isEdited: false }, 10],
  ['international, editor', { title: 'B', scope: 'INTERNATIONAL', isEdited: true }, 5],
  ['national, author', { title: 'B', scope: 'NATIONAL', isEdited: false }, 5],
  ['national, editor', { title: 'B', scope: 'NATIONAL', isEdited: true }, 3],
  ['no publisher level chosen (null)', { title: 'B', scope: null, isEdited: false }, 0],
  ['no publisher level chosen (blank)', { title: 'B', scope: '', isEdited: false }, 0],
  ['untitled', { title: '  ', scope: 'INTERNATIONAL', isEdited: false }, 0],
  ['edited sent as the string "true"', { title: 'B', scope: 'NATIONAL', isEdited: 'true' }, 3],
];

const base: any = {
  cat1Courses: [], cat1CourseResults: [], cat1Projects: [], cat1EContent: [], cat1ICT: [], cat2Journals: [], cat2Conferences: [],
  cat2ConfBookChapters: [], cat2BookChapters: [], cat2Books: [], cat2Citations: null, cat2Patents: [], cat2Projects: [],
  cat2Consultancy: [], cat2Guidance: [], cat2ResearchGroups: [], cat2Linkages: [], cat2Startups: [], cat2IndustryLinkages: [],
  cat3AdvQual: null, cat3Organised: [], cat3ConferencesAttended: [], cat3ResourcePerson: [], cat3Editorial: [], cat3Training: [],
  cat3IntlTravel: [], cat4AdminResp: [], cat4StudentAct: [], cat5Memberships: [], cat5Awards: [], cat5Differentiators: [],
  cat5Internships: [], voidedSources: [],
};

describe('2.3 bookRowScore', () => {
  for (const [name, row, score] of CASES) {
    it(`${name} -> ${score}`, () => expect(bookRowScore(row).score).toBe(score));
  }

  it('says what is missing when a row scores 0', () => {
    expect(bookRowScore({ title: 'B', scope: null }).reason).toMatch(/National or International/);
    expect(bookRowScore({ title: '', scope: 'NATIONAL' }).reason).toMatch(/title/i);
    expect(bookRowScore({ title: 'B', scope: 'NATIONAL', isEdited: true }).reason).toBe('National publisher, editor');
  });

  it('books and chapters share one cap of 10', () => {
    const s = computeScore({
      ...base,
      cat2Books: [{ title: 'A', scope: 'NATIONAL', isEdited: true }, { title: 'B', scope: null, isEdited: false }],
      cat2BookChapters: [{ title: 'C', scope: 'NATIONAL', isEdited: false }],
    });
    expect(s.cat2.books).toBe(8); // 3 + 0 + 5
    expect(computeScore({ ...base, cat2Books: [{ title: 'A', scope: 'INTERNATIONAL', isEdited: false }, { title: 'B', scope: 'INTERNATIONAL', isEdited: false }] }).cat2.books).toBe(10);
  });
});
