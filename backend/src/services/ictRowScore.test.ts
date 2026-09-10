import { describe, it, expect } from 'vitest';
import { ictRowScore, computeScore } from './scoringEngine';

// 1.5 per-row rules (owner decisions 2026-09-11): 2 per course with documentary
// evidence (a real link, same test as 1.4), max 5. The frontend port has the
// same cases in frontend/src/utils/ictRowScore.test.ts.
describe('1.5 ictRowScore', () => {
  it('2 with a real evidence link', () => {
    expect(ictRowScore({ evidenceFile: 'https://classroom.google.com/c/ds' })).toEqual({ evidence: true, score: 2 });
    expect(ictRowScore({ evidenceFile: '/uploads/file/abc-moodle.pdf' })).toEqual({ evidence: true, score: 2 });
  });

  it('0 without one — blank, missing or made-up', () => {
    for (const v of ['', null, undefined, 'moodle', 'https://']) {
      expect(ictRowScore({ evidenceFile: v as any })).toEqual({ evidence: false, score: 0 });
    }
  });

  it('the section counts only documented rows, capped at 5', () => {
    const base: any = {
      cat1Courses: [], cat1CourseResults: [], cat1Projects: [], cat1EContent: [], cat2Journals: [], cat2Conferences: [],
      cat2ConfBookChapters: [], cat2BookChapters: [], cat2Books: [], cat2Citations: null, cat2Patents: [], cat2Projects: [],
      cat2Consultancy: [], cat2Guidance: [], cat2ResearchGroups: [], cat2Linkages: [], cat2Startups: [], cat2IndustryLinkages: [],
      cat3AdvQual: null, cat3Organised: [], cat3ConferencesAttended: [], cat3ResourcePerson: [], cat3Editorial: [], cat3Training: [],
      cat3IntlTravel: [], cat4AdminResp: [], cat4StudentAct: [], cat5Memberships: [], cat5Awards: [], cat5Differentiators: [],
      cat5Internships: [], voidedSources: [],
    };
    const link = { platform: 'Moodle', natureOfUse: 'Quizzes', evidenceFile: 'https://moodle.vnrvjiet.in/course/ds' };
    expect(computeScore({ ...base, cat1ICT: [{ platform: 'Moodle', evidenceFile: '' }] }).cat1.ict).toBe(0);
    expect(computeScore({ ...base, cat1ICT: [link, { platform: 'MS Teams', evidenceFile: '' }] }).cat1.ict).toBe(2);
    expect(computeScore({ ...base, cat1ICT: [link, link, link] }).cat1.ict).toBe(5);
  });
});
