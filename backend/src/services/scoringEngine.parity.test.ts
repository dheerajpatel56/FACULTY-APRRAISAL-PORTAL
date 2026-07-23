import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { computeScore } from './scoringEngine';

// Parity guard between the backend scoring engine (source of truth) and the
// frontend's pure port (frontend/src/utils/scoring.ts). Both sides load the
// SAME fixture and assert against the SAME hand-verified expected breakdown
// (docs/superpowers/plans/scoring-expected.json). If a change to either
// engine causes them to disagree, one of the two `computeScore` functions
// has drifted — the backend engine is authoritative; fix the frontend port.
//
// See frontend/src/utils/scoring.test.ts for the mirrored assertion.

const fixture = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../docs/superpowers/plans/scoring-fixture.json'), 'utf8'),
);
const expected = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../docs/superpowers/plans/scoring-expected.json'), 'utf8'),
);

describe('computeScore — frontend/backend parity fixture', () => {
  it('backend computeScore matches the shared expected breakdown', () => {
    // Cast to `any` — the fixture is plain JSON (Prisma-typed relations aren't
    // needed for computeScore, which only reads scalar fields off each row).
    const result = computeScore(fixture as any);
    expect(result).toEqual(expected);
  });
});
