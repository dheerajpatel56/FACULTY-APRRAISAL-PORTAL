import {
  AppraisalSubmission,
  Cat1Course,
  Cat1CourseResults,
  Cat1Project,
  Cat1EContent,
  Cat1ICT,
  Cat2Journal,
  Cat2Conference,
  Cat2BookChapter,
  Cat2Book,
  Cat2Citations,
  Cat2Patent,
  Cat2Project,
  Cat2Consultancy,
  Cat2Guidance,
  Cat2ResearchGroup,
  Cat2Linkage,
  Cat2Startup,
  Cat2IndustryLinkage,
  Cat3AdvQual,
  Cat3OrganisedProgram,
  Cat3ConferenceAttended,
  Cat3ResourcePerson,
  Cat3Editorial,
  Cat3Training,
  Cat3IntlTravel,
  Cat4AdminResp,
  Cat4StudentActivity,
  Cat5Membership,
  Cat5Award,
  Cat5Differentiator,
  Cat5Internship,
  CourseLevel,
  ProjectType,
  PublicationIndex,
  PatentStatus,
  ProjectStatus,
} from '@prisma/client';

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
    resourceEditorial: number;
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

type FullSubmission = AppraisalSubmission & {
  cat1Courses: Cat1Course[];
  cat1CourseResults: Cat1CourseResults[];
  cat1Projects: Cat1Project[];
  cat1EContent: Cat1EContent[];
  cat1ICT: Cat1ICT[];
  cat2Journals: Cat2Journal[];
  cat2Conferences: Cat2Conference[];
  cat2BookChapters: Cat2BookChapter[];
  cat2Books: Cat2Book[];
  cat2Citations: Cat2Citations | null;
  cat2Patents: Cat2Patent[];
  cat2Projects: Cat2Project[];
  cat2Consultancy: Cat2Consultancy[];
  cat2Guidance: Cat2Guidance[];
  cat2ResearchGroups: Cat2ResearchGroup[];
  cat2Linkages: Cat2Linkage[];
  cat2Startups: Cat2Startup[];
  cat2IndustryLinkages: Cat2IndustryLinkage[];
  cat3AdvQual: Cat3AdvQual | null;
  cat3Organised: Cat3OrganisedProgram[];
  cat3ConferencesAttended: Cat3ConferenceAttended[];
  cat3ResourcePerson: Cat3ResourcePerson[];
  cat3Editorial: Cat3Editorial[];
  cat3Training: Cat3Training[];
  cat3IntlTravel: Cat3IntlTravel[];
  cat4AdminResp: Cat4AdminResp[];
  cat4StudentAct: Cat4StudentActivity[];
  cat5Memberships: Cat5Membership[];
  cat5Awards: Cat5Award[];
  cat5Differentiators: Cat5Differentiator[];
  cat5Internships: Cat5Internship[];
};

function scoreCategory1(s: FullSubmission) {
  // 1.1 Lectures (max 50)
  let lectures = 0;
  for (const c of s.cat1Courses) {
    const pct = (c.periodsConducted / c.periodPlanned) * 100;
    let base = pct >= 96 ? 10 : pct >= 90 ? 8 : pct >= 80 ? 6 : 4;
    const novelty = c.novelPedagogyUsed ? 5 : 0;
    lectures += base + novelty;
  }
  lectures = Math.min(lectures, 50);

  // 1.2 Attendance / Feedback / Results (per course max 20, section max 80)
  let attendanceFeedback = 0;
  for (const c of s.cat1CourseResults) {
    if (c.classSize <= 0) continue;
    const A = Math.min((c.attnGte75 * 5 + c.attnLt75Gte65 * 3) / c.classSize, 5);
    const B = Math.min(c.feedbackReceived, 5);
    const C = Math.min((c.gradeOAPlus * 10 + c.gradeAB * 8 + c.gradeCD * 5) / c.classSize, 10);
    attendanceFeedback += Math.min(A + B + C, 20);
  }
  attendanceFeedback = Math.min(attendanceFeedback, 80);

  // 1.3 Projects (max 20)
  let projects = 0;
  for (const p of s.cat1Projects) {
    if (p.course === CourseLevel.BTECH && p.projectType === ProjectType.MINI) projects += 2 * p.count;
    else if (p.course === CourseLevel.BTECH && p.projectType === ProjectType.MAJOR) projects += 5 * p.count;
    else if (p.course === CourseLevel.MTECH && p.projectType === ProjectType.MINI) projects += 3 * p.count;
    else if (p.course === CourseLevel.MTECH && p.projectType === ProjectType.MAJOR) projects += 5 * p.count;
  }
  projects = Math.min(projects, 20);

  // 1.4 e-Content (max 5)
  const eContent = Math.min(s.cat1EContent.length * 2, 5);

  // 1.5 ICT (max 5)
  const ict = Math.min(s.cat1ICT.length * 2, 5);

  const total = Math.min(lectures + attendanceFeedback + projects + eContent + ict, 150);
  return { lectures, attendanceFeedback, projects, eContent, ict, total };
}

