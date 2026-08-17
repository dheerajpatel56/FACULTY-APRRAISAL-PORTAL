// Pure, framework-agnostic port of the backend scoring engine
// (backend/src/services/scoringEngine.ts). Computes the same ScoreBreakdown
// from in-memory react-hook-form values so the UI can show live per-subsection
// scores without a server round-trip.
//
// IMPORTANT: this module must stay in lockstep with the backend engine.
// The backend is the source of truth — if the two ever disagree, fix THIS
// file to match the backend, never the other way around. See
// scoring.test.ts (frontend) and scoringEngine.parity.test.ts (backend),
// which both assert against the same shared fixture
// (docs/superpowers/plans/scoring-fixture.json).
//
// This module does NOT import @prisma/client and must tolerate partial /
// missing form state (arrays default to [], objects to a safe default) — the
// live form may not yet have every relation populated (e.g. cat2ConfBookChapters
// and the cat3AdvQual.postDoc/pgDegree/pgDiploma flags are wired into the form
// UI in a later task). Never throw on partial input.

export type PublicationIndex = 'ESCI' | 'WOS' | 'SCOPUS' | 'ICI' | 'NONE';
export type Scope = 'INTERNATIONAL' | 'NATIONAL';
export type PatentStatus = 'FILED' | 'PUBLISHED' | 'GRANTED';
export type ProjectStatus = 'APPLIED' | 'ONGOING' | 'COMPLETED';
export type CourseLevel = 'BTECH' | 'MTECH';
export type ProjectType = 'MINI' | 'MAJOR';
export type MembershipStatus = 'national_member' | 'international_member' | 'national_executive' | 'life_member';
export type DifferentiatorRole = 'participating' | 'leading' | 'initiating';
// Award level is free-text on the backend model (String, not an enum) — only
// 'state' is special-cased by the scoring rule. Keep it as `string` to match.
export type AwardLevel = string;

export interface Cat1CourseInput {
  periodPlanned?: number;
  periodsConducted?: number;
  novelPedagogyUsed?: boolean;
}

export interface Cat1CourseResultInput {
  classSize?: number;
  attnGte75?: number;
  attnLt75Gte65?: number;
  feedbackReceived?: number;
  gradeOAPlus?: number;
  gradeAB?: number;
  gradeCD?: number;
}

export interface Cat1ProjectInput {
  course?: CourseLevel;
  projectType?: ProjectType;
  count?: number;
}

export interface Cat2JournalInput {
  indexed?: PublicationIndex;
}

export interface Cat2ConferenceInput {
  indexed?: PublicationIndex;
}

export interface Cat2ConfBookChapterInput {
  indexed?: PublicationIndex;
}

export interface Cat2BookChapterInput {
  scope?: Scope;
  isEdited?: boolean;
}

export interface Cat2BookInput {
  scope?: Scope;
  isEdited?: boolean;
}

export interface Cat2CitationsInput {
  totalCitations?: number;
}

export interface Cat2PatentInput {
  status?: PatentStatus;
}

export interface Cat2ProjectInput {
  status?: ProjectStatus;
}

export interface Cat2ConsultancyInput {
  amountLakhs?: number;
}

export interface Cat2GuidanceInput {
  isGuide?: boolean;
}

export interface Cat3AdvQualInput {
  registeredForPhD?: boolean;
  clearedPrePhD?: boolean;
  thesisSubmitted?: boolean;
  awarded?: boolean;
  postDoc?: boolean;
  pgDegree?: boolean;
  pgDiploma?: boolean;
}

export interface Cat3TrainingInput {
  durationDays?: number;
}

export interface Cat5MembershipInput {
  status?: MembershipStatus | string;
}

export interface Cat5AwardInput {
  level?: AwardLevel;
}

export interface Cat5DifferentiatorInput {
  role?: DifferentiatorRole | string;
}

// The form's live values object. Every relation is optional/possibly-missing —
// the form may not have loaded/wired every section yet.
export interface ScoreFormValues {
  cat1Courses?: Cat1CourseInput[];
  cat1CourseResults?: Cat1CourseResultInput[];
  cat1Projects?: Cat1ProjectInput[];
  cat1EContent?: unknown[];
  cat1ICT?: unknown[];

  cat2Journals?: Cat2JournalInput[];
  cat2Conferences?: Cat2ConferenceInput[];
  cat2ConfBookChapters?: Cat2ConfBookChapterInput[];
  cat2BookChapters?: Cat2BookChapterInput[];
  cat2Books?: Cat2BookInput[];
  cat2Citations?: Cat2CitationsInput | null;
  cat2Patents?: Cat2PatentInput[];
  cat2Projects?: Cat2ProjectInput[];
  cat2Consultancy?: Cat2ConsultancyInput[];
  cat2Guidance?: Cat2GuidanceInput[];
  cat2ResearchGroups?: unknown[];
  cat2Linkages?: unknown[];
  cat2Startups?: unknown[];
  cat2IndustryLinkages?: unknown[];

