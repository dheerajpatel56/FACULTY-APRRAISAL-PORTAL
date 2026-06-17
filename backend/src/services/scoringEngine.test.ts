import { describe, it, expect } from 'vitest';
import { computeScore } from './scoringEngine';

// Build empty submission — all arrays empty, nullable relations null.
// Tests override specific category arrays.
function emptySubmission(overrides: Record<string, any> = {}): any {
  return {
    cat1Courses: [],
    cat1CourseResults: [],
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
    cat2IndustryLinkages: [],
    cat3AdvQual: null,
    cat3Organised: [],
    cat3ConferencesAttended: [],
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
      }],
    }));
    expect(s.cat1.lectures).toBe(15); // 10 + 5
  });

  it('lectures: tiered base — 90% → 8, 80% → 6, below → 4', () => {
    const mk = (pct: number) => computeScore(emptySubmission({
      cat1Courses: [{ periodsConducted: pct, periodPlanned: 100, novelPedagogyUsed: false }],
    })).cat1.lectures;
    expect(mk(90)).toBe(8);
    expect(mk(80)).toBe(6);
    expect(mk(50)).toBe(4);
  });

  it('lectures capped at 50', () => {
    const courses = Array.from({ length: 10 }, () => ({
      periodsConducted: 100, periodPlanned: 100, novelPedagogyUsed: true,
    }));
    expect(computeScore(emptySubmission({ cat1Courses: courses })).cat1.lectures).toBe(50);
  });

  it('1.2 attendance/feedback/results: A+B+C computed from raw counts', () => {
    // Y=70, n1=65, n2=5 → A=(325+15)/70=4.857; B=4.7; n3=40,n4=28,n5=2 → C=(400+224+10)/70=9.057
    const s = computeScore(emptySubmission({
      cat1CourseResults: [{
        classSize: 70, attnGte75: 65, attnLt75Gte65: 5, feedbackReceived: 4.7,
        gradeOAPlus: 40, gradeAB: 28, gradeCD: 2,
      }],
    }));
    expect(s.cat1.attendanceFeedback).toBeCloseTo(18.61, 1);
  });

  it('1.2 per-course total capped at 20; section capped at 80', () => {
    const maxed = {
      classSize: 10, attnGte75: 10, attnLt75Gte65: 0, feedbackReceived: 5,
      gradeOAPlus: 10, gradeAB: 0, gradeCD: 0, // A=5 + B=5 + C=10 = 20
    };
    expect(computeScore(emptySubmission({ cat1CourseResults: [maxed] })).cat1.attendanceFeedback).toBe(20);
    const five = Array.from({ length: 5 }, () => maxed); // 5*20 = 100, cap 80
    expect(computeScore(emptySubmission({ cat1CourseResults: five })).cat1.attendanceFeedback).toBe(80);
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
  it('indexed journal/conf = 15, non-indexed = 5', () => {
    const s = computeScore(emptySubmission({
      cat2Journals: [{ indexed: 'ESCI' }, { indexed: 'SCOPUS' }, { indexed: 'NONE' }],
      cat2Conferences: [{ indexed: 'ICI' }, { indexed: 'NONE' }],
    }));
    // 15 + 15 + 5 + 15 + 5 = 55, capped 50
    expect(s.cat2.publications).toBe(50);
  });

  it('publications capped at 50', () => {
    const journals = Array.from({ length: 10 }, () => ({ indexed: 'ESCI' }));
    expect(computeScore(emptySubmission({ cat2Journals: journals })).cat2.publications).toBe(50);
  });

  it('citations from totalCitations: >40→10, 21-40→8, 11-20→5, 3-10→2', () => {
    const mk = (totalCitations: number) => computeScore(emptySubmission({
      cat2Citations: { totalCitations },
    })).cat2.citations;
    expect(mk(61)).toBe(10);
    expect(mk(30)).toBe(8);
    expect(mk(15)).toBe(5);
    expect(mk(5)).toBe(2);
    expect(mk(2)).toBe(0);
  });

  it('patents: granted/published=10, filed=5, capped 10', () => {
    const s = computeScore(emptySubmission({
      cat2Patents: [{ status: 'GRANTED' }, { status: 'PUBLISHED' }, { status: 'FILED' }],
    }));
    // 10 + 10 + 5 = 25, capped 10
    expect(s.cat2.patents).toBe(10);
  });

  it('guidance: guide=10, co-guide=5, capped 10', () => {
    const s = computeScore(emptySubmission({
      cat2Guidance: [{ isGuide: true }, { isGuide: false }],
    }));
    expect(s.cat2.guidance).toBe(10);
  });

  it('industry linkage: 5 each, capped 10', () => {
    const s = computeScore(emptySubmission({
      cat2IndustryLinkages: [{}, {}, {}],
    }));
    expect(s.cat2.industryLinkages).toBe(10);
  });

  it('sponsored projects: ongoing=20 max (not additive)', () => {
    const s = computeScore(emptySubmission({
      cat2Projects: [{ status: 'ONGOING' }, { status: 'ONGOING' }],
    }));
    expect(s.cat2.sponsoredProjects).toBe(20);
  });
});

