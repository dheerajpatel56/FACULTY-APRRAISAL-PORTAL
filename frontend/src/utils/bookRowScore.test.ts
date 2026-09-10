import { describe, it, expect } from 'vitest';
import { bookRowScore, computeScore } from './scoring';

// Same table as backend/src/services/bookRowScore.test.ts — keep them equal.
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

describe('2.3 bookRowScore (frontend port)', () => {
  for (const [name, row, score] of CASES) {
    it(`${name} -> ${score}`, () => expect(bookRowScore(row).score).toBe(score));
  }

  it('says what is missing when a row scores 0', () => {
    expect(bookRowScore({ title: 'B', scope: null }).reason).toMatch(/National or International/);
    expect(bookRowScore({ title: '', scope: 'NATIONAL' }).reason).toMatch(/title/i);
    expect(bookRowScore({ title: 'B', scope: 'NATIONAL', isEdited: true }).reason).toBe('National publisher, editor');
  });

  it('books and chapters share one cap of 10', () => {
    expect(computeScore({
      cat2Books: [{ title: 'A', scope: 'NATIONAL', isEdited: true }, { title: 'B', scope: null as any, isEdited: false }],
      cat2BookChapters: [{ title: 'C', scope: 'NATIONAL', isEdited: false }],
    }).cat2.books).toBe(8);
  });
});
