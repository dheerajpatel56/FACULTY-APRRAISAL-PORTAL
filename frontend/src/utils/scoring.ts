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
  novelPedagogyMethod?: string | null;
}

export interface Cat1CourseResultInput {
  classSize?: number;
  avgAttendancePct?: number;
  feedbackReceived?: number;
  passPercentage?: number;
}

export interface Cat1EContentInput {
  evidenceFile?: string | null;
}

export interface Cat1ICTInput {
  evidenceFile?: string | null;
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
  title?: string | null;
  scope?: Scope;
  isEdited?: boolean;
}

export interface Cat2BookInput {
  title?: string | null;
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
  cat1EContent?: Cat1EContentInput[];
  cat1ICT?: Cat1ICTInput[];

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

/**
 * 2.1 per-row score. Mirror of the backend's publicationRowScore: a journal
 * paper earns 15 only in an SCI/SCIE/WoS or Scopus journal (ESCI and ICI
 * journals 0 — owner decision 2026-09-11); a conference paper or conference
 * book chapter earns 10 for any index.
 */
export type PublicationKind = 'journal' | 'conference' | 'chapter';
export function publicationRowScore(kind: PublicationKind, indexed?: PublicationIndex | string | null): number {
  const ix = indexed ?? 'NONE';
  if (kind === 'journal') return ix === 'WOS' || ix === 'SCOPUS' ? 15 : 0;
  return ix === 'WOS' || ix === 'SCOPUS' || ix === 'ESCI' || ix === 'ICI' ? 10 : 0;
}

/** Display labels for stored index values. SCI / SCIE journals are recorded as WOS. */
export const INDEX_LABEL: Record<string, string> = {
  WOS: 'SCI / SCIE / WoS', SCOPUS: 'Scopus', ESCI: 'ESCI', ICI: 'ICI', NONE: 'Not indexed',
};

/** Number of names in an author list ("A, B and C" -> 3). Display only. */
export function countAuthors(list?: string | null): number {
  return String(list ?? '').split(/[,;&]|\band\b/i).map((s) => s.trim()).filter(Boolean).length;
}

/**
 * 2.3 per-row working. Mirror of the backend's bookRowScore: international
 * publisher author 10 / editor 5, national author 5 / editor 3; an untitled
 * row, or one with no publisher level chosen, scores 0 (owner decision
 * 2026-09-11 — it used to default to International).
 */
export function bookRowScore(r: { title?: string | null; scope?: string | null; isEdited?: boolean | string | null } | null | undefined) {
  if (!String(r?.title ?? '').trim()) return { score: 0, reason: 'Enter the title to score this entry' };
  const scope = r?.scope;
  if (scope !== 'INTERNATIONAL' && scope !== 'NATIONAL') return { score: 0, reason: 'Pick National or International to score this entry' };
  const edited = r?.isEdited === true || r?.isEdited === 'true';
  const score = scope === 'INTERNATIONAL' ? (edited ? 5 : 10) : (edited ? 3 : 5);
  return { score, reason: `${scope === 'INTERNATIONAL' ? 'International' : 'National'} publisher, ${edited ? 'editor' : 'author'}` };
}

/**
 * 2.4 per-row working. Mirror of the backend's patentRowScore: Granted 10,
 * Published 5, Filed 0, for any kind of IPR; an untitled row scores 0.
 */
export function patentRowScore(p: { title?: string | null; status?: string | null } | null | undefined) {
  if (!String(p?.title ?? '').trim()) return { score: 0, reason: 'Enter the title to score this entry' };
  if (p?.status === 'GRANTED') return { score: 10, reason: 'Granted' };
  if (p?.status === 'PUBLISHED') return { score: 5, reason: 'Published' };
  return { score: 0, reason: 'Filed — scores once published (5) or granted (10)' };
}

/** 2.2 score from Scopus / WoS citations. Mirror of the backend's citationScore. */
export function citationScore(totalCitations?: number | null): number {
  const tc = Number(totalCitations);
  if (!Number.isFinite(tc)) return 0;
  return tc > 100 ? 5 : tc >= 51 ? 3 : tc >= 11 ? 2 : tc >= 3 ? 1 : 0;
}

function scoreCategory1(v: ScoreFormValues) {
  // 1.1 Lectures (max 40) — per-course rules in lectureRowScore.
  let lectures = 0;
  for (const c of arr<Cat1CourseInput>(v.cat1Courses)) lectures += lectureRowScore(c).total;
  lectures = Math.min(lectures, 40);

  // 1.2 Attendance / Feedback / Results (per course max 20, section max 80).
  // PDF: A = (avg attendance % / 100) * 5, B = feedback out of 5,
  //      C = (pass % / 100) * 10.
  let attendanceFeedback = 0;
  for (const c of arr<Cat1CourseResultInput>(v.cat1CourseResults)) {
    attendanceFeedback += courseResultScore(c).total;
  }
  attendanceFeedback = Math.min(attendanceFeedback, 80);

  // 1.3 Projects (max 20) — per-row rules in projectRowScore.
  let projects = 0;
  for (const p of arr<Cat1ProjectInput>(v.cat1Projects)) projects += projectRowScore(p).score;
  projects = Math.min(projects, 20);

  // 1.4 e-Content (max 5)
  let eContent = 0;
  for (const e of arr<Cat1EContentInput>(v.cat1EContent)) eContent += eContentRowScore(e).score;
  eContent = Math.min(eContent, 5);

  // 1.5 ICT (max 5)
  let ict = 0;
  for (const i of arr<Cat1ICTInput>(v.cat1ICT)) ict += ictRowScore(i).score;
  ict = Math.min(ict, 5);

  const total = Math.min(lectures + attendanceFeedback + projects + eContent + ict, 150);
  return { lectures, attendanceFeedback, projects, eContent, ict, total };
}

function scoreCategory2(v: ScoreFormValues) {
  // 2.1 Publications (max 60) — see backend scoringEngine.ts for the PDF rule.
  let publications = 0;
  for (const j of arr<Cat2JournalInput>(v.cat2Journals)) publications += publicationRowScore('journal', j?.indexed);
  for (const c of arr<Cat2ConferenceInput>(v.cat2Conferences)) publications += publicationRowScore('conference', c?.indexed);
  for (const x of arr<Cat2ConfBookChapterInput>(v.cat2ConfBookChapters)) publications += publicationRowScore('chapter', x?.indexed);
  publications = Math.min(publications, 60);

  // 2.2 Citations (max 5) — bands in citationScore.
  const citations = citationScore(v.cat2Citations?.totalCitations);

  // 2.3 Books & Chapters (max 10) — per-row rules in bookRowScore.
  let books = 0;
  for (const b of arr<Cat2BookInput>(v.cat2Books)) books += bookRowScore(b as any).score;
  for (const bc of arr<Cat2BookChapterInput>(v.cat2BookChapters)) books += bookRowScore(bc as any).score;
  books = Math.min(books, 10);

  // 2.4 Patents / IPR (max 20) — per-row rules in patentRowScore.
  let patents = 0;
  for (const p of arr<Cat2PatentInput>(v.cat2Patents)) patents += patentRowScore(p as any).score;
  patents = Math.min(patents, 20);

  // 2.5 Sponsored Projects (max 20) — Ongoing 20, Applied 5
  let sponsoredProjects = 0;
  for (const p of arr<Cat2ProjectInput>(v.cat2Projects)) {
    if (p?.status === 'ONGOING') sponsoredProjects = Math.max(sponsoredProjects, 20);
    else if (p?.status === 'APPLIED') sponsoredProjects = Math.max(sponsoredProjects, 5);
  }
  sponsoredProjects = Math.min(sponsoredProjects, 20);

  // 2.6 Consultancy (max 10) — PDF bands: <=1L 2, 1-2L 4, 2-5L 6, 5-10L 8, >10L 10.
  let consultancy = 0;
  for (const c of arr<Cat2ConsultancyInput>(v.cat2Consultancy)) {
    const a = n(c?.amountLakhs);
    // The lowest band presumes a real project; a row with no amount is not one.
    if (!(a > 0)) continue;
    consultancy += a > 10 ? 10 : a >= 5 ? 8 : a >= 2 ? 6 : a >= 1 ? 4 : 2;
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

  // 2.9 Interaction/association with institutes AND industry linkage — ONE
  // subsection in the PDF, 5 per linkage, max 10 shared across both tables.
  const linkages = Math.min((arr(v.cat2Linkages).length + arr(v.cat2IndustryLinkages).length) * 5, 10);

  // 2.10 Initiation/motivation/guidance towards innovation & start-ups (max 5).
  const startups = Math.min(arr(v.cat2Startups).length * 5, 5);

  const total = Math.min(
    publications + citations + books + patents + sponsoredProjects +
    consultancy + guidance + researchGroups + linkages + startups,
    150
  );
  return { publications, citations, books, patents, sponsoredProjects, consultancy, guidance, researchGroups, linkages, startups, total };
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

  // 3.5 Training (max 25) — PDF: >5 days -> 10, a minimum of 5 days -> 5.
  let training = 0;
  for (const t of arr<Cat3TrainingInput>(v.cat3Training)) {
    // PDF: 10 above 5 days, 5 at a minimum of 5 days, nothing below that.
    const days = n(t?.durationDays);
    training += days > 5 ? 10 : days >= 5 ? 5 : 0;
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
    // Only the levels the PDF defines; an unset level scores nothing.
    if (a?.level === 'state') awards += 5;
    else if (a?.level === 'national' || a?.level === 'international') awards += 10;
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
/**
 * 1.2 per-course A/B/C split, exported so screens that show the working (the
 * HoD review page) render the SAME numbers the engines score with instead of
 * re-implementing the formulas. Kept inside this module on purpose — it is
 * covered by the parity fixture through computeScore.
 */
/**
 * 1.1 per-course working (engagement %, engagement score, novelty, row total).
 * Mirror of the backend's lectureRowScore — same rules, see the comment there:
 * % rounded to a whole number before banding; no periods planned or conducted
 * scores 0 for the whole row; a named method counts as novel pedagogy used.
 */
export function lectureRowScore(c: Cat1CourseInput | null | undefined) {
  const planned = n(c?.periodPlanned);
  const conducted = n(c?.periodsConducted);
  if (!(planned > 0) || !(conducted > 0)) return { pct: null as number | null, engagement: 0, novelty: 0, total: 0 };
  const pct = Math.round((conducted / planned) * 100);
  const engagement = pct >= 96 ? 10 : pct >= 90 ? 8 : pct >= 80 ? 6 : 4;
  const used = !!c?.novelPedagogyUsed || !!(c?.novelPedagogyMethod ?? '').trim();
  const novelty = used ? 5 : 0;
  return { pct, engagement, novelty, total: engagement + novelty };
}

/**
 * 1.3 per-row working (rate, whole count, unit, score). Mirror of the
 * backend's projectRowScore: negative/blank counts score 0, fractions are
 * dropped (the database stores an Int).
 */
const PROJECT_RATE: Record<string, number> = { 'BTECH:MINI': 2, 'BTECH:MAJOR': 5, 'MTECH:MINI': 3, 'MTECH:MAJOR': 5 };
export function projectRowScore(p: Cat1ProjectInput | null | undefined) {
  const rate = PROJECT_RATE[`${p?.course}:${p?.projectType}`] ?? 0;
  const raw = n(p?.count);
  const count = raw > 0 ? Math.floor(raw) : 0;
  return { rate, count, unit: p?.course === 'MTECH' ? 'student' : 'batch', score: rate * count };
}

/** Mirror of the backend's isEvidenceLink: an http(s) link with a real host, or a portal upload. */
export function isEvidenceLink(v: unknown): boolean {
  const s = typeof v === 'string' ? v.trim() : '';
  return /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(s) || /^\/uploads\/\S+$/.test(s);
}

/** 1.4 per-row working. Mirror of the backend's eContentRowScore: 2 only with an evidence link. */
export function eContentRowScore(e: Cat1EContentInput | null | undefined) {
  const evidence = isEvidenceLink(e?.evidenceFile);
  return { evidence, score: evidence ? 2 : 0 };
}

/** 1.5 per-row working. Mirror of the backend's ictRowScore: 2 only with an evidence link. */
export function ictRowScore(i: Cat1ICTInput | null | undefined) {
  const evidence = isEvidenceLink(i?.evidenceFile);
  return { evidence, score: evidence ? 2 : 0 };
}

export function courseResultScore(c: Cat1CourseResultInput | null | undefined) {
  const A = Math.min(Math.max(n(c?.avgAttendancePct), 0) / 100 * 5, 5);
  const B = Math.min(Math.max(n(c?.feedbackReceived), 0), 5);
  const C = Math.min(Math.max(n(c?.passPercentage), 0) / 100 * 10, 10);
  return { A, B, C, total: Math.min(A + B + C, 20) };
}

// Mirror of the backend's applyVoidedSources. A source whose proof was rejected
// and never corrected scores nothing; the rows stay on the form. Both engines
// read the same `voidedSources` field off the submission, which is what keeps
// them in parity — the frontend has no access to proof-verification data.
export function applyVoidedSources<T extends Record<string, any>>(values: T): T {
  const voided: string[] = (values as any)?.voidedSources ?? [];
  if (!voided.length) return values;

  const out: Record<string, any> = { ...values };
  for (const key of voided) {
    if (!(key in out)) continue;
    out[key] = Array.isArray(out[key]) ? [] : null;
  }
  return out as T;
}

export function computeScore(values: ScoreFormValues | null | undefined): ScoreBreakdown {
  values = applyVoidedSources((values ?? {}) as any);
  const v = values ?? {};
  const cat1 = scoreCategory1(v);
  const cat2 = scoreCategory2(v);
  const cat3 = scoreCategory3(v);
  const cat4 = scoreCategory4(v);
  const cat5 = scoreCategory5(v);
  const selfTotal = cat1.total + cat2.total + cat3.total + cat4.total + cat5.total;

  return { cat1, cat2, cat3, cat4, cat5, selfTotal };
}
