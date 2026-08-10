import { Request, Response } from 'express';
import { RoleType, SubmissionStatus } from '@prisma/client';
import prisma from '../utils/prismaClient';
import * as XLSX from 'xlsx';
import { computeScore } from '../services/scoringEngine';
import { TRACKING_INCLUDE } from '../services/trackingService';
import { AuthUser } from '../middleware/auth';

// Dept scoping for report reads. Admins see every department (or an optional
// single-dept filter); a HoD is hard-scoped to their own dept(s), so a foreign
// ?dept can't leak another department's data — and the default no longer spills
// all departments when the caller supplies no filter. Mirrors getCriteriaReport.
function reportUserWhere(user: AuthUser, deptFilter?: string) {
  const isAdmin = user.roles.some((r) => r.role === RoleType.ADMIN);
  if (isAdmin) return deptFilter ? { departmentId: deptFilter } : {};
  const deptIds = user.roles
    .filter((r) => r.role === RoleType.HOD)
    .map((r) => r.departmentId)
    .filter(Boolean) as string[];
  return { departmentId: { in: deptIds } };
}

export async function getDeptReport(req: Request, res: Response) {
  const { year, dept } = req.query;

  const academicYear = year
    ? await prisma.academicYear.findUnique({ where: { label: year as string } })
    : null;

  const yearFilter = academicYear?.id;
  const userWhere = reportUserWhere(req.user!, typeof dept === 'string' ? dept : undefined);

  const reviews = await prisma.appraisalReview.findMany({
    where: {
      submission: {
        ...(yearFilter ? { academicYearId: yearFilter } : {}),
        user: userWhere,
      },
    },
    include: {
      submission: {
        include: {
          user: { select: { id: true, name: true, employeeCode: true, designation: true, departmentId: true, department: true } },
          academicYear: { select: { label: true } },
        },
      },
    },
  });

  return res.json(reviews);
}

export async function getInstituteReport(req: Request, res: Response) {
  const { year } = req.query;
  const academicYear = year
    ? await prisma.academicYear.findUnique({ where: { label: year as string } })
    : null;

  const stats = await prisma.appraisalSubmission.groupBy({
    by: ['status'],
    where: academicYear ? { academicYearId: academicYear.id } : {},
    _count: { id: true },
  });

  const deptStats = await prisma.appraisalSubmission.findMany({
    where: academicYear ? { academicYearId: academicYear.id } : {},
    include: {
      user: { include: { department: true } },
      review: { select: { grandTotal: true } },
    },
  });

  return res.json({ statusBreakdown: stats, submissions: deptStats });
}

// GET /reports/criteria?academicYearId=&dept=  (HoD -> own dept, Admin -> all/filter)
// Per-faculty full subsection breakdown (from scoringEngine) so the frontend can
// show every faculty's mark for any chosen subsection. Uses the reviewed
// submission when present, else the latest.
export async function getCriteriaReport(req: Request, res: Response) {
  const user = req.user!;
  const isAdmin = user.roles.some((r) => r.role === RoleType.ADMIN);
  const deptIds = user.roles
    .filter((r) => r.role === RoleType.HOD || r.role === RoleType.REVIEWER)
    .map((r) => r.departmentId)
    .filter(Boolean) as string[];

  const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined;
  const deptFilter = typeof req.query.dept === 'string' ? req.query.dept : undefined;

  const year = academicYearId
    ? await prisma.academicYear.findUnique({ where: { id: academicYearId } })
    : await prisma.academicYear.findFirst({ where: { submissionOpen: true }, orderBy: { startDate: 'desc' } });
  if (!year) return res.status(404).json({ error: 'Academic year not found' });

  // Dept scope: HoD/reviewer limited to their dept(s); admin sees all (or a filter).
  const deptWhere = isAdmin
    ? (deptFilter ? { departmentId: deptFilter } : {})
    : { departmentId: { in: deptIds } };

  const submissions = await prisma.appraisalSubmission.findMany({
    where: { academicYearId: year.id, user: deptWhere },
    include: TRACKING_INCLUDE,
    orderBy: { submissionNumber: 'desc' },
  });

  // Reviewed-preferred, else latest, per faculty (submissions are desc).
  const picked = new Map<string, (typeof submissions)[number]>();
  for (const s of submissions) {
    const cur = picked.get(s.userId);
    if (!cur) picked.set(s.userId, s);
    else if (cur.status !== SubmissionStatus.APPROVED && s.status === SubmissionStatus.APPROVED) picked.set(s.userId, s);
  }

  const rows = [...picked.values()]
    .map((sub) => {
      const u = (sub as any).user;
      return {
        submissionId: sub.id,
        faculty: { id: u.id, name: u.name, employeeCode: u.employeeCode, department: u.department },
        status: sub.status,
        grandTotal: (sub as any).review?.grandTotal ?? null,
        breakdown: computeScore(sub as any),
      };
    })
    .sort((a, b) => a.faculty.name.localeCompare(b.faculty.name));

  return res.json({ year: { id: year.id, label: year.label }, rows });
}

export async function exportReport(req: Request, res: Response) {
  const { format, year, dept } = req.query;

  const academicYear = year
    ? await prisma.academicYear.findUnique({ where: { label: year as string } })
    : null;

  const reviews = await prisma.appraisalReview.findMany({
    where: {
      submission: {
        ...(academicYear ? { academicYearId: academicYear.id } : {}),
        user: reportUserWhere(req.user!, typeof dept === 'string' ? dept : undefined),
      },
    },
    include: {
      submission: {
        include: {
          user: { select: { name: true, employeeCode: true, designation: true, department: true } },
          academicYear: { select: { label: true } },
        },
      },
    },
  });

  // Columns mirror the Faculty-wise Breakdown table.
  const rows = reviews.map((r) => ({
    'Name': r.submission.user.name,
    'Employee Code': r.submission.user.employeeCode,
    'Designation': r.submission.user.designation ?? '',
    'Department': r.submission.user.department?.name ?? '',
    'Academic Year': r.submission.academicYear.label,
    'C1': r.cat1Score ?? '',
    'C2': r.cat2Score ?? '',
    'C3': r.cat3Score ?? '',
    'C4': r.cat4Score ?? '',
    'C5': r.cat5Score ?? '',
    'Total': r.totalScore ?? '',
    'Score by HoD': ((r.cat6Punctuality ?? 0) + (r.cat6Professionalism ?? 0) + (r.cat6Willingness ?? 0) + (r.cat6Cordiality ?? 0) + (r.cat6Classroom ?? 0)),
    'Reviewed': r.grandTotal ?? '',
    'Status': r.status,
  }));

  if (format === 'excel') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Appraisals');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=appraisals.xlsx');
    return res.send(buf);
  }

  return res.json(rows);
}
