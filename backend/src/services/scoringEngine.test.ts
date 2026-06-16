import { describe, it, expect } from 'vitest';
import { computeScore } from './scoringEngine';

// Build empty submission — all arrays empty, nullable relations null.
// Tests override specific category arrays.
function emptySubmission(overrides: Record<string, any> = {}): any {
  return {
    cat1Courses: [],
    cat1Projects: [],
    cat1EContent: [],
    cat1ICT: [],
    cat2Journals: [],
    cat2Conferences: [],
    cat2BookChapters: [],
    cat2Books: [],
    cat2Citations: null,
    cat2Patents: [],
    cat2Projects: [],
    cat2Consultancy: [],
    cat2Guidance: [],
    cat2ResearchGroups: [],
    cat2Linkages: [],
    cat2Startups: [],
    cat3AdvQual: null,
    cat3Organised: [],
    cat3ResourcePerson: [],
    cat3Editorial: [],
    cat3Training: [],
    cat3IntlTravel: [],
    cat4AdminResp: [],
    cat4StudentAct: [],
    cat5Memberships: [],
    cat5Awards: [],
    cat5Differentiators: [],
    cat5Internships: [],
    ...overrides,
  };
}

describe('computeScore — empty submission', () => {
  it('returns all zeros', () => {
    const s = computeScore(emptySubmission());
    expect(s.cat1.total).toBe(0);
    expect(s.cat2.total).toBe(0);
    expect(s.cat3.total).toBe(0);
    expect(s.cat4.total).toBe(0);
    expect(s.cat5.total).toBe(0);
    expect(s.selfTotal).toBe(0);
  });
});

describe('Category 1 — Teaching', () => {
  it('lectures: >=96% periods conducted → 10 base, +5 novelty', () => {
    const s = computeScore(emptySubmission({
      cat1Courses: [{
        periodsConducted: 96, periodPlanned: 100, novelPedagogyUsed: true,
        avgAttendance: 0, feedbackScore: 0, passPercentage: 0,
      }],
    }));
    expect(s.cat1.lectures).toBe(15); // 10 + 5
  });

  it('lectures: tiered base — 90% → 8, 80% → 6, below → 4', () => {
    const mk = (pct: number) => computeScore(emptySubmission({
      cat1Courses: [{ periodsConducted: pct, periodPlanned: 100, novelPedagogyUsed: false, avgAttendance: 0, feedbackScore: 0, passPercentage: 0 }],
    })).cat1.lectures;
    expect(mk(90)).toBe(8);
    expect(mk(80)).toBe(6);
    expect(mk(50)).toBe(4);
  });

  it('lectures capped at 40', () => {
    const courses = Array.from({ length: 10 }, () => ({
      periodsConducted: 100, periodPlanned: 100, novelPedagogyUsed: true,
      avgAttendance: 0, feedbackScore: 0, passPercentage: 0,
    }));
    expect(computeScore(emptySubmission({ cat1Courses: courses })).cat1.lectures).toBe(40);
  });

  it('attendance/feedback per-course capped at 20', () => {
    const s = computeScore(emptySubmission({
      cat1Courses: [{
        periodsConducted: 0, periodPlanned: 100, novelPedagogyUsed: false,
        avgAttendance: 100, feedbackScore: 50, passPercentage: 100, // A=5 + B=50 + C=10 = 65, cap 20
      }],
    }));
    expect(s.cat1.attendanceFeedback).toBe(20);
  });

  it('projects: BTECH MINI = 2/count, MTECH MAJOR = 5/count', () => {
    const s = computeScore(emptySubmission({
      cat1Projects: [
        { course: 'BTECH', projectType: 'MINI', count: 3 },  // 6
        { course: 'MTECH', projectType: 'MAJOR', count: 2 }, // 10
      ],
    }));
    expect(s.cat1.projects).toBe(16);
  });

  it('eContent +2 each capped 5; ICT +2 each capped 5', () => {
    const s = computeScore(emptySubmission({
      cat1EContent: [{}, {}, {}],  // 6 → cap 5
      cat1ICT: [{}, {}, {}],       // 6 → cap 5
    }));
    expect(s.cat1.eContent).toBe(5);
    expect(s.cat1.ict).toBe(5);
  });
});