describe('Category 3 — Faculty Development', () => {
  it('3.1 PhD status: awarded=10, thesis=8, registered/prePhD=5', () => {
    const mk = (q: any) => computeScore(emptySubmission({ cat3AdvQual: q })).cat3.advQual;
    expect(mk({ awarded: true })).toBe(10);
    expect(mk({ thesisSubmitted: true })).toBe(8);
    expect(mk({ registeredForPhD: true })).toBe(5);
    expect(mk({ clearedPrePhD: true })).toBe(5);
    expect(mk({})).toBe(0);
  });

  it('3.3 attending conferences: 10 each, capped 20', () => {
    const s = computeScore(emptySubmission({ cat3ConferencesAttended: [{}, {}, {}] }));
    expect(s.cat3.conferencesAttended).toBe(20);
  });

  it('3.4 resource person + editorial combined, capped 20', () => {
    const s = computeScore(emptySubmission({
      cat3ResourcePerson: [{}, {}], cat3Editorial: [{}],
    }));
    expect(s.cat3.resourceEditorial).toBe(20); // (2+1)*10 = 30, cap 20
  });

  it('3.5 training: >=5 days→10, <5→5, capped 25', () => {
    const s = computeScore(emptySubmission({
      cat3Training: [{ durationDays: 5 }, { durationDays: 4 }],
    }));
    expect(s.cat3.training).toBe(15); // 10 + 5
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

describe('Category 5 — Supplementary', () => {
  it('5.1 membership: national=5, international/executive=10, capped 15', () => {
    const s = computeScore(emptySubmission({
      cat5Memberships: [
        { status: 'national_member' }, { status: 'international_member' }, { status: 'national_executive' },
      ],
    }));
    expect(s.cat5.memberships).toBe(15); // 5 + 10 + 10 = 25, cap 15
  });

  it('5.2 awards: flat 10 each, capped 10', () => {
    const s = computeScore(emptySubmission({ cat5Awards: [{}, {}] }));
    expect(s.cat5.awards).toBe(10);
  });
});

describe('selfTotal', () => {
  it('sums cat1-5 totals', () => {
    const s = computeScore(emptySubmission({
      cat1Courses: [{ periodsConducted: 100, periodPlanned: 100, novelPedagogyUsed: false }], // lectures 10
      cat5Memberships: [{ status: 'national_member' }], // 5
    }));
    expect(s.selfTotal).toBe(s.cat1.total + s.cat2.total + s.cat3.total + s.cat4.total + s.cat5.total);
    expect(s.selfTotal).toBe(15);
  });

  it('never exceeds 500 (cat max sum)', () => {
    // Saturate all categories
    const huge = Array.from({ length: 50 }, () => ({}));
    const s = computeScore(emptySubmission({
      cat1Courses: Array.from({ length: 50 }, () => ({ periodsConducted: 100, periodPlanned: 100, novelPedagogyUsed: true })),
      cat1CourseResults: Array.from({ length: 50 }, () => ({ classSize: 10, attnGte75: 10, attnLt75Gte65: 0, feedbackReceived: 5, gradeOAPlus: 10, gradeAB: 0, gradeCD: 0 })),
      cat1Projects: huge.map(() => ({ course: 'MTECH', projectType: 'MAJOR', count: 10 })),
      cat1EContent: huge, cat1ICT: huge,
      cat2Journals: huge.map(() => ({ indexed: 'ESCI' })),
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

// End-to-end form-alignment check using the real "V. Baby" FPAS sample.
// Asserts each category total matches the official form's self-appraisal
// (Cat1 = 147: the form's own 1.3 total of 20 is mis-added; by rule = 17).
describe('V. Baby sample — form alignment', () => {
  const sample = emptySubmission({
    // 1.1 — 6 courses, all >=90% engagement + novel pedagogy -> caps 50
    cat1Courses: [
      { periodsConducted: 46, periodPlanned: 48, novelPedagogyUsed: true },
      { periodsConducted: 46, periodPlanned: 48, novelPedagogyUsed: true },
      { periodsConducted: 47, periodPlanned: 48, novelPedagogyUsed: true },
      { periodsConducted: 47, periodPlanned: 48, novelPedagogyUsed: true },
      { periodsConducted: 64, periodPlanned: 64, novelPedagogyUsed: true },
      { periodsConducted: 64, periodPlanned: 64, novelPedagogyUsed: true },
    ],
    // 1.2 — 6 courses, per-course ~18.6-19.2 -> caps 80
    cat1CourseResults: [
      { classSize: 70, attnGte75: 65, attnLt75Gte65: 5, feedbackReceived: 4.7, gradeOAPlus: 40, gradeAB: 28, gradeCD: 2 },
      { classSize: 70, attnGte75: 65, attnLt75Gte65: 5, feedbackReceived: 4.7, gradeOAPlus: 45, gradeAB: 23, gradeCD: 2 },
      { classSize: 70, attnGte75: 65, attnLt75Gte65: 5, feedbackReceived: 4.76, gradeOAPlus: 42, gradeAB: 25, gradeCD: 3 },
      { classSize: 70, attnGte75: 65, attnLt75Gte65: 5, feedbackReceived: 4.6, gradeOAPlus: 45, gradeAB: 22, gradeCD: 3 },
      { classSize: 70, attnGte75: 70, attnLt75Gte65: 0, feedbackReceived: 4.5, gradeOAPlus: 60, gradeAB: 9, gradeCD: 1 },
      { classSize: 70, attnGte75: 70, attnLt75Gte65: 0, feedbackReceived: 4.5, gradeOAPlus: 60, gradeAB: 10, gradeCD: 0 },
    ],
    // 1.3 — BTech Mini 1 (2), BTech Major 2 (10), MTech Major 1 (5) = 17
    cat1Projects: [
      { course: 'BTECH', projectType: 'MINI', count: 1 },
      { course: 'BTECH', projectType: 'MAJOR', count: 2 },
      { course: 'MTECH', projectType: 'MAJOR', count: 1 },
    ],
    // 2.1 — 4 indexed papers -> 60, caps 50
    cat2Journals: [
      { indexed: 'SCOPUS' }, { indexed: 'SCOPUS' }, { indexed: 'SCOPUS' }, { indexed: 'SCOPUS' },
    ],
    // 2.2 — total citations 61 -> 10
    cat2Citations: { totalCitations: 61 },
    // 2.3 — 1 published book chapter -> 10
    cat2BookChapters: [{ isEdited: false }],
    // 2.4 — 1 published patent -> 10
    cat2Patents: [{ status: 'PUBLISHED' }],
    // 2.8 -> 5, 2.9 -> 10, 2.10 -> 10
    cat2ResearchGroups: [{}],
    cat2Linkages: [{}, {}],
    cat2IndustryLinkages: [{}, {}, {}],
    // 3.2 -> 20, 3.3 -> 20, 3.4 (1+1) -> 20, 3.5 (10+5+5+5)=25
    cat3Organised: [{}, {}],
    cat3ConferencesAttended: [{}, {}],
    cat3ResourcePerson: [{}],
    cat3Editorial: [{}],
    cat3Training: [{ durationDays: 30 }, { durationDays: 1 }, { durationDays: 1 }, { durationDays: 1 }],
    // 4.1 -> 40, 4.2 -> 10
    cat4AdminResp: [{}, {}, {}, {}],
    cat4StudentAct: [{}, {}],
    // 5.1 (3 national=15), 5.3 (3+3+7+7=20), 5.4 (2 -> cap 5)
    cat5Memberships: [{ status: 'national_member' }, { status: 'national_member' }, { status: 'national_member' }],
    cat5Differentiators: [{ role: 'participating' }, { role: 'participating' }, { role: 'leading' }, { role: 'leading' }],
    cat5Internships: [{}, {}],
  });

  const s = computeScore(sample);

  it('Category 1 = 147 (50 + 80 + 17)', () => {
    expect(s.cat1.lectures).toBe(50);
    expect(s.cat1.attendanceFeedback).toBe(80);
    expect(s.cat1.projects).toBe(17);
    expect(s.cat1.total).toBe(147);
  });
  it('Category 2 = 105', () => { expect(s.cat2.total).toBe(105); });
  it('Category 3 = 85', () => { expect(s.cat3.total).toBe(85); });
  it('Category 4 = 50', () => { expect(s.cat4.total).toBe(50); });
  it('Category 5 = 40', () => { expect(s.cat5.total).toBe(40); });
  it('self total = 427', () => { expect(s.selfTotal).toBe(427); });
});