function scoreCategory2(s: FullSubmission) {
  const INDEXED: PublicationIndex[] = [
    PublicationIndex.ESCI, PublicationIndex.WOS, PublicationIndex.SCOPUS, PublicationIndex.ICI,
  ];

  // 2.1 Publications — journals + conferences (max 50)
  // Indexed (ESCI/WoS/SCOPUS/ICI) = 15, other = 5.
  let publications = 0;
  for (const j of s.cat2Journals) {
    publications += INDEXED.includes(j.indexed) ? 15 : 5;
  }
  for (const c of s.cat2Conferences) {
    publications += INDEXED.includes(c.indexed) ? 15 : 5;
  }
  publications = Math.min(publications, 50);

  // 2.2 Citations (max 10) — from total citations
  let citations = 0;
  if (s.cat2Citations) {
    const tc = s.cat2Citations.totalCitations;
    citations = tc > 40 ? 10 : tc >= 21 ? 8 : tc >= 11 ? 5 : tc >= 3 ? 2 : 0;
  }

  // 2.3 Books & Chapters (max 10) — Published 10, Edited 5
  let books = 0;
  for (const b of s.cat2Books) books += b.isEdited ? 5 : 10;
  for (const bc of s.cat2BookChapters) books += bc.isEdited ? 5 : 10;
  books = Math.min(books, 10);

  // 2.4 Patents (max 10) — Granted/Published 10, Filed 5
  let patents = 0;
  for (const p of s.cat2Patents) {
    if (p.status === PatentStatus.GRANTED || p.status === PatentStatus.PUBLISHED) patents += 10;
    else if (p.status === PatentStatus.FILED) patents += 5;
  }
  patents = Math.min(patents, 10);

  // 2.5 Sponsored Projects (max 25) — Ongoing 20, Applied 5
  let sponsoredProjects = 0;
  for (const p of s.cat2Projects) {
    if (p.status === ProjectStatus.ONGOING) sponsoredProjects = Math.max(sponsoredProjects, 20);
    else if (p.status === ProjectStatus.APPLIED) sponsoredProjects = Math.max(sponsoredProjects, 5);
  }
  sponsoredProjects = Math.min(sponsoredProjects, 25);

  // 2.6 Consultancy (max 10)
  let consultancy = 0;
  for (const c of s.cat2Consultancy) {
    const a = c.amountLakhs;
    consultancy += a >= 10 ? 10 : a >= 5 ? 8 : a >= 2 ? 6 : a >= 1 ? 4 : 2;
  }
  consultancy = Math.min(consultancy, 10);

  // 2.7 Research Guidance (max 10) — Guide 10, Co-Guide 5
  let guidance = 0;
  for (const g of s.cat2Guidance) {
    guidance += g.isGuide ? 10 : 5;
  }
  guidance = Math.min(guidance, 10);

  // 2.8 Research Groups (max 5)
  const researchGroups = s.cat2ResearchGroups.length > 0 ? 5 : 0;

  // 2.9 Linkages — institutes (max 10)
  const linkages = Math.min(s.cat2Linkages.length * 5, 10);

  // 2.10 Industry linkage (max 10)
  const industryLinkages = Math.min(s.cat2IndustryLinkages.length * 5, 10);

  // Startups — retained extra bucket (not in form, max 5)
  const startups = Math.min(s.cat2Startups.length * 5, 5);

  const total = Math.min(
    publications + citations + books + patents + sponsoredProjects +
    consultancy + guidance + researchGroups + linkages + industryLinkages + startups,
    150
  );
  return { publications, citations, books, patents, sponsoredProjects, consultancy, guidance, researchGroups, linkages, industryLinkages, startups, total };
}

