import { Request, Response } from 'express';
import { RoleType } from '@prisma/client';
import prisma from '../utils/prismaClient';
import { TRACKING_INCLUDE, loadTrackingContext, computeRow, latestPerFaculty } from '../services/trackingService';
import { triggerQuarterlySnapshot } from '../cron/quarterlySnapshot';

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

  const [ctx, submissions] = await Promise.all([
    loadTrackingContext(year.id),
    prisma.appraisalSubmission.findMany({
      where: {
        academicYearId: year.id,
        ...(isAdmin ? {} : { user: { departmentId: { in: deptIds } } }),
      },
      include: TRACKING_INCLUDE,
      orderBy: { submissionNumber: 'desc' },
    }),
  ]);

  const rows = latestPerFaculty(submissions)
    .map((sub) => computeRow(sub, ctx, year.startDate))
    .sort((a, b) => a.faculty.name.localeCompare(b.faculty.name));

  return res.json({
    year: { id: year.id, label: year.label },
    hasTargets: ctx.hasTargets,
    hasTierRules: ctx.hasTierRules,
    rows,
  });
}

// POST /admin/tracking/snapshot  { academicYearId? } — run the quarterly
// snapshot + auto-feedback now (admin). Cron runs it at each quarter-end.
export async function runSnapshot(req: Request, res: Response) {
  const academicYearId = typeof req.body?.academicYearId === 'string' ? req.body.academicYearId : undefined;
  const result = await triggerQuarterlySnapshot(academicYearId);
  return res.json({ message: `Snapshot ${result.quarter} — ${result.faculty} faculty`, ...result });
}
