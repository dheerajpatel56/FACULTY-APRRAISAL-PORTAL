import { Request, Response } from 'express';
import { z } from 'zod';
import { RoleType, FPGPStatus, ReviewerRole } from '@prisma/client';
import prisma from '../utils/prismaClient';
import { FPGP_TEMPLATE, defaultRowsFor } from '../services/fpgpTemplate';
import { enqueueEmail } from '../services/emailService';
import { triggerFpgpEvaluation } from '../cron/fpgpEvaluation';
import { canViewUserResource } from '../utils/access';

// ---- Schemas ----
const subsectionUpdateSchema = z.object({
  subsection: z.string(),
  sem1Text: z.string().nullable().optional(),
  sem2Text: z.string().nullable().optional(),
  extraText1: z.string().nullable().optional(),
  extraText2: z.string().nullable().optional(),
  extraText3: z.string().nullable().optional(),
  rows: z.any().optional(),
});

// ---- Helpers ----
function hasRole(req: Request, role: RoleType) {
  return req.user!.roles.some((r) => r.role === role);
}

// ---- Endpoints ----

// Public template (any auth user can fetch)
export async function getTemplate(_req: Request, res: Response) {
  return res.json(FPGP_TEMPLATE);
}

export async function getMyPlan(req: Request, res: Response) {
  const { year } = req.query;
  if (!year) return res.status(400).json({ error: 'year query param required' });

  const academicYear = await prisma.academicYear.findUnique({ where: { label: year as string } });
  if (!academicYear) return res.status(404).json({ error: 'Academic year not found' });

  const plan = await prisma.fPGPPlan.findUnique({
    where: { userId_academicYearId: { userId: req.user!.id, academicYearId: academicYear.id } },
    include: { subsections: true, reviews: { include: { reviewer: { select: { id: true, name: true } } } } },
  });

  return res.json(plan);
}

export async function createPlan(req: Request, res: Response) {
  const { academicYearId } = z.object({ academicYearId: z.string() }).parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { department: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existing = await prisma.fPGPPlan.findUnique({
    where: { userId_academicYearId: { userId: user.id, academicYearId } },
  });
  if (existing) return res.status(400).json({ error: 'Plan already exists for this academic year' });

  // Approximate Total Experience = years between dateOfJoining and now
  let totalExperience: number | null = null;
  if (user.dateOfJoining) {
    const ms = Date.now() - new Date(user.dateOfJoining).getTime();
    totalExperience = Math.round((ms / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
  }

  const plan = await prisma.$transaction(async (tx) => {
    const newPlan = await tx.fPGPPlan.create({
      data: {
        userId: user.id,
        academicYearId,
        designationSnap: user.designation,
        departmentSnap: user.department?.name ?? null,
        dateOfJoiningSnap: user.dateOfJoining,
        totalExperienceSnap: totalExperience,
      },
    });

    await tx.fPGPSubsection.createMany({
      data: FPGP_TEMPLATE.map((def) => ({
        fpgpId: newPlan.id,
        subsection: def.sub,
        rows: defaultRowsFor(def).length ? defaultRowsFor(def) : undefined,
      })),
    });

    return newPlan;
  });

  const full = await prisma.fPGPPlan.findUnique({
    where: { id: plan.id },
    include: { subsections: true },
  });
  return res.status(201).json(full);
}

export async function updateSubsections(req: Request, res: Response) {
  const plan = await prisma.fPGPPlan.findUnique({ where: { id: req.params.id } });
  if (!plan) return res.status(404).json({ error: 'Not found' });
  if (plan.userId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  if (plan.status !== FPGPStatus.DRAFT) return res.status(400).json({ error: 'Plan locked' });

  const updates = z.array(subsectionUpdateSchema).parse(req.body);

  await prisma.$transaction(async (tx) => {
    for (const upd of updates) {
      const { subsection, ...data } = upd;
      await tx.fPGPSubsection.upsert({
        where: { fpgpId_subsection: { fpgpId: plan.id, subsection } },
        create: { fpgpId: plan.id, subsection, ...data },
        update: data,
      });
    }
  });

  const updated = await prisma.fPGPPlan.findUnique({
    where: { id: plan.id },
    include: { subsections: true },
  });
  return res.json(updated);
}

// Faculty signs → ACTIVE. Validates min-2 memberships (Cat 3.2).
export async function facultySign(req: Request, res: Response) {
  const plan = await prisma.fPGPPlan.findUnique({
    where: { id: req.params.id },
    include: { subsections: true },
  });
  if (!plan) return res.status(404).json({ error: 'Not found' });
  if (plan.userId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  if (plan.status !== FPGPStatus.DRAFT) return res.status(400).json({ error: 'Plan already signed' });

  // Validate Cat 3.2 memberships (min 2 non-empty rows)
  const memSub = plan.subsections.find((s) => s.subsection === '3.2');
  const rows = (memSub?.rows ?? []) as Array<{ name?: string }>;
  const filled = rows.filter((r) => r.name && r.name.trim().length > 0);
  if (filled.length < 2) {
    return res.status(400).json({ error: 'Cat 3.2 requires at least 2 professional society memberships with a name' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.fPGPPlan.update({
      where: { id: plan.id },
      data: { status: FPGPStatus.ACTIVE, facultySignedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'FPGP_FACULTY_SIGNED',
        entityType: 'FPGPPlan',
        entityId: plan.id,
      },
    });
  });

  return res.json({ message: 'Plan signed and activated' });
}

// HoD signs → REVIEWED.
export async function hodSign(req: Request, res: Response) {
  const plan = await prisma.fPGPPlan.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  });
  if (!plan) return res.status(404).json({ error: 'Not found' });
  if (plan.userId === req.user!.id) return res.status(403).json({ error: 'Cannot HoD-sign own plan' });
  if (plan.status !== FPGPStatus.ACTIVE) return res.status(400).json({ error: 'Plan must be ACTIVE to HoD-sign' });

  // Require HoD role for the faculty's department
  const isHodForDept = req.user!.roles.some(
    (r) => r.role === RoleType.HOD && r.departmentId && r.departmentId === plan.user.departmentId
  );
  const isAdmin = hasRole(req, RoleType.ADMIN);
  if (!isHodForDept && !isAdmin) return res.status(403).json({ error: 'Only HoD of faculty department (or Admin) can sign' });

  const signedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.fPGPPlan.update({
      where: { id: plan.id },
      data: { status: FPGPStatus.REVIEWED, hodSignedAt: signedAt, hodSignedBy: req.user!.id },
    });
    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'FPGP_HOD_SIGNED',
        entityType: 'FPGPPlan',
        entityId: plan.id,
      },
    });
  });

  try {
    const [hod, year] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user!.id } }),
      prisma.academicYear.findUnique({ where: { id: plan.academicYearId } }),
    ]);
    await enqueueEmail({
      toUserId: plan.userId,
      template: 'fpgp_signed',
      payload: {
        name: plan.user.name,
        year: year?.label ?? '',
        hodName: hod?.name ?? 'HoD',
        signedAt: signedAt.toLocaleString(),
        planId: plan.id,
      },
      dedupeKey: `fpgp_signed:${plan.id}`,
    });
  } catch (e) {
    console.error('[email] enqueue fpgp_signed failed:', e);
  }

  return res.json({ message: 'Plan reviewed and signed by HoD' });
}

