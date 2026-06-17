import { Request, Response } from 'express';
import { z } from 'zod';
import { RoleType, SubmissionStatus, ReviewerRole } from '@prisma/client';
import prisma from '../utils/prismaClient';
import { computeScore } from '../services/scoringEngine';
import { enqueueEmail } from '../services/emailService';

const reviewSchema = z.object({
  cat1Score: z.number().optional(),
  cat2Score: z.number().optional(),
  cat3Score: z.number().optional(),
  cat4Score: z.number().optional(),
  cat5Score: z.number().optional(),
  cat6Punctuality: z.number().min(0).max(10).optional(),
  cat6Professionalism: z.number().min(0).max(10).optional(),
  cat6Willingness: z.number().min(0).max(10).optional(),
  cat6Cordiality: z.number().min(0).max(10).optional(),
  cat6Classroom: z.number().min(0).max(10).optional(),
  teachingComment: z.string().optional(),
  researchComment: z.string().optional(),
  developmentComment: z.string().optional(),
  governanceComment: z.string().optional(),
  supplementaryComment: z.string().optional(),
  overallComment: z.string().optional(),
  status: z.enum(['APPROVED', 'REJECTED']),
});

const FULL_INCLUDE = {
  cat1Courses: true, cat1CourseResults: true, cat1Projects: true, cat1EContent: true, cat1ICT: true,
  cat2Journals: true, cat2Conferences: true, cat2BookChapters: true, cat2Books: true,
  cat2Citations: true, cat2Patents: true, cat2Projects: true, cat2Consultancy: true,
  cat2Guidance: true, cat2ResearchGroups: true, cat2Linkages: true, cat2Startups: true,
  cat3AdvQual: true, cat3Organised: true, cat3ResourcePerson: true, cat3Editorial: true,
  cat3Training: true, cat3IntlTravel: true, cat4AdminResp: true, cat4StudentAct: true,
  cat5Memberships: true, cat5Awards: true, cat5Differentiators: true, cat5Internships: true,
};

export async function listPendingReviews(req: Request, res: Response) {
  const user = req.user!;
  const deptIds = user.roles
    .filter((r) => r.role === RoleType.HOD || r.role === RoleType.REVIEWER)
    .map((r) => r.departmentId)
    .filter(Boolean) as string[];

  const subs = await prisma.appraisalSubmission.findMany({
    where: {
      status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW] },
      userId: { not: user.id },
      user: { departmentId: { in: deptIds } },
    },
    include: {
      user: { select: { id: true, name: true, employeeCode: true, departmentId: true, department: true } },
      academicYear: { select: { id: true, label: true } },
      review: true,
    },
    orderBy: { submittedAt: 'asc' },
  });

  return res.json(subs);
}

export async function submitReview(req: Request, res: Response) {
  const sub = await prisma.appraisalSubmission.findUnique({
    where: { id: req.params.id },
    include: FULL_INCLUDE,
  });

  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (sub.userId === req.user!.id) return res.status(403).json({ error: 'Cannot review own submission' });
  if (sub.status === SubmissionStatus.APPROVED) return res.status(400).json({ error: 'Already approved' });

  const data = reviewSchema.parse(req.body);

  const isHod = req.user!.roles.some((r) => r.role === RoleType.HOD);
  const reviewerRole: ReviewerRole = isHod ? ReviewerRole.HOD : ReviewerRole.REVIEWER;

  const computedScore = computeScore(sub as any);

  const cat6Total = (data.cat6Punctuality ?? 0) + (data.cat6Professionalism ?? 0) +
    (data.cat6Willingness ?? 0) + (data.cat6Cordiality ?? 0) + (data.cat6Classroom ?? 0);
  const totalScore = computedScore.selfTotal;
  const grandTotal = totalScore + Math.min(cat6Total, 50);

  await prisma.$transaction(async (tx) => {
    await tx.appraisalReview.upsert({
      where: { submissionId: sub.id },
      create: {
        submissionId: sub.id,
        reviewerId: req.user!.id,
        reviewerRole,
        ...data,
        cat1Score: computedScore.cat1.total,
        cat2Score: computedScore.cat2.total,
        cat3Score: computedScore.cat3.total,
        cat4Score: computedScore.cat4.total,
        cat5Score: computedScore.cat5.total,
        totalScore,
        grandTotal,
        status: data.status as SubmissionStatus,
      },
      update: {
        ...data,
        cat1Score: computedScore.cat1.total,
        cat2Score: computedScore.cat2.total,
        cat3Score: computedScore.cat3.total,
        cat4Score: computedScore.cat4.total,
        cat5Score: computedScore.cat5.total,
        totalScore,
        grandTotal,
        status: data.status as SubmissionStatus,
        reviewedAt: new Date(),
      },
    });

    await tx.appraisalSubmission.update({
      where: { id: sub.id },
      data: { status: data.status as SubmissionStatus },
    });

    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: `REVIEW_${data.status}`,
        entityType: 'AppraisalSubmission',
        entityId: sub.id,
      },
    });
  });

  // Email faculty on APPROVED or REJECTED
  if (data.status === 'APPROVED' || data.status === 'REJECTED') {
    try {
      const [reviewer, facultyUser, year] = await Promise.all([
        prisma.user.findUnique({ where: { id: req.user!.id } }),
        prisma.user.findUnique({ where: { id: sub.userId } }),
        prisma.academicYear.findUnique({ where: { id: sub.academicYearId } }),
      ]);
      await enqueueEmail({
        toUserId: sub.userId,
        template: data.status === 'APPROVED' ? 'submission_approved' : 'submission_rejected',
        payload: {
          name: facultyUser?.name ?? 'Faculty',
          year: year?.label ?? '',
          submissionNumber: sub.submissionNumber,
          submissionId: sub.id,
          reviewerName: reviewer?.name ?? 'Reviewer',
          reviewedAt: new Date().toLocaleString(),
          cat1: computedScore.cat1.total.toFixed(1),
          cat2: computedScore.cat2.total.toFixed(1),
          cat3: computedScore.cat3.total.toFixed(1),
          cat4: computedScore.cat4.total.toFixed(1),
          cat5: computedScore.cat5.total.toFixed(1),
          cat6: cat6Total.toFixed(1),
          grandTotal: grandTotal.toFixed(1),
          teachingComment: data.teachingComment ?? '',
          researchComment: data.researchComment ?? '',
          developmentComment: data.developmentComment ?? '',
          governanceComment: data.governanceComment ?? '',
          supplementaryComment: data.supplementaryComment ?? '',
          overallComment: data.overallComment ?? '',
        },
        dedupeKey: `${data.status === 'APPROVED' ? 'approved' : 'rejected'}:${sub.id}:${Date.now()}`,
      });
    } catch (e) {
      console.error('[email] enqueue review decision failed:', e);
    }
  }

  return res.json({ message: `Submission ${data.status.toLowerCase()}` });
}

