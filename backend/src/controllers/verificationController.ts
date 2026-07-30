import { Request, Response } from 'express';
import { z } from 'zod';
import { RoleType, SubmissionStatus } from '@prisma/client';
import prisma from '../utils/prismaClient';
import { canViewUserResource } from '../utils/access';
import { syncProofVerifications } from '../services/proofService';

// A verifier (incharge/HoD/admin) of the faculty's department — never the owner.
function canVerify(user: NonNullable<Request['user']>, ownerId: string, ownerDept: string | null): boolean {
  if (user.id === ownerId) return false;
  if (user.roles.some((r) => r.role === RoleType.ADMIN)) return true;
  return user.roles.some(
    (r) => (r.role === RoleType.HOD || r.role === RoleType.REVIEWER) && r.departmentId != null && r.departmentId === ownerDept
  );
}

function summarize(rows: { status: string }[]) {
  const verified = rows.filter((r) => r.status === 'VERIFIED').length;
  const rejected = rows.filter((r) => r.status === 'REJECTED').length;
  const pending = rows.filter((r) => r.status === 'PENDING').length;
  return { total: rows.length, verified, rejected, pending, allVerified: rows.length > 0 ? verified === rows.length : true };
}

// GET /appraisals/:id/proofs — section-mapped proof list + verification state.
export async function listProofs(req: Request, res: Response) {
  const sub = await prisma.appraisalSubmission.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, employeeCode: true, departmentId: true, department: { select: { name: true, code: true } } } },
      academicYear: { select: { label: true } },
    },
  });
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (!canViewUserResource(req.user!, sub.userId, sub.user.departmentId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const rows = await syncProofVerifications(sub.id);
  return res.json({
    submission: {
      id: sub.id,
      status: sub.status,
      redListed: sub.redListed,
      holdReason: sub.holdReason,
      heldAt: sub.heldAt,
      submissionNumber: sub.submissionNumber,
      year: sub.academicYear.label,
      faculty: { id: sub.user.id, name: sub.user.name, employeeCode: sub.user.employeeCode, department: sub.user.department },
    },
    proofs: rows,
    summary: summarize(rows),
  });
}

const verifySchema = z.object({
  url: z.string().min(1),
  status: z.enum(['VERIFIED', 'REJECTED']),
  comment: z.string().optional(),
});

// POST /appraisals/:id/proofs/verify — mark one proof verified/rejected.
// Reject puts the submission on HOLD and red-lists the faculty.
export async function verifyProof(req: Request, res: Response) {
  const sub = await prisma.appraisalSubmission.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { departmentId: true } } },
  });
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (!canVerify(req.user!, sub.userId, sub.user.departmentId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { url, status, comment } = verifySchema.parse(req.body);

  // Sync so the target proof row exists and reflects the current form.
  await syncProofVerifications(sub.id);
  const pv = await prisma.proofVerification.findUnique({
    where: { submissionId_url: { submissionId: sub.id, url } },
  });
  if (!pv) return res.status(404).json({ error: 'Proof not found on this submission' });

  await prisma.$transaction(async (tx) => {
    await tx.proofVerification.update({
      where: { id: pv.id },
      data: { status, verifiedById: req.user!.id, verifiedAt: new Date(), comment: comment ?? null },
    });
    if (status === 'REJECTED') {
      await tx.appraisalSubmission.update({
        where: { id: sub.id },
        data: {
          status: SubmissionStatus.HOLD,
          redListed: true,
          heldAt: new Date(),
          holdReason: `Rejected proof — ${pv.section}: ${pv.item}${comment ? ` (${comment})` : ''}`,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: `PROOF_${status}`,
        entityType: 'ProofVerification',
        entityId: pv.id,
        metadata: { submissionId: sub.id, url },
      },
    });
  });

  return res.json({ message: `Proof ${status.toLowerCase()}` });
}

// GET /red-list — held/red-listed submissions the caller may manage.
export async function listRedList(req: Request, res: Response) {
  const user = req.user!;
  const isAdmin = user.roles.some((r) => r.role === RoleType.ADMIN);
  const deptIds = user.roles
    .filter((r) => r.role === RoleType.HOD || r.role === RoleType.REVIEWER)
    .map((r) => r.departmentId)
    .filter(Boolean) as string[];

  const subs = await prisma.appraisalSubmission.findMany({
    where: {
      redListed: true,
      ...(isAdmin ? {} : { user: { departmentId: { in: deptIds } } }),
    },
    include: {
      user: { select: { id: true, name: true, employeeCode: true, department: { select: { name: true, code: true } } } },
      academicYear: { select: { label: true } },
    },
    orderBy: { heldAt: 'desc' },
  });
  return res.json(subs);
}

// POST /appraisals/:id/clear-hold — HoD/admin clears the hold after re-upload.
export async function clearHold(req: Request, res: Response) {
  const sub = await prisma.appraisalSubmission.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { departmentId: true } } },
  });
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (!canVerify(req.user!, sub.userId, sub.user.departmentId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!sub.redListed && sub.status !== SubmissionStatus.HOLD) {
    return res.status(400).json({ error: 'Submission is not on hold' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.appraisalSubmission.update({
      where: { id: sub.id },
      data: { status: SubmissionStatus.UNDER_REVIEW, redListed: false, holdReason: null, heldAt: null },
    });
    await tx.auditLog.create({
      data: { userId: req.user!.id, action: 'HOLD_CLEARED', entityType: 'AppraisalSubmission', entityId: sub.id },
    });
  });

  return res.json({ message: 'Hold cleared' });
}