describe('Category 2 — Research', () => {
  it('SCI/WOS/Scopus journal = 15 each', () => {
    const s = computeScore(emptySubmission({
      cat2Journals: [{ indexed: 'SCI' }, { indexed: 'SCOPUS' }],
    }));
    expect(s.cat2.publications).toBe(30);
  });

  it('publications capped at 60', () => {
    const journals = Array.from({ length: 10 }, () => ({ indexed: 'SCI' }));
    expect(computeScore(emptySubmission({ cat2Journals: journals })).cat2.publications).toBe(60);
  });

  it('citations tiered: >=101 → 5, >=51 → 3, >=11 → 2, >=3 → 1', () => {
    const mk = (scopus: number, wos: number) => computeScore(emptySubmission({
      cat2Citations: { scopusCount: scopus, wosCount: wos },
    })).cat2.citations;
    expect(mk(101, 0)).toBe(5);
    expect(mk(50, 1)).toBe(3);
    expect(mk(11, 0)).toBe(2);
    expect(mk(3, 0)).toBe(1);
    expect(mk(2, 0)).toBe(0);
  });

  it('patents: granted=10, published=5, capped 20', () => {
    const s = computeScore(emptySubmission({
      cat2Patents: [{ status: 'GRANTED' }, { status: 'PUBLISHED' }, { status: 'FILED' }],
    }));
    expect(s.cat2.patents).toBe(15);
  });

  it('sponsored projects: ongoing=20 max (not additive)', () => {
    const s = computeScore(emptySubmission({
      cat2Projects: [{ status: 'ONGOING' }, { status: 'ONGOING' }],
    }));
    expect(s.cat2.sponsoredProjects).toBe(20);
  });
});

describe('Category 4 — Governance', () => {
  it('admin resp +10 capped 40, student act +5 capped 10', () => {
    const s = computeScore(emptySubmission({
      cat4AdminResp: [{}, {}, {}, {}, {}], // 50 → cap 40
      cat4StudentAct: [{}, {}, {}],        // 15 → cap 10
    }));
    expect(s.cat4.adminResp).toBe(40);
    expect(s.cat4.studentActivities).toBe(10);
    expect(s.cat4.total).toBe(50);
  });
});

describe('Category 5 — Supplementary', () => {
  it('memberships: international=10, national=5, capped 15', () => {
    const s = computeScore(emptySubmission({
      cat5Memberships: [{ status: 'international_member' }, { status: 'national_member' }],
    }));
    expect(s.cat5.memberships).toBe(15);
  });

  it('differentiators: initiating=10, leading=7, participating=3', () => {
    const s = computeScore(emptySubmission({
      cat5Differentiators: [{ role: 'initiating' }, { role: 'participating' }],
    }));
    expect(s.cat5.differentiators).toBe(13);
  });
});

describe('selfTotal', () => {
  it('sums cat1-5 totals', () => {
    const s = computeScore(emptySubmission({
      cat1Courses: [{ periodsConducted: 100, periodPlanned: 100, novelPedagogyUsed: false, avgAttendance: 0, feedbackScore: 0, passPercentage: 0 }], // lectures 10
      cat5Memberships: [{ status: 'national_member' }], // 5
    }));
    expect(s.selfTotal).toBe(s.cat1.total + s.cat2.total + s.cat3.total + s.cat4.total + s.cat5.total);
    expect(s.selfTotal).toBe(15);
  });

  it('never exceeds 500 (cat max sum)', () => {
    // Saturate all categories
    const huge = Array.from({ length: 50 }, () => ({}));
    const s = computeScore(emptySubmission({
      cat1Courses: Array.from({ length: 50 }, () => ({ periodsConducted: 100, periodPlanned: 100, novelPedagogyUsed: true, avgAttendance: 100, feedbackScore: 50, passPercentage: 100 })),
      cat1Projects: huge.map(() => ({ course: 'MTECH', projectType: 'MAJOR', count: 10 })),
      cat1EContent: huge, cat1ICT: huge,
      cat2Journals: huge.map(() => ({ indexed: 'SCI' })),
      cat4AdminResp: huge, cat4StudentAct: huge,
      cat5Memberships: huge.map(() => ({ status: 'international_member' })),
    }));
    expect(s.cat1.total).toBeLessThanOrEqual(150);
    expect(s.cat2.total).toBeLessThanOrEqual(150);
    expect(s.cat4.total).toBeLessThanOrEqual(50);
    expect(s.cat5.total).toBeLessThanOrEqual(50);
    expect(s.selfTotal).toBeLessThanOrEqual(500);
  });
});
