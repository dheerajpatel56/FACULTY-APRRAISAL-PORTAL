import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { computeScore, type ScoreFormValues } from './scoring';

// Shared fixture — the SAME file the backend parity test
// (backend/src/services/scoringEngine.parity.test.ts) loads. If the two
// engines ever disagree on this fixture, one of the two `computeScore`
// implementations has drifted; the backend is authoritative.
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
