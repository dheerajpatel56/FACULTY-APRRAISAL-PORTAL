import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  computeScore,
  type ScoreFormValues,
  type Cat3AdvQualInput,
} from './scoring';

// Shared fixture — the SAME file the backend parity test
// (backend/src/services/scoringEngine.parity.test.ts) loads. The relative path
// is 3 levels up (src/utils -> src -> frontend -> repo root); keep it in sync if
// this file moves. scoring-expected.json is the shared shape+value contract both
// engines must equal — a shape drift on EITHER side fails that side's test, so if
// the two engines ever disagree on this fixture, one `computeScore` has drifted
// (the backend is authoritative — fix the frontend port).
const fixture = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../docs/superpowers/plans/scoring-fixture.json'), 'utf8'),
);
const expected = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../docs/superpowers/plans/scoring-expected.json'), 'utf8'),
);

describe('computeScore — shared fixture parity', () => {
  it('matches the backend-authoritative expected breakdown', () => {
    const result = computeScore(fixture as ScoreFormValues);
    expect(result).toEqual(expected);
  });
});

// Value-locking branch coverage. The single fixture only exercises one point
// in each tier/matrix; these cases pin the currently-unexercised branches to
// specific numbers (lifted from backend/src/services/scoringEngine.test.ts) so
// the port can't silently diverge on a branch the fixture happens to skip.
describe('computeScore — cat1 branch coverage', () => {
  it('1.2 attendanceFeedback: per-row sub-caps A<=5, B<=5, C<=10 sum to a full row of 20', () => {
    const s = computeScore({
      cat1CourseResults: [{
        classSize: 10, attnGte75: 10, attnLt75Gte65: 0, feedbackReceived: 5,
        gradeOAPlus: 10, gradeAB: 0, gradeCD: 0, // A=5 + B=5 + C=10 = 20
      }],
    });
    expect(s.cat1.attendanceFeedback).toBe(20);
  });

  it('1.2 attendanceFeedback: over-max inputs still clamp each sub-part and the row at 20', () => {
    const s = computeScore({
      cat1CourseResults: [{
        classSize: 10, attnGte75: 100, attnLt75Gte65: 100, feedbackReceived: 50,
        gradeOAPlus: 100, gradeAB: 100, gradeCD: 100, // A->cap 5, B->cap 5, C->cap 10
      }],
    });
    expect(s.cat1.attendanceFeedback).toBe(20);
  });

  it('1.2 attendanceFeedback: section capped at 80 across rows', () => {
    const maxed = {
      classSize: 10, attnGte75: 10, attnLt75Gte65: 0, feedbackReceived: 5,
      gradeOAPlus: 10, gradeAB: 0, gradeCD: 0,
    };
    const five = Array.from({ length: 5 }, () => maxed); // 5 * 20 = 100, cap 80
    expect(computeScore({ cat1CourseResults: five }).cat1.attendanceFeedback).toBe(80);
  });

  it('1.3 projects: BTECH MAJOR = 5/count, MTECH MINI = 3/count', () => {
    const s = computeScore({
      cat1Projects: [
        { course: 'BTECH', projectType: 'MAJOR', count: 2 }, // 10
        { course: 'MTECH', projectType: 'MINI', count: 3 },  // 9
      ],
    });
    expect(s.cat1.projects).toBe(19);
  });
});

describe('computeScore — cat2 branch coverage', () => {
  it('2.2 citations tiers: >100->5, 51-100->3, 11-50->2, 3-10->1, <3->0', () => {
    const mk = (totalCitations: number) => computeScore({ cat2Citations: { totalCitations } }).cat2.citations;
    expect(mk(101)).toBe(5);
    expect(mk(51)).toBe(3);
    expect(mk(100)).toBe(3);
    expect(mk(11)).toBe(2);
    expect(mk(50)).toBe(2);
    expect(mk(3)).toBe(1);
    expect(mk(10)).toBe(1);
    expect(mk(2)).toBe(0);
  });

  it('2.3 books/chapters matrix: national editor (isEdited) = 3', () => {
    expect(computeScore({ cat2Books: [{ scope: 'NATIONAL', isEdited: true }] }).cat2.books).toBe(3);
    // full matrix corners for completeness
    expect(computeScore({ cat2Books: [{ scope: 'INTERNATIONAL', isEdited: false }] }).cat2.books).toBe(10);
    expect(computeScore({ cat2Books: [{ scope: 'INTERNATIONAL', isEdited: true }] }).cat2.books).toBe(5);
    expect(computeScore({ cat2Books: [{ scope: 'NATIONAL', isEdited: false }] }).cat2.books).toBe(5);
    // same matrix applies to book chapters
    expect(computeScore({ cat2BookChapters: [{ scope: 'NATIONAL', isEdited: true }] }).cat2.books).toBe(3);
  });

  it('2.6 consultancy tiers: <1L->2, 1-2L->4, 2-5L->6, 5-10L->8, >=10L->10', () => {
    const mk = (amountLakhs: number) => computeScore({ cat2Consultancy: [{ amountLakhs }] }).cat2.consultancy;
    expect(mk(0.5)).toBe(2);
    expect(mk(1)).toBe(4);
    expect(mk(2)).toBe(6);
    expect(mk(5)).toBe(8);
    expect(mk(10)).toBe(10);
  });
});

