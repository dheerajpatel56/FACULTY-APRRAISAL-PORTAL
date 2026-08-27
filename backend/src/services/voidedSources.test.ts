import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { computeScore } from './scoringEngine';

// Voiding — when a faculty never replaces a rejected proof by the deadline, the
// rows of that source stop earning marks. The entries stay on the submission as
// a record of what was claimed; only the score changes. The same field drives
// the frontend mirror, so the two engines cannot drift apart over it.

const fixture = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../docs/superpowers/plans/scoring-fixture.json'), 'utf8'),
);

describe('computeScore — voided sources', () => {
  it('scores nothing for a voided source and leaves the rest alone', () => {
    const before = computeScore(fixture as any);
    expect(before.cat2.publications).toBeGreaterThan(0);

    const voided = computeScore({ ...fixture, voidedSources: ['cat2Journals'] } as any);

    // Journals stop counting...
    expect(voided.cat2.publications).toBeLessThan(before.cat2.publications);
    // ...while everything outside category 2 is untouched.
    expect(voided.cat1.total).toBe(before.cat1.total);
    expect(voided.cat3.total).toBe(before.cat3.total);
    expect(voided.cat4.total).toBe(before.cat4.total);
    expect(voided.cat5.total).toBe(before.cat5.total);
    expect(voided.selfTotal).toBeLessThan(before.selfTotal);
  });

  it('voids a sibling source without touching the other half of the subsection', () => {
    const before = computeScore(fixture as any);
    const journalsOnly = computeScore({ ...fixture, voidedSources: ['cat2Journals'] } as any);
    const bothVoided = computeScore({ ...fixture, voidedSources: ['cat2Journals', 'cat2Conferences'] } as any);

    // 2.1 Conferences survives when only 2.1 Journals is voided.
    expect(bothVoided.cat2.publications).toBeLessThanOrEqual(journalsOnly.cat2.publications);
    expect(journalsOnly.cat2.publications).toBeLessThanOrEqual(before.cat2.publications);
  });

  it('is a no-op when nothing is voided', () => {
    const plain = computeScore(fixture as any);
    expect(computeScore({ ...fixture, voidedSources: [] } as any)).toEqual(plain);
    expect(computeScore({ ...fixture, voidedSources: undefined } as any)).toEqual(plain);
  });

  it('handles a singleton source (an object, not an array)', () => {
    const before = computeScore(fixture as any);
    const voided = computeScore({ ...fixture, voidedSources: ['cat2Citations'] } as any);
    expect(voided.cat2.citations).toBe(0);
    expect(voided.cat2.citations).toBeLessThanOrEqual(before.cat2.citations);
  });
});
