import { computeScore } from './scoringEngine';

// W3 criteria-tracking engine (pure, like scoringEngine). Computes the 7
// target-table actuals for a faculty submission. Consumed by the tier engine
// (evaluates admin TierRule trees) and the cadre-target eligibility check.
//
// Locked decisions:
//  - totalScore = HoD-reviewed grandTotal (/550) when a review exists,
//    else the self-computed total (/500) as a provisional value.
//  - indexed set = WOS + SCOPUS only (ESCI/ICI score in the appraisal but do
//    not count toward eligibility). No same-dept author dedup (deferred).

export interface CriteriaActuals {
  totalScore: number;
  totalScoreSource: 'HOD' | 'SELF';
  feedback: number;
  indexedCount: number;
  journalCount: number;
  patentCount: number;
  projectCount: number;
  consultancyCount: number;
}

const INDEXED_SET = new Set(['WOS', 'SCOPUS']);
const PATENT_COUNTRIES = new Set(['india', 'us', 'usa', 'united states', 'u.s.', 'u.s.a.']);
const PATENT_TYPES = new Set(['utility', 'process']);
const PATENT_STATUSES = new Set(['PUBLISHED', 'GRANTED']);

const isIndexed = (r: { indexed?: string | null }) => !!r.indexed && INDEXED_SET.has(r.indexed);

// A patent counts toward eligibility only if: country India/US, type
// utility/process, Institute-as-Applicant, and Published or Granted.
function patentCounts(p: any): boolean {
  const country = (p.country ?? '').toString().trim().toLowerCase();
  const type = (p.patentType ?? '').toString().trim().toLowerCase();
  return (
    PATENT_COUNTRIES.has(country) &&
    PATENT_TYPES.has(type) &&
    p.applicantIsInstitute === true &&
    PATENT_STATUSES.has(p.status)
  );
}

export function computeActuals(sub: any, reviewGrandTotal?: number | null): CriteriaActuals {
  const journals = sub.cat2Journals ?? [];
  const conferences = sub.cat2Conferences ?? [];
  const confBookChapters = sub.cat2ConfBookChapters ?? [];
  const patents = sub.cat2Patents ?? [];
  const projects = sub.cat2Projects ?? [];
  const consultancy = sub.cat2Consultancy ?? [];
  const courseResults = sub.cat1CourseResults ?? [];

  const indexedJournals = journals.filter(isIndexed);
  const journalCount = indexedJournals.length;
  const indexedCount = journalCount + conferences.filter(isIndexed).length + confBookChapters.filter(isIndexed).length;

  const fbVals = courseResults.map((c: any) => Number(c.feedbackReceived ?? 0)).filter((n: number) => !Number.isNaN(n));
  const feedback = fbVals.length ? fbVals.reduce((a: number, b: number) => a + b, 0) / fbVals.length : 0;

  let totalScore: number;
  let totalScoreSource: 'HOD' | 'SELF';
  if (reviewGrandTotal != null) {
    totalScore = reviewGrandTotal;
    totalScoreSource = 'HOD';
  } else {
    // Provisional self-total. computeScore needs the full category shape (as
    // loaded from the DB); guard partial inputs.
    totalScore = Array.isArray(sub.cat1Courses) ? computeScore(sub).selfTotal : 0;
    totalScoreSource = 'SELF';
  }

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    totalScoreSource,
    feedback: Math.round(feedback * 100) / 100,
    indexedCount,
    journalCount,
    patentCount: patents.filter(patentCounts).length,
    projectCount: projects.length,
    consultancyCount: consultancy.length,
  };
}
