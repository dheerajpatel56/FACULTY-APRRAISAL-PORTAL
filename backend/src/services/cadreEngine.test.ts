import { describe, it, expect } from 'vitest';
import { Cadre } from '@prisma/client';
import { deriveCadre, computeExperienceYears, pickCadreTarget, checkEligibility, type CadreTargetRow } from './cadreEngine';
import type { CriteriaActuals } from './trackingEngine';

const targets: CadreTargetRow[] = [
  { cadre: Cadre.ASSISTANT_PROFESSOR, minExpYears: 0, maxExpYears: 3, totalScoreTarget: 325, feedbackTarget: 3.5, indexedCount: 2, minJournal: 0, quartileSet: null, ppcRule: 'DESIRABLE', ppcCount: 1 },
  { cadre: Cadre.ASSISTANT_PROFESSOR, minExpYears: 3, maxExpYears: null, totalScoreTarget: 350, feedbackTarget: 3.5, indexedCount: 2, minJournal: 1, quartileSet: null, ppcRule: 'DESIRABLE', ppcCount: 1 },
  { cadre: Cadre.ASSOCIATE_PROFESSOR, minExpYears: 0, maxExpYears: null, totalScoreTarget: 375, feedbackTarget: 3.5, indexedCount: 3, minJournal: 2, quartileSet: 'Q1-Q4', ppcRule: 'MANDATORY', ppcCount: 2 },
];

const mkActuals = (o: Partial<CriteriaActuals>): CriteriaActuals => ({
  totalScore: 0, totalScoreSource: 'HOD', feedback: 0, indexedCount: 0, journalCount: 0,
  patentCount: 0, projectCount: 0, consultancyCount: 0, ...o,
});

describe('deriveCadre', () => {
  it('maps designation variants', () => {
    expect(deriveCadre('Assistant Professor')).toBe(Cadre.ASSISTANT_PROFESSOR);
    expect(deriveCadre('Sr. Assistant Professor')).toBe(Cadre.SR_ASSISTANT_PROFESSOR);
    expect(deriveCadre('Senior Assistant Professor')).toBe(Cadre.SR_ASSISTANT_PROFESSOR);
    expect(deriveCadre('Associate Professor')).toBe(Cadre.ASSOCIATE_PROFESSOR);
    expect(deriveCadre('Professor')).toBe(Cadre.PROFESSOR);
    expect(deriveCadre('')).toBeNull();
  });
});

describe('computeExperienceYears', () => {
  it('computes years from DOJ', () => {
    const ref = new Date('2026-07-01');
    expect(Math.round(computeExperienceYears('2020-07-01', ref))).toBe(6);
    expect(computeExperienceYears(null, ref)).toBe(0);
  });
});

describe('pickCadreTarget', () => {
  it('picks the exp band for Assistant Professor', () => {
    expect(pickCadreTarget(targets, Cadre.ASSISTANT_PROFESSOR, 1)?.totalScoreTarget).toBe(325);
    expect(pickCadreTarget(targets, Cadre.ASSISTANT_PROFESSOR, 5)?.totalScoreTarget).toBe(350);
  });
  it('returns null when no band matches', () => {
    expect(pickCadreTarget(targets, Cadre.PROFESSOR, 2)).toBeNull();
  });
});

describe('checkEligibility', () => {
  it('desirable PPC never blocks (Assistant Professor)', () => {
    const target = pickCadreTarget(targets, Cadre.ASSISTANT_PROFESSOR, 1)!;
    const r = checkEligibility(mkActuals({ totalScore: 330, feedback: 3.6, indexedCount: 2, journalCount: 0 }), target);
    expect(r.eligible).toBe(true); // ppc 0 but desirable
  });

  it('mandatory PPC blocks when unmet (Associate Professor)', () => {
    const target = pickCadreTarget(targets, Cadre.ASSOCIATE_PROFESSOR, 4)!;
    const base = { totalScore: 380, feedback: 3.6, indexedCount: 3, journalCount: 2 };
    expect(checkEligibility(mkActuals({ ...base, patentCount: 1 }), target).eligible).toBe(false); // 1 PPC < 2
    expect(checkEligibility(mkActuals({ ...base, patentCount: 1, projectCount: 1 }), target).eligible).toBe(true); // 2 PPC
  });

  it('fails when a core requirement is unmet', () => {
    const target = pickCadreTarget(targets, Cadre.ASSOCIATE_PROFESSOR, 4)!;
    const r = checkEligibility(mkActuals({ totalScore: 300, feedback: 3.6, indexedCount: 3, journalCount: 2, patentCount: 1, projectCount: 1 }), target);
    expect(r.eligible).toBe(false);
    expect(r.requirements.find((x) => x.key === 'totalScore')?.met).toBe(false);
  });

  it('quartile is informational (non-gating)', () => {
    const target = pickCadreTarget(targets, Cadre.ASSOCIATE_PROFESSOR, 4)!;
    const r = checkEligibility(mkActuals({ totalScore: 380, feedback: 3.6, indexedCount: 3, journalCount: 2, patentCount: 1, projectCount: 1 }), target);
    expect(r.requirements.find((x) => x.key === 'quartile')?.gating).toBe(false);
    expect(r.eligible).toBe(true);
  });

  it('no target -> not eligible', () => {
    expect(checkEligibility(mkActuals({}), null).eligible).toBe(false);
  });
});