  cat3AdvQual?: Cat3AdvQualInput | null;
  cat3Organised?: unknown[];
  // Retained on the form but intentionally not scored (matches backend).
  cat3ConferencesAttended?: unknown[];
  cat3ResourcePerson?: unknown[];
  cat3Editorial?: unknown[];
  cat3Training?: Cat3TrainingInput[];
  cat3IntlTravel?: unknown[];

  cat4AdminResp?: unknown[];
  cat4StudentAct?: unknown[];

  cat5Memberships?: Cat5MembershipInput[];
  cat5Awards?: Cat5AwardInput[];
  cat5Differentiators?: Cat5DifferentiatorInput[];
  cat5Internships?: unknown[];
}

export interface ScoreBreakdown {
  cat1: {
    lectures: number;
    attendanceFeedback: number;
    projects: number;
    eContent: number;
    ict: number;
    total: number;
  };
  cat2: {
    publications: number;
    citations: number;
    books: number;
    patents: number;
    sponsoredProjects: number;
    consultancy: number;
    guidance: number;
    researchGroups: number;
    linkages: number;
    industryLinkages: number;
    startups: number;
    total: number;
  };
  cat3: {
    advQual: number;
    organisedPrograms: number;
    conferencesAttended: number;
    resourcePerson: number;
    editorial: number;
    training: number;
    intlTravel: number;
    total: number;
  };
  cat4: {
    adminResp: number;
    studentActivities: number;
    total: number;
  };
  cat5: {
    memberships: number;
    awards: number;
    differentiators: number;
    internships: number;
    total: number;
  };
  selfTotal: number;
}

