import { Request, Response } from 'express';
import { RoleType } from '@prisma/client';
import prisma from '../utils/prismaClient';
import { computeActuals } from '../services/trackingEngine';
import { assignTier, type RuleNode, type TierName } from '../services/tierEngine';
import { deriveCadre, computeExperienceYears, pickCadreTarget, checkEligibility, CADRE_LABEL } from '../services/cadreEngine';

// All category relations — computeActuals reads the Cat2 pubs; the SELF-total
// fallback (no HoD review yet) runs the scoring engine, which needs the full
// shape.
const TRACKING_INCLUDE = {
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

// GET /tracking?academicYearId=...  (HoD -> own dept, Admin -> all)
// Per-faculty cadre, actuals vs cadre targets (eligibility), and tier.
export async function getTracking(req: Request, res: Response) {
  const user = req.user!;
  const isAdmin = user.roles.some((r) => r.role === RoleType.ADMIN);
  const deptIds = user.roles
    .filter((r) => r.role === RoleType.HOD || r.role === RoleType.REVIEWER)
    .map((r) => r.departmentId)
    .filter(Boolean) as string[];

  const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined;
  const year = academicYearId
    ? await prisma.academicYear.findUnique({ where: { id: academicYearId } })
    : await prisma.academicYear.findFirst({ where: { submissionOpen: true }, orderBy: { startDate: 'desc' } });
  if (!year) return res.status(404).json({ error: 'Academic year not found' });

  const [cadreTargets, tierRules, submissions] = await Promise.all([
    prisma.cadreTarget.findMany({ where: { academicYearId: year.id } }),
    prisma.tierRule.findMany({ where: { academicYearId: year.id } }),
    prisma.appraisalSubmission.findMany({
      where: {
        academicYearId: year.id,
        ...(isAdmin ? {} : { user: { departmentId: { in: deptIds } } }),
      },
      include: TRACKING_INCLUDE,
      orderBy: { submissionNumber: 'desc' },
    }),
  ]);

  const rules: Array<{ tier: TierName; expression: RuleNode }> = tierRules.map((r) => ({
    tier: r.tier as TierName,
    expression: r.expression as unknown as RuleNode,
  }));

  // Latest submission per faculty (submissions already sorted desc).
  const latest = new Map<string, (typeof submissions)[number]>();
  for (const s of submissions) if (!latest.has(s.userId)) latest.set(s.userId, s);

  const rows = [...latest.values()].map((sub) => {
    const u = sub.user;
    const expYears = computeExperienceYears(u.dateOfJoining, year.startDate);
    const cadre = deriveCadre(u.designation);
    const actuals = computeActuals(sub, sub.review?.grandTotal ?? null);
    const target = cadre ? pickCadreTarget(cadreTargets, cadre, expYears) : null;
    const eligibility = checkEligibility(actuals, target);
    const tierResult = assignTier(rules, actuals);

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
  });

  rows.sort((a, b) => a.faculty.name.localeCompare(b.faculty.name));

  return res.json({
    year: { id: year.id, label: year.label },
    hasTargets: cadreTargets.length > 0,
    hasTierRules: tierRules.length > 0,
    rows,
  });
}
