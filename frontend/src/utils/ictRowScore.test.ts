import { describe, it, expect } from 'vitest';
import { ictRowScore, computeScore } from './scoring';

// Same cases as backend/src/services/ictRowScore.test.ts — keep them equal.
describe('1.5 ictRowScore (frontend port)', () => {
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
    const link = { evidenceFile: 'https://moodle.vnrvjiet.in/course/ds' };
    expect(computeScore({ cat1ICT: [{ evidenceFile: '' }] }).cat1.ict).toBe(0);
    expect(computeScore({ cat1ICT: [link, { evidenceFile: '' }] }).cat1.ict).toBe(2);
    expect(computeScore({ cat1ICT: [link, link, link] }).cat1.ict).toBe(5);
  });
});
