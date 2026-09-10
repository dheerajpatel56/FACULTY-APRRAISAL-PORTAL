import { describe, it, expect } from 'vitest';
import { eContentRowScore, isEvidenceLink, computeScore } from './scoringEngine';

// 1.4 per-row rules (owner decision 2026-09-11: 2 marks only WITH evidence).
// The frontend port has the same table in frontend/src/utils/eContentRowScore.test.ts.
const LINKS: Array<[string, unknown, boolean]> = [
  ['Google Drive link', 'https://drive.google.com/file/d/abc/view', true],
  ['YouTube link, padded', '  https://www.youtube.com/watch?v=x  ', true],
  ['plain http link', 'http://vnrvjiet.ac.in/econtent/ds', true],
  ['file uploaded to the portal', '/uploads/file/1b2c-notes.pdf', true],
  ['empty', '', false],
  ['null', null, false],
  ['made-up text', 'abc', false],
  ['bare scheme', 'https://', false],
  ['host with no dot', 'https://localhost', false],
  ['a link with a space in it', 'https://drive.google .com/x', false],
];

describe('1.4 isEvidenceLink / eContentRowScore', () => {
  for (const [name, value, ok] of LINKS) {
    it(`${name} -> ${ok ? 'evidence, 2' : 'no evidence, 0'}`, () => {
      expect(isEvidenceLink(value)).toBe(ok);
      expect(eContentRowScore({ evidenceFile: value as any })).toEqual({ evidence: ok, score: ok ? 2 : 0 });
    });
  }

  it('the section counts only rows with evidence, capped at 5', () => {
    const base: any = {
      cat1Courses: [], cat1CourseResults: [], cat1Projects: [], cat1ICT: [], cat2Journals: [], cat2Conferences: [],
      cat2ConfBookChapters: [], cat2BookChapters: [], cat2Books: [], cat2Citations: null, cat2Patents: [], cat2Projects: [],
      cat2Consultancy: [], cat2Guidance: [], cat2ResearchGroups: [], cat2Linkages: [], cat2Startups: [], cat2IndustryLinkages: [],
      cat3AdvQual: null, cat3Organised: [], cat3ConferencesAttended: [], cat3ResourcePerson: [], cat3Editorial: [], cat3Training: [],
      cat3IntlTravel: [], cat4AdminResp: [], cat4StudentAct: [], cat5Memberships: [], cat5Awards: [], cat5Differentiators: [],
      cat5Internships: [], voidedSources: [],
    };
    const link = { evidenceFile: 'https://drive.google.com/file/d/x/view' };
    expect(computeScore({ ...base, cat1EContent: [{ evidenceFile: '' }, { evidenceFile: 'abc' }] }).cat1.eContent).toBe(0);
    expect(computeScore({ ...base, cat1EContent: [link, { evidenceFile: '' }] }).cat1.eContent).toBe(2);
    expect(computeScore({ ...base, cat1EContent: [link, link, link] }).cat1.eContent).toBe(5);
  });
});
