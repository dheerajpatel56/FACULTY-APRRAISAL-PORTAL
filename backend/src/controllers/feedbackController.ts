import { Request, Response } from 'express';
import { z } from 'zod';
import { RoleType } from '@prisma/client';
import prisma from '../utils/prismaClient';
import { canViewUserResource } from '../utils/access';
import { enqueueEmail } from '../services/emailService';
import { TRACKING_INCLUDE, loadTrackingContext } from '../services/trackingService';
import { computeScore } from '../services/scoringEngine';
import { computeActuals } from '../services/trackingEngine';
import { deriveCadre, computeExperienceYears, pickCadreTarget, checkEligibility, CADRE_LABEL } from '../services/cadreEngine';
import { generateNarrative } from '../services/feedbackNarrative';

// Author of feedback: HoD of the faculty's dept, or admin — never the owner.
function canAuthor(user: NonNullable<Request['user']>, ownerId: string, ownerDept: string | null): boolean {
  if (user.id === ownerId) return false;
  if (user.roles.some((r) => r.role === RoleType.ADMIN)) return true;
  return user.roles.some((r) => r.role === RoleType.HOD && r.departmentId != null && r.departmentId === ownerDept);
}

// Auto-filled snapshot for feedback: SELF-appraisal marks + cadre "ideal
// targets" (eligibility). No tier, no reviewed/Cat6/grand — feedback shows the
// faculty's own self-appraisal against the ideal targets.
async function buildSnapshot(submissionId: string) {
  const sub = await prisma.appraisalSubmission.findUnique({ where: { id: submissionId }, include: TRACKING_INCLUDE });
  if (!sub) return null;
  const year = await prisma.academicYear.findUnique({ where: { id: sub.academicYearId } });
  if (!year) return null;

  const u = (sub as any).user;
  const ctx = await loadTrackingContext(sub.academicYearId);
  const score = computeScore(sub as any); // self-appraisal breakdown
  const actuals = computeActuals(sub as any, null); // force self total (not reviewed)
  const expYears = computeExperienceYears(u.dateOfJoining, year.startDate);
  const cadre = deriveCadre(u.designation);
  const target = cadre ? pickCadreTarget(ctx.cadreTargets, cadre, expYears) : null;
  const eligibility = checkEligibility(actuals, target);

  return {
    year: year.label,
    faculty: { id: u.id, name: u.name, employeeCode: u.employeeCode, designation: u.designation },
    department: u.department,
    cadre,
    cadreLabel: cadre ? CADRE_LABEL[cadre] : null,
    expYears: Math.round(expYears * 10) / 10,
    eligible: eligibility.eligible,
    requirements: eligibility.requirements, // the ideal targets
    scores: {
      cat1: score.cat1.total,
      cat2: score.cat2.total,
      cat3: score.cat3.total,
      cat4: score.cat4.total,
      cat5: score.cat5.total,
      total: score.selfTotal,
    },
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

  // Editors (HoD/admin) also get a fresh auto snapshot to preview current
  // standing, plus an auto-generated narrative to pre-fill the editor — so the
  // HoD reviews a ready draft and edits or issues it with one click.
  const autoSnapshot = editable ? await buildSnapshot(sub.id) : null;
  const suggested = autoSnapshot ? generateNarrative(autoSnapshot) : null;
  return res.json({ feedback, autoSnapshot, suggested, editable });
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
