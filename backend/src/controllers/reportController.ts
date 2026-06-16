import { Request, Response } from 'express';
import { RoleType, SubmissionStatus } from '@prisma/client';
import prisma from '../utils/prismaClient';
import * as XLSX from 'xlsx';

export async function getDeptReport(req: Request, res: Response) {
  const { year, dept } = req.query;

  const academicYear = year
    ? await prisma.academicYear.findUnique({ where: { label: year as string } })
    : null;

  const deptFilter = dept as string | undefined;
  const yearFilter = academicYear?.id;

  const reviews = await prisma.appraisalReview.findMany({
    where: {
      submission: {
        ...(yearFilter ? { academicYearId: yearFilter } : {}),
        user: deptFilter ? { departmentId: deptFilter } : {},
      },
    },
    include: {
      submission: {
        include: {
          user: { select: { id: true, name: true, employeeCode: true, departmentId: true, department: true } },
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

export async function exportReport(req: Request, res: Response) {
  const { format, year, dept } = req.query;

  const academicYear = year
    ? await prisma.academicYear.findUnique({ where: { label: year as string } })
    : null;

  const reviews = await prisma.appraisalReview.findMany({
    where: {
      submission: {
        ...(academicYear ? { academicYearId: academicYear.id } : {}),
        user: dept ? { departmentId: dept as string } : {},
      },
    },
    include: {
      submission: {
        include: {
          user: { select: { name: true, employeeCode: true, department: true } },
          academicYear: { select: { label: true } },
        },
      },
    },
  });

  const rows = reviews.map((r) => ({
    'Employee Code': r.submission.user.employeeCode,
    'Name': r.submission.user.name,
    'Department': r.submission.user.department?.name ?? '',
    'Academic Year': r.submission.academicYear.label,
    'Cat 1 (Teaching)': r.cat1Score ?? '',
    'Cat 2 (Research)': r.cat2Score ?? '',
    'Cat 3 (Dev)': r.cat3Score ?? '',
    'Cat 4 (Governance)': r.cat4Score ?? '',
    'Cat 5 (Supplementary)': r.cat5Score ?? '',
    'Cat 6 (Core Values)': ((r.cat6Punctuality ?? 0) + (r.cat6Professionalism ?? 0) + (r.cat6Willingness ?? 0) + (r.cat6Cordiality ?? 0) + (r.cat6Classroom ?? 0)),
    'Total Score': r.totalScore ?? '',
    'Grand Total': r.grandTotal ?? '',
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
