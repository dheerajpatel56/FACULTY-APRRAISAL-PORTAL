import { Request, Response } from 'express';
import { RoleType } from '@prisma/client';
import * as XLSX from 'xlsx';
import { buildTrackingRows, summarize, type TrackingRow } from '../services/trackingService';
import { triggerQuarterlySnapshot } from '../cron/quarterlySnapshot';

function scope(req: Request) {
  const user = req.user!;
  return {
    isAdmin: user.roles.some((r) => r.role === RoleType.ADMIN),
    deptIds: user.roles
      .filter((r) => r.role === RoleType.HOD || r.role === RoleType.REVIEWER)
      .map((r) => r.departmentId)
      .filter(Boolean) as string[],
  };
}

// GET /tracking?academicYearId=...  (HoD -> own dept, Admin -> all)
// Per-faculty cadre, actuals vs cadre targets (eligibility), tier + segregation.
export async function getTracking(req: Request, res: Response) {
  const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined;
  const built = await buildTrackingRows({ ...scope(req), academicYearId });
  if (!built) return res.status(404).json({ error: 'Academic year not found' });

  return res.json({
    year: { id: built.year.id, label: built.year.label },
    hasTargets: built.ctx.hasTargets,
    hasTierRules: built.ctx.hasTierRules,
    aggregates: summarize(built.rows),
    rows: built.rows,
  });
}

function exportRow(r: TrackingRow) {
  return {
    'Employee Code': r.faculty.employeeCode,
    Name: r.faculty.name,
    Department: r.department?.name ?? '',
    Designation: r.faculty.designation ?? '',
    Cadre: r.cadreLabel ?? 'Unassigned',
    'Exp (yr)': r.expYears,
    Tier: r.tier ?? '',
    Eligible: r.eligibility.requirements.length === 0 ? 'N/A' : r.eligibility.eligible ? 'Yes' : 'No',
    'Total Score': r.actuals.totalScore,
    'Score Source': r.actuals.totalScoreSource,
    Feedback: r.actuals.feedback,
    Indexed: r.actuals.indexedCount,
    Journals: r.actuals.journalCount,
    Patents: r.actuals.patentCount,
    Projects: r.actuals.projectCount,
    Consultancy: r.actuals.consultancyCount,
  };
}

// GET /tracking/export?academicYearId=&format=excel  — segregated report download.
export async function exportTracking(req: Request, res: Response) {
  const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined;
  const built = await buildTrackingRows({ ...scope(req), academicYearId });
  if (!built) return res.status(404).json({ error: 'Academic year not found' });

  const rows = built.rows.map(exportRow);

  if (req.query.format === 'excel') {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Cadre-Tier');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=cadre-tier-${built.year.label}.xlsx`);
    return res.send(buf);
  }

  return res.json(rows);
}

// POST /admin/tracking/snapshot  { academicYearId? } — run the quarterly
// snapshot + auto-feedback now (admin). Cron runs it at each quarter-end.
export async function runSnapshot(req: Request, res: Response) {
  const academicYearId = typeof req.body?.academicYearId === 'string' ? req.body.academicYearId : undefined;
  const result = await triggerQuarterlySnapshot(academicYearId);
  return res.json({ message: `Snapshot ${result.quarter} — ${result.faculty} faculty`, ...result });
}