// --- defensive helpers -------------------------------------------------
// Arrays and objects on the live form may be missing/undefined mid-edit —
// never throw, just treat as empty/absent.

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// Coerce to a finite number, defaulting missing/blank/NaN values to 0
// (react-hook-form number inputs left blank surface as NaN/undefined).
function n(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

const QUALITY_JOURNAL: PublicationIndex[] = ['WOS', 'SCOPUS'];
const OTHER_INDEXED: PublicationIndex[] = ['ESCI', 'ICI'];
const isIndexed = (i: PublicationIndex | undefined) =>
  !!i && (QUALITY_JOURNAL.includes(i) || OTHER_INDEXED.includes(i));

function scoreCategory1(v: ScoreFormValues) {
  // 1.1 Lectures (max 40)
  let lectures = 0;
  for (const c of arr<Cat1CourseInput>(v.cat1Courses)) {
    const periodPlanned = n(c?.periodPlanned);
    const periodsConducted = n(c?.periodsConducted);
    const pct = (periodsConducted / periodPlanned) * 100;
    const base = pct >= 96 ? 10 : pct >= 90 ? 8 : pct >= 80 ? 6 : 4;
    const novelty = c?.novelPedagogyUsed ? 5 : 0;
    lectures += base + novelty;
  }
  lectures = Math.min(lectures, 40);

  // 1.2 Attendance / Feedback / Results (per course max 20, section max 80)
  let attendanceFeedback = 0;
  for (const c of arr<Cat1CourseResultInput>(v.cat1CourseResults)) {
    const classSize = n(c?.classSize);
    if (classSize <= 0) continue;
    const attnGte75 = n(c?.attnGte75);
    const attnLt75Gte65 = n(c?.attnLt75Gte65);
    const feedbackReceived = n(c?.feedbackReceived);
    const gradeOAPlus = n(c?.gradeOAPlus);
    const gradeAB = n(c?.gradeAB);
    const gradeCD = n(c?.gradeCD);
    const A = Math.min((attnGte75 * 5 + attnLt75Gte65 * 3) / classSize, 5);
    const B = Math.min(feedbackReceived, 5);
    const C = Math.min((gradeOAPlus * 10 + gradeAB * 8 + gradeCD * 5) / classSize, 10);
    attendanceFeedback += Math.min(A + B + C, 20);
  }
  attendanceFeedback = Math.min(attendanceFeedback, 80);

  // 1.3 Projects (max 20)
  let projects = 0;
  for (const p of arr<Cat1ProjectInput>(v.cat1Projects)) {
    const count = n(p?.count);
    if (p?.course === 'BTECH' && p?.projectType === 'MINI') projects += 2 * count;
    else if (p?.course === 'BTECH' && p?.projectType === 'MAJOR') projects += 5 * count;
    else if (p?.course === 'MTECH' && p?.projectType === 'MINI') projects += 3 * count;
    else if (p?.course === 'MTECH' && p?.projectType === 'MAJOR') projects += 5 * count;
  }
  projects = Math.min(projects, 20);

  // 1.4 e-Content (max 5)
  const eContent = Math.min(arr(v.cat1EContent).length * 2, 5);

  // 1.5 ICT (max 5)
  const ict = Math.min(arr(v.cat1ICT).length * 2, 5);

  const total = Math.min(lectures + attendanceFeedback + projects + eContent + ict, 150);
  return { lectures, attendanceFeedback, projects, eContent, ict, total };
}

function scoreCategory2(v: ScoreFormValues) {
  // 2.1 Publications (max 60) — see backend scoringEngine.ts for the PDF rule.
  let publications = 0;
  for (const j of arr<Cat2JournalInput>(v.cat2Journals)) {
    const ix = j?.indexed;
    publications += ix && QUALITY_JOURNAL.includes(ix) ? 15 : ix && OTHER_INDEXED.includes(ix) ? 10 : 0;
  }
  for (const c of arr<Cat2ConferenceInput>(v.cat2Conferences)) {
    publications += isIndexed(c?.indexed) ? 10 : 0;
  }
  for (const x of arr<Cat2ConfBookChapterInput>(v.cat2ConfBookChapters)) {
    publications += isIndexed(x?.indexed) ? 10 : 0;
  }
  publications = Math.min(publications, 60);

  // 2.2 Citations (max 5) — from total citations
  let citations = 0;
  if (v.cat2Citations) {
    const tc = n(v.cat2Citations.totalCitations);
    citations = tc > 100 ? 5 : tc >= 51 ? 3 : tc >= 11 ? 2 : tc >= 3 ? 1 : 0;
  }

  // 2.3 Books & Chapters (max 10) — scope x role matrix.
  const bookRowScore = (scope: Scope | undefined, isEdited: boolean): number => {
    if (scope === 'NATIONAL') return isEdited ? 3 : 5;
    return isEdited ? 5 : 10; // INTERNATIONAL (default)
  };
  let books = 0;
  for (const b of arr<Cat2BookInput>(v.cat2Books)) books += bookRowScore(b?.scope, !!b?.isEdited);
  for (const bc of arr<Cat2BookChapterInput>(v.cat2BookChapters)) books += bookRowScore(bc?.scope, !!bc?.isEdited);
  books = Math.min(books, 10);

  // 2.4 Patents / IPR (max 20) — Granted 10, Published 5; a merely Filed
  // patent carries no score.
  let patents = 0;
  for (const p of arr<Cat2PatentInput>(v.cat2Patents)) {
    if (p?.status === 'GRANTED') patents += 10;
    else if (p?.status === 'PUBLISHED') patents += 5;
  }
  patents = Math.min(patents, 20);

  // 2.5 Sponsored Projects (max 20) — Ongoing 20, Applied 5
  let sponsoredProjects = 0;
  for (const p of arr<Cat2ProjectInput>(v.cat2Projects)) {
    if (p?.status === 'ONGOING') sponsoredProjects = Math.max(sponsoredProjects, 20);
    else if (p?.status === 'APPLIED') sponsoredProjects = Math.max(sponsoredProjects, 5);
  }
  sponsoredProjects = Math.min(sponsoredProjects, 20);

  // 2.6 Consultancy (max 10)
  let consultancy = 0;
  for (const c of arr<Cat2ConsultancyInput>(v.cat2Consultancy)) {
    const a = n(c?.amountLakhs);
    consultancy += a >= 10 ? 10 : a >= 5 ? 8 : a >= 2 ? 6 : a >= 1 ? 4 : 2;
  }
  consultancy = Math.min(consultancy, 10);

  // 2.7 Research Guidance (max 5) — Guide 5, Co-Guide 3
  let guidance = 0;
  for (const g of arr<Cat2GuidanceInput>(v.cat2Guidance)) {
    guidance += g?.isGuide ? 5 : 3;
  }
  guidance = Math.min(guidance, 5);

  // 2.8 Research Groups (max 5)
  const researchGroups = arr(v.cat2ResearchGroups).length > 0 ? 5 : 0;

  // 2.9 Linkages — institutes (max 10)
  const linkages = Math.min(arr(v.cat2Linkages).length * 5, 10);

  // 2.10 Industry linkage (max 10)
  const industryLinkages = Math.min(arr(v.cat2IndustryLinkages).length * 5, 10);

  // Startups — retained extra bucket (max 5)
  const startups = Math.min(arr(v.cat2Startups).length * 5, 5);

  const total = Math.min(
    publications + citations + books + patents + sponsoredProjects +
    consultancy + guidance + researchGroups + linkages + industryLinkages + startups,
    150
  );
  return { publications, citations, books, patents, sponsoredProjects, consultancy, guidance, researchGroups, linkages, industryLinkages, startups, total };
}

function scoreCategory3(v: ScoreFormValues) {
  // 3.1 Status of Ph.D. / advanced qualification (max 10) — take highest applicable
  let advQual = 0;
  const q = v.cat3AdvQual;
  if (q) {
    if (q.postDoc) advQual = 10;
    else if (q.awarded) advQual = 10;
    else if (q.thesisSubmitted) advQual = 10;
    else if (q.pgDegree) advQual = 10;
    else if (q.pgDiploma) advQual = 10;
    else if (q.clearedPrePhD) advQual = 8;
    else if (q.registeredForPhD) advQual = 5;
  }
  advQual = Math.min(advQual, 10);

  // 3.2 Organised Programs (max 20)
  const organisedPrograms = Math.min(arr(v.cat3Organised).length * 10, 20);

  // 3.3 Conferences / Seminars / Workshops Attended (max 20, 10 each)
  const conferencesAttended = Math.min(arr(v.cat3ConferencesAttended).length * 10, 20);

  // 3.3 Resource Person (max 20, 10 each)
  const resourcePerson = Math.min(arr(v.cat3ResourcePerson).length * 10, 20);

  // 3.4 Editorial (max 20, 10 each)
  const editorial = Math.min(arr(v.cat3Editorial).length * 10, 20);

  // 3.5 Training (max 25) — >=5 days → 10, <5 days → 5
  let training = 0;
  for (const t of arr<Cat3TrainingInput>(v.cat3Training)) {
    const durationDays = n(t?.durationDays);
    if (durationDays >= 5) training += 10;
    else training += 5;
  }
  training = Math.min(training, 25);

  // 3.6 International Travel (max 5)
  const intlTravel = Math.min(arr(v.cat3IntlTravel).length * 5, 5);

  const total = Math.min(
    advQual + organisedPrograms + conferencesAttended + resourcePerson + editorial + training + intlTravel,
    100
  );
  return { advQual, organisedPrograms, conferencesAttended, resourcePerson, editorial, training, intlTravel, total };
}

function scoreCategory4(v: ScoreFormValues) {
  const adminResp = Math.min(arr(v.cat4AdminResp).length * 10, 40);
  const studentActivities = Math.min(arr(v.cat4StudentAct).length * 5, 10);
  const total = Math.min(adminResp + studentActivities, 50);
  return { adminResp, studentActivities, total };
}

function scoreCategory5(v: ScoreFormValues) {
  // 5.1 Memberships (max 15)
  let memberships = 0;
  for (const m of arr<Cat5MembershipInput>(v.cat5Memberships)) {
    if (m?.status === 'national_member') memberships += 5;
    else if (m?.status === 'international_member' || m?.status === 'national_executive' || m?.status === 'life_member') memberships += 10;
  }
  memberships = Math.min(memberships, 15);

  // 5.2 Awards (max 10) — state = 5, national/international = 10
  let awards = 0;
  for (const a of arr<Cat5AwardInput>(v.cat5Awards)) {
    awards += a?.level === 'state' ? 5 : 10;
  }
  awards = Math.min(awards, 10);

  // 5.3 Differentiators (max 20)
  let differentiators = 0;
  for (const d of arr<Cat5DifferentiatorInput>(v.cat5Differentiators)) {
    if (d?.role === 'participating') differentiators += 3;
    else if (d?.role === 'leading') differentiators += 7;
    else if (d?.role === 'initiating') differentiators += 10;
  }
  differentiators = Math.min(differentiators, 20);

  // 5.4 Internships (max 5)
  const internships = Math.min(arr(v.cat5Internships).length * 5, 5);

  const total = Math.min(memberships + awards + differentiators + internships, 50);
  return { memberships, awards, differentiators, internships, total };
}

// Pure: computes the ScoreBreakdown from in-memory form values. Tolerates
// undefined/null/partial input — always returns a well-formed breakdown.
export function computeScore(values: ScoreFormValues | null | undefined): ScoreBreakdown {
  const v = values ?? {};
  const cat1 = scoreCategory1(v);
  const cat2 = scoreCategory2(v);
  const cat3 = scoreCategory3(v);
  const cat4 = scoreCategory4(v);
  const cat5 = scoreCategory5(v);
  const selfTotal = cat1.total + cat2.total + cat3.total + cat4.total + cat5.total;

  return { cat1, cat2, cat3, cat4, cat5, selfTotal };
}
