import { Request, Response } from 'express';
import { z } from 'zod';
import { RoleType } from '@prisma/client';
import prisma from '../utils/prismaClient';
import { canViewUserResource } from '../utils/access';
import { enqueueEmail } from '../services/emailService';
import { TRACKING_INCLUDE, loadTrackingContext, computeRow } from '../services/trackingService';

// Author of feedback: HoD of the faculty's dept, or admin — never the owner.
function canAuthor(user: NonNullable<Request['user']>, ownerId: string, ownerDept: string | null): boolean {
  if (user.id === ownerId) return false;
  if (user.roles.some((r) => r.role === RoleType.ADMIN)) return true;
  return user.roles.some((r) => r.role === RoleType.HOD && r.departmentId != null && r.departmentId === ownerDept);
}

// Auto-filled snapshot: HoD-reviewed scores + cadre/tier/eligibility standing.
async function buildSnapshot(submissionId: string) {
  const sub = await prisma.appraisalSubmission.findUnique({ where: { id: submissionId }, include: TRACKING_INCLUDE });
  if (!sub) return null;
  const year = await prisma.academicYear.findUnique({ where: { id: sub.academicYearId } });
  if (!year) return null;
  const ctx = await loadTrackingContext(sub.academicYearId);
  const row = computeRow(sub, ctx, year.startDate);
  const rev = (sub as any).review;
  const cat6 = rev
    ? (rev.cat6Punctuality ?? 0) + (rev.cat6Professionalism ?? 0) + (rev.cat6Willingness ?? 0) + (rev.cat6Cordiality ?? 0) + (rev.cat6Classroom ?? 0)
    : null;

  return {
    year: year.label,
    faculty: row.faculty,
    department: row.department,
    cadre: row.cadre,
    cadreLabel: row.cadreLabel,
    expYears: row.expYears,
    tier: row.tier,
    eligible: row.eligibility.eligible,
    requirements: row.eligibility.requirements,
    actuals: row.actuals,
    scores: rev
      ? { cat1: rev.cat1Score, cat2: rev.cat2Score, cat3: rev.cat3Score, cat4: rev.cat4Score, cat5: rev.cat5Score, cat6, total: rev.totalScore, grand: rev.grandTotal }
      : null,
  };
}

// GET /appraisals/:id/feedback
export async function getFeedback(req: Request, res: Response) {
  const sub = await prisma.appraisalSubmission.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { departmentId: true } } },
  });
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (!canViewUserResource(req.user!, sub.userId, sub.user.departmentId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const editable = canAuthor(req.user!, sub.userId, sub.user.departmentId);
  const isOwner = req.user!.id === sub.userId;
  const feedback = await prisma.feedback.findUnique({
    where: { submissionId: sub.id },
    include: { issuedBy: { select: { name: true } } },
  });

  // Faculty (owner) only sees an issued feedback.
  if (isOwner) {
    if (!feedback || feedback.status !== 'ISSUED') return res.json({ feedback: null, editable: false });
    return res.json({ feedback, editable: false });
  }

  // Editors (HoD/admin) also get a fresh auto snapshot to preview current standing.
  const autoSnapshot = editable ? await buildSnapshot(sub.id) : null;
  return res.json({ feedback, autoSnapshot, editable });
}

const saveSchema = z.object({
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  growthTargets: z.string().optional(),
});

// PUT /appraisals/:id/feedback — save narrative as DRAFT (HoD/admin).
export async function saveFeedback(req: Request, res: Response) {
  const sub = await prisma.appraisalSubmission.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { departmentId: true } } },
  });
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (!canAuthor(req.user!, sub.userId, sub.user.departmentId)) {
    return res.status(403).json({ error: 'Only the HoD can author feedback' });
  }

  const data = saveSchema.parse(req.body);
  const snapshot = await buildSnapshot(sub.id);

  const feedback = await prisma.feedback.upsert({
    where: { submissionId: sub.id },
    create: { submissionId: sub.id, userId: sub.userId, academicYearId: sub.academicYearId, snapshot: snapshot as any, ...data },
    update: { ...data },
  });
  return res.json(feedback);
}

// POST /appraisals/:id/feedback/issue — release to faculty (HoD/admin).
export async function issueFeedback(req: Request, res: Response) {
  const sub = await prisma.appraisalSubmission.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { departmentId: true } }, academicYear: { select: { label: true } } },
  });
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (!canAuthor(req.user!, sub.userId, sub.user.departmentId)) {
    return res.status(403).json({ error: 'Only the HoD can issue feedback' });
  }

  const data = saveSchema.parse(req.body ?? {});
  const snapshot = await buildSnapshot(sub.id);

  const feedback = await prisma.feedback.upsert({
    where: { submissionId: sub.id },
    create: {
      submissionId: sub.id, userId: sub.userId, academicYearId: sub.academicYearId, snapshot: snapshot as any,
      ...data, status: 'ISSUED', issuedById: req.user!.id, issuedAt: new Date(),
    },
    update: { ...data, snapshot: snapshot as any, status: 'ISSUED', issuedById: req.user!.id, issuedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: { userId: req.user!.id, action: 'FEEDBACK_ISSUED', entityType: 'Feedback', entityId: feedback.id },
  });

  try {
    const faculty = await prisma.user.findUnique({ where: { id: sub.userId }, select: { name: true } });
    await enqueueEmail({
      toUserId: sub.userId,
      template: 'feedback_issued',
      payload: { name: faculty?.name ?? 'Faculty', year: sub.academicYear.label, submissionId: sub.id },
      dedupeKey: `feedback_issued:${feedback.id}:${Date.now()}`,
    });
  } catch (e) {
    console.error('[email] enqueue feedback_issued failed:', e);
  }

  return res.json(feedback);
}
