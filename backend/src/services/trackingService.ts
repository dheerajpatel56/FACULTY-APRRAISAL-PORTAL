import prisma from '../utils/prismaClient';
import { computeActuals } from './trackingEngine';
import { assignTier, type RuleNode, type TierName } from './tierEngine';
import { deriveCadre, computeExperienceYears, pickCadreTarget, checkEligibility, CADRE_LABEL } from './cadreEngine';

// Shared per-faculty tracking computation, used by the tracking view
// (trackingController) and the quarterly scheduler.

export const TRACKING_INCLUDE = {
  cat1Courses: true, cat1CourseResults: true, cat1Projects: true, cat1EContent: true, cat1ICT: true,
  cat2Journals: true, cat2Conferences: true, cat2ConfBookChapters: true, cat2BookChapters: true, cat2Books: true,
  cat2Citations: true, cat2Patents: true, cat2Projects: true, cat2Consultancy: true,
  cat2Guidance: true, cat2ResearchGroups: true, cat2Linkages: true, cat2Startups: true, cat2IndustryLinkages: true,
  cat3AdvQual: true, cat3Organised: true, cat3ConferencesAttended: true, cat3ResourcePerson: true, cat3Editorial: true,
  cat3Training: true, cat3IntlTravel: true, cat4AdminResp: true, cat4StudentAct: true,
  cat5Memberships: true, cat5Awards: true, cat5Differentiators: true, cat5Internships: true,
  review: true,
  user: { select: { id: true, name: true, employeeCode: true, designation: true, dateOfJoining: true, departmentId: true, department: { select: { name: true, code: true } } } },
} as const;

export interface TrackingContext {
  cadreTargets: any[];
  rules: Array<{ tier: TierName; expression: RuleNode }>;
  hasTargets: boolean;
  hasTierRules: boolean;
}

export async function loadTrackingContext(academicYearId: string): Promise<TrackingContext> {
  const [cadreTargets, tierRules] = await Promise.all([
    prisma.cadreTarget.findMany({ where: { academicYearId } }),
    prisma.tierRule.findMany({ where: { academicYearId } }),
  ]);
  return {
    cadreTargets,
    rules: tierRules.map((r) => ({ tier: r.tier as TierName, expression: r.expression as unknown as RuleNode })),
    hasTargets: cadreTargets.length > 0,
    hasTierRules: tierRules.length > 0,
  };
}

// Compute one faculty's tracking row from a submission (loaded with
// TRACKING_INCLUDE) and the AY context. `yearStart` is the experience reference.
export function computeRow(sub: any, ctx: TrackingContext, yearStart: Date) {
  const u = sub.user;
  const expYears = computeExperienceYears(u.dateOfJoining, yearStart);
  const cadre = deriveCadre(u.designation);
  const actuals = computeActuals(sub, sub.review?.grandTotal ?? null);
  const target = cadre ? pickCadreTarget(ctx.cadreTargets, cadre, expYears) : null;
  const eligibility = checkEligibility(actuals, target);
  const tierResult = assignTier(ctx.rules, actuals);

  return {
    submissionId: sub.id,
    status: sub.status,
    redListed: sub.redListed,
    faculty: { id: u.id, name: u.name, employeeCode: u.employeeCode, designation: u.designation },
    department: u.department,
    cadre,
    cadreLabel: cadre ? CADRE_LABEL[cadre] : null,
    expYears: Math.round(expYears * 10) / 10,
    actuals,
    eligibility,
    tier: tierResult.tier,
    tierSatisfied: tierResult.satisfied,
  };
}

// Latest submission per faculty (input assumed sorted by submissionNumber desc).
export function latestPerFaculty<T extends { userId: string }>(subs: T[]): T[] {
  const seen = new Map<string, T>();
  for (const s of subs) if (!seen.has(s.userId)) seen.set(s.userId, s);
  return [...seen.values()];
}