function scoreCategory3(s: FullSubmission) {
  // 3.1 Status of Ph.D. (max 10) — take highest applicable
  let advQual = 0;
  if (s.cat3AdvQual) {
    const q = s.cat3AdvQual;
    if (q.awarded) advQual = 10;
    else if (q.thesisSubmitted) advQual = 8;
    else if (q.registeredForPhD || q.clearedPrePhD) advQual = 5;
  }

  // 3.2 Organised Programs (max 20)
  const organisedPrograms = Math.min(s.cat3Organised.length * 10, 20);

  // 3.3 Attending Conferences/Seminars/Workshops (max 20, 10 each)
  const conferencesAttended = Math.min(s.cat3ConferencesAttended.length * 10, 20);

  // 3.4 Resource Person + Editorial — combined (max 20, 10 each)
  const resourceEditorial = Math.min(
    (s.cat3ResourcePerson.length + s.cat3Editorial.length) * 10,
    20
  );

  // 3.5 Training (max 25) — >=5 days → 10, <5 days → 5
  let training = 0;
  for (const t of s.cat3Training) {
    if (t.durationDays >= 5) training += 10;
    else training += 5;
  }
  training = Math.min(training, 25);

  // 3.6 International Travel (max 5)
  const intlTravel = Math.min(s.cat3IntlTravel.length * 5, 5);

  const total = Math.min(
    advQual + organisedPrograms + conferencesAttended + resourceEditorial + training + intlTravel,
    100
  );
  return { advQual, organisedPrograms, conferencesAttended, resourceEditorial, training, intlTravel, total };
}

function scoreCategory4(s: FullSubmission) {
  const adminResp = Math.min(s.cat4AdminResp.length * 10, 40);
  const studentActivities = Math.min(s.cat4StudentAct.length * 5, 10);
  const total = Math.min(adminResp + studentActivities, 50);
  return { adminResp, studentActivities, total };
}

function scoreCategory5(s: FullSubmission) {
  // 5.1 Memberships (max 15)
  let memberships = 0;
  for (const m of s.cat5Memberships) {
    if (m.status === 'national_member') memberships += 5;
    else if (m.status === 'international_member' || m.status === 'national_executive') memberships += 10;
  }
  memberships = Math.min(memberships, 15);

  // 5.2 Awards (max 10) — form scores 10 per award/honor
  const awards = Math.min(s.cat5Awards.length * 10, 10);

  // 5.3 Differentiators (max 20)
  let differentiators = 0;
  for (const d of s.cat5Differentiators) {
    if (d.role === 'participating') differentiators += 3;
    else if (d.role === 'leading') differentiators += 7;
    else if (d.role === 'initiating') differentiators += 10;
  }
  differentiators = Math.min(differentiators, 20);

  // 5.4 Internships (max 5)
  const internships = Math.min(s.cat5Internships.length * 5, 5);

  const total = Math.min(memberships + awards + differentiators + internships, 50);
  return { memberships, awards, differentiators, internships, total };
}

export function computeScore(submission: FullSubmission): ScoreBreakdown {
  const cat1 = scoreCategory1(submission);
  const cat2 = scoreCategory2(submission);
  const cat3 = scoreCategory3(submission);
  const cat4 = scoreCategory4(submission);
  const cat5 = scoreCategory5(submission);
  const selfTotal = cat1.total + cat2.total + cat3.total + cat4.total + cat5.total;

  return { cat1, cat2, cat3, cat4, cat5, selfTotal };
}
