import { describe, it, expect } from 'vitest';
import { eContentRowScore, isEvidenceLink, computeScore } from './scoring';

// Same table as backend/src/services/eContentRowScore.test.ts — keep them equal.
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

describe('1.4 isEvidenceLink / eContentRowScore (frontend port)', () => {
  for (const [name, value, ok] of LINKS) {
    it(`${name} -> ${ok ? 'evidence, 2' : 'no evidence, 0'}`, () => {
      expect(isEvidenceLink(value)).toBe(ok);
      expect(eContentRowScore({ evidenceFile: value as any })).toEqual({ evidence: ok, score: ok ? 2 : 0 });
    });
  }

  it('the section counts only rows with evidence, capped at 5', () => {
    const link = { evidenceFile: 'https://drive.google.com/file/d/x/view' };
    expect(computeScore({ cat1EContent: [{ evidenceFile: '' }, { evidenceFile: 'abc' }] }).cat1.eContent).toBe(0);
    expect(computeScore({ cat1EContent: [link, { evidenceFile: '' }] }).cat1.eContent).toBe(2);
    expect(computeScore({ cat1EContent: [link, link, link] }).cat1.eContent).toBe(5);
  });
});