describe('computeScore — cat3 branch coverage', () => {
  it('3.1 advQual highest-applicable: awarded/thesisSubmitted/postDoc/pgDegree->10, clearedPrePhD->8', () => {
    const mk = (q: Cat3AdvQualInput) => computeScore({ cat3AdvQual: q }).cat3.advQual;
    expect(mk({ awarded: true })).toBe(10);
    expect(mk({ thesisSubmitted: true })).toBe(10);
    expect(mk({ postDoc: true })).toBe(10);
    expect(mk({ pgDegree: true })).toBe(10);
    expect(mk({ clearedPrePhD: true })).toBe(8);
    expect(mk({})).toBe(0);
    // priority: any 10-point flag wins over lower ones
    expect(mk({ clearedPrePhD: true, registeredForPhD: true })).toBe(8);
    expect(mk({ postDoc: true, clearedPrePhD: true, registeredForPhD: true })).toBe(10);
  });
});

describe('computeScore — cat4 caps', () => {
  it('adminResp +10 capped at 40, studentActivities +5 capped at 10', () => {
    const s = computeScore({
      cat4AdminResp: [{}, {}, {}, {}, {}], // 5 * 10 = 50, cap 40
      cat4StudentAct: [{}, {}, {}],        // 3 * 5 = 15, cap 10
    });
    expect(s.cat4.adminResp).toBe(40);
    expect(s.cat4.studentActivities).toBe(10);
    expect(s.cat4.total).toBe(50);
  });
});

describe('computeScore — robustness (partial/missing form state)', () => {
  it('tolerates an empty object -> all zeros, never throws', () => {
    const result = computeScore({});
    expect(result.cat1.total).toBe(0);
    expect(result.cat2.total).toBe(0);
    expect(result.cat3.total).toBe(0);
    expect(result.cat4.total).toBe(0);
    expect(result.cat5.total).toBe(0);
    expect(result.selfTotal).toBe(0);
  });

  it('tolerates null/undefined input -> all zeros, never throws', () => {
    expect(() => computeScore(null)).not.toThrow();
    expect(() => computeScore(undefined)).not.toThrow();
    expect(computeScore(null).selfTotal).toBe(0);
    expect(computeScore(undefined).selfTotal).toBe(0);
  });

  it('tolerates partially-populated form state (missing arrays/objects) without throwing', () => {
    const partial: ScoreFormValues = {
      cat1Courses: [{ periodPlanned: 48, periodsConducted: 46, novelPedagogyUsed: true }],
      // cat2ConfBookChapters intentionally omitted — wired into the form UI in a later task.
      cat2Journals: [{ indexed: 'SCOPUS' }],
      // cat3AdvQual omitted entirely (form hasn't loaded it yet).
      cat5Awards: [{ level: 'state' }],
    };
    const result = computeScore(partial);
    expect(result.cat1.lectures).toBe(13); // base 8 (95.8% >=90) + 5 novelty
    expect(result.cat2.publications).toBe(15);
    expect(result.cat3.advQual).toBe(0);
    expect(result.cat5.awards).toBe(5);
  });

  it('tolerates a cat3AdvQual object missing the new postDoc/pgDegree/pgDiploma keys', () => {
    const result = computeScore({ cat3AdvQual: { registeredForPhD: true } });
    expect(result.cat3.advQual).toBe(5);
  });

  it('tolerates cat2Citations = null (not yet loaded)', () => {
    const result = computeScore({ cat2Citations: null });
    expect(result.cat2.citations).toBe(0);
  });

  it('tolerates a blank auto-added row (0/0 periods) without throwing or leaking NaN', () => {
    const result = computeScore({
      cat1Courses: [{ periodPlanned: 0, periodsConducted: 0, novelPedagogyUsed: false }],
    });
    expect(Number.isNaN(result.cat1.lectures)).toBe(false);
    // 0/0 -> NaN comparisons all resolve false -> base tier 4 (matches backend's own
    // would-be behavior for the same degenerate input; blank rows are stripped
    // before save so the backend never actually sees this, but the live
    // in-memory preview can transiently include an untouched "Add Row").
    expect(result.cat1.total).toBe(4);
  });
});
