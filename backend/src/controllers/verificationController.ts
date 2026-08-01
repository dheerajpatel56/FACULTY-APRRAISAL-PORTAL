import { Request, Response } from 'express';
import { z } from 'zod';
import { RoleType, SubmissionStatus } from '@prisma/client';
import prisma from '../utils/prismaClient';
import { canViewUserResource } from '../utils/access';
import { syncProofVerifications } from '../services/proofService';
import { enqueueEmail } from '../services/emailService';

// Who may CHANGE a proof's approve/reject status: HoD or incharge (REVIEWER)
// of the faculty's department only — never the owner, and not a plain admin.
function canVerifyProof(user: NonNullable<Request['user']>, ownerId: string, ownerDept: string | null): boolean {
  if (user.id === ownerId) return false;
  return user.roles.some(
    (r) => (r.role === RoleType.HOD || r.role === RoleType.REVIEWER) && r.departmentId != null && r.departmentId === ownerDept
  );
}

// Who may manage the red-list / clear a hold: HoD or admin of the dept.
function canManage(user: NonNullable<Request['user']>, ownerId: string, ownerDept: string | null): boolean {
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
    include: {
      user: { select: { id: true, name: true, employeeCode: true, departmentId: true } },
      academicYear: { select: { label: true } },
    },
  });
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (!canVerifyProof(req.user!, sub.userId, sub.user.departmentId)) {
    return res.status(403).json({ error: 'Only the HoD or incharge can verify uploads' });
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

  // Notify on reject — faculty (must re-upload) + dept HoD(s) (red list).
  if (status === 'REJECTED') {
    try {
      const base = {
        year: sub.academicYear.label,
        submissionNumber: sub.submissionNumber,
        submissionId: sub.id,
        section: pv.section,
        item: pv.item,
        field: pv.field,
        comment: comment ?? '',
      };
      await enqueueEmail({
        toUserId: sub.userId,
        template: 'proof_rejected',
        payload: { name: sub.user.name, ...base },
        dedupeKey: `proof_rejected:${pv.id}:${Date.now()}`,
      });
      const hods = await prisma.userRole.findMany({
        where: { role: 'HOD', isActive: true, departmentId: sub.user.departmentId ?? undefined },
        select: { userId: true },
      });
      for (const h of hods) {
        if (h.userId === req.user!.id) continue; // rejecter is the HoD — no self-notice
        const hod = await prisma.user.findUnique({ where: { id: h.userId }, select: { name: true } });
        await enqueueEmail({
          toUserId: h.userId,
          template: 'proof_rejected_hod',
          payload: { name: hod?.name ?? 'HoD', facultyName: sub.user.name, employeeCode: sub.user.employeeCode, ...base },
          dedupeKey: `proof_rejected_hod:${pv.id}:${h.userId}:${Date.now()}`,
        });
      }
    } catch (e) {
      console.error('[email] enqueue proof reject failed:', e);
    }
  }

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
    include: {
      user: { select: { id: true, name: true, departmentId: true } },
      academicYear: { select: { label: true } },
    },
  });
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (!canManage(req.user!, sub.userId, sub.user.departmentId)) {
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

  try {
    await enqueueEmail({
      toUserId: sub.userId,
      template: 'hold_cleared',
      payload: { name: sub.user.name, year: sub.academicYear.label, submissionNumber: sub.submissionNumber, submissionId: sub.id },
      dedupeKey: `hold_cleared:${sub.id}:${Date.now()}`,
    });
  } catch (e) {
    console.error('[email] enqueue hold cleared failed:', e);
  }

  return res.json({ message: 'Hold cleared' });
}