export async function getPlanDetail(req: Request, res: Response) {
  const plan = await prisma.fPGPPlan.findUnique({
    where: { id: req.params.id },
    include: {
      subsections: true,
      reviews: { include: { reviewer: { select: { id: true, name: true } } } },
      user: { select: { id: true, name: true, employeeCode: true, designation: true, departmentId: true, department: true } },
      hodSigner: { select: { id: true, name: true } },
    },
  });
  if (!plan) return res.status(404).json({ error: 'Not found' });

  if (!canViewUserResource(req.user!, plan.userId, (plan.user as any)?.departmentId ?? null)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return res.json(plan);
}

export async function getDepartmentPlans(req: Request, res: Response) {
  const { year } = req.query;
  if (!year) return res.status(400).json({ error: 'year query param required' });

  const academicYear = await prisma.academicYear.findUnique({ where: { label: year as string } });
  if (!academicYear) return res.status(404).json({ error: 'Academic year not found' });

  const deptIds = req.user!.roles
    .filter((r) => r.role === RoleType.HOD || r.role === RoleType.REVIEWER)
    .map((r) => r.departmentId)
    .filter(Boolean) as string[];

  const plans = await prisma.fPGPPlan.findMany({
    where: {
      academicYearId: academicYear.id,
      user: { departmentId: { in: deptIds } },
    },
    include: {
      user: { select: { id: true, name: true, employeeCode: true } },
      subsections: { select: { subsection: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(plans);
}

export async function downloadFpgpPdf(req: Request, res: Response) {
  const plan = await prisma.fPGPPlan.findUnique({
    where: { id: req.params.id },
    include: {
      subsections: true,
      reviews: { include: { reviewer: { select: { id: true, name: true } } } },
      user: { include: { department: true } },
      hodSigner: { select: { id: true, name: true } },
    },
  });
  if (!plan) return res.status(404).json({ error: 'Not found' });

  if (!canViewUserResource(req.user!, plan.userId, (plan.user as any)?.departmentId ?? null)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // FPGPPlan has no academicYear relation — fetch it and attach for the renderer.
  const academicYear = await prisma.academicYear.findUnique({ where: { id: plan.academicYearId } });
  (plan as any).academicYear = academicYear;

  const { renderFpgpHtml, renderHtmlToPdf } = await import('../services/pdfService');
  const html = renderFpgpHtml(plan, FPGP_TEMPLATE as any);
  const pdf = await renderHtmlToPdf(html);

  const yearLabel = (academicYear as any)?.label ?? 'fpgp';
  const code = (plan.user as any)?.employeeCode ?? plan.userId;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=fpgp-${code}-${yearLabel}.pdf`);
  return res.send(pdf);
}

// Admin: run target reconciliation now (same logic as quarterly cron).
export async function evaluatePlans(req: Request, res: Response) {
  const { academicYearId } = z.object({ academicYearId: z.string().optional() }).parse(req.body ?? {});
  const result = await triggerFpgpEvaluation(academicYearId);
  return res.json(result);
}

export async function addReview(req: Request, res: Response) {
  const plan = await prisma.fPGPPlan.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!plan) return res.status(404).json({ error: 'Not found' });
  if (plan.userId === req.user!.id) return res.status(403).json({ error: 'Cannot review own plan' });

  const { comments } = z.object({ comments: z.string().min(1) }).parse(req.body);

  const isHod = req.user!.roles.some(
    (r) => r.role === RoleType.HOD && r.departmentId && r.departmentId === plan.user.departmentId
  );
  const reviewerRole: ReviewerRole = isHod ? ReviewerRole.HOD : ReviewerRole.REVIEWER;

  const review = await prisma.fPGPReview.create({
    data: { fpgpId: plan.id, reviewerId: req.user!.id, reviewerRole, comments },
  });

  return res.status(201).json(review);
}