export async function getReview(req: Request, res: Response) {
  const sub = await prisma.appraisalSubmission.findUnique({
    where: { id: req.params.id },
    include: { review: true },
  });

  if (!sub) return res.status(404).json({ error: 'Not found' });

  const isFaculty = !req.user!.roles.some((r) =>
    ([RoleType.ADMIN, RoleType.HOD, RoleType.REVIEWER] as RoleType[]).includes(r.role)
  );

  if (isFaculty) {
    if (sub.userId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
    if (!sub.review) return res.json(null);
    if (!([SubmissionStatus.APPROVED, SubmissionStatus.REJECTED] as SubmissionStatus[]).includes(sub.status)) {
      return res.json({ status: sub.review.status, comments: null });
    }
    const { cat1Score, cat2Score, cat3Score, cat4Score, cat5Score,
      cat6Punctuality, cat6Professionalism, cat6Willingness, cat6Cordiality, cat6Classroom,
      totalScore, grandTotal, ...safeReview } = sub.review;
    return res.json(safeReview);
  }

  return res.json(sub.review);
}

export async function adminUnlock(req: Request, res: Response) {
  const sub = await prisma.appraisalSubmission.findUnique({
    where: { id: req.params.id },
    include: { user: true, academicYear: true },
  });
  if (!sub) return res.status(404).json({ error: 'Not found' });

  await prisma.$transaction(async (tx) => {
    await tx.appraisalSubmission.update({
      where: { id: sub.id },
      data: { status: SubmissionStatus.DRAFT },
    });
    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'SUBMISSION_FORCE_UNLOCKED',
        entityType: 'AppraisalSubmission',
        entityId: sub.id,
      },
    });
  });

  try {
    await enqueueEmail({
      toUserId: sub.userId,
      template: 'submission_unlocked',
      payload: {
        name: sub.user.name,
        year: sub.academicYear.label,
        submissionNumber: sub.submissionNumber,
        submissionId: sub.id,
      },
      dedupeKey: `unlocked:${sub.id}:${Date.now()}`,
    });
  } catch (e) {
    console.error('[email] enqueue unlock failed:', e);
  }

  return res.json({ message: 'Submission unlocked' });
}

export async function adminAssignReviewer(req: Request, res: Response) {
  const { reviewerId } = z.object({ reviewerId: z.string() }).parse(req.body);
  const sub = await prisma.appraisalSubmission.findUnique({ where: { id: req.params.id } });
  if (!sub) return res.status(404).json({ error: 'Not found' });

  await prisma.appraisalSubmission.update({
    where: { id: sub.id },
    data: { status: SubmissionStatus.UNDER_REVIEW },
  });

  return res.json({ message: 'Reviewer assigned', reviewerId });
}
