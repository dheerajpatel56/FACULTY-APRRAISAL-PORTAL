import { Request, Response } from 'express';
import { z } from 'zod';
import { Quarter } from '@prisma/client';
import prisma from '../utils/prismaClient';

// W8 — admin-configured quarterly review windows. The quarterly automation
// (snapshot + auto-feedback) fires on a window's endDate (see quarterlySnapshot
// runDueReviewWindows). One window per (academicYear, quarter).

const upsertSchema = z.object({
  academicYearId: z.string().min(1),
  quarter: z.nativeEnum(Quarter),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  enabled: z.boolean().default(true),
});

// GET /admin/review-windows?academicYearId=...
export async function listReviewWindows(req: Request, res: Response) {
  const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined;
  const windows = await prisma.reviewWindow.findMany({
    where: academicYearId ? { academicYearId } : undefined,
    orderBy: [{ quarter: 'asc' }],
  });
  return res.json(windows);
}

// PUT /admin/review-windows — upsert one (AY, quarter) window.
export async function upsertReviewWindow(req: Request, res: Response) {
  const { academicYearId, quarter, startDate, endDate, enabled } = upsertSchema.parse(req.body);

  if (endDate < startDate) {
    return res.status(400).json({ error: 'End date must be on or after the start date' });
  }
  const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!year) return res.status(404).json({ error: 'Academic year not found' });

  const row = await prisma.reviewWindow.upsert({
    where: { academicYearId_quarter: { academicYearId, quarter } },
    // Changing the window clears lastRunAt so it can fire again on the new end date.
    create: { academicYearId, quarter, startDate, endDate, enabled },
    update: { startDate, endDate, enabled, lastRunAt: null },
  });
  return res.json(row);
}

// DELETE /admin/review-windows/:id
export async function deleteReviewWindow(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.reviewWindow.delete({ where: { id } });
  return res.status(204).send();
}
