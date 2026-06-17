import cron from 'node-cron';
import prisma from '../utils/prismaClient';
import { reconcileFpgp } from '../services/fpgpReconciler';
import { enqueueEmail } from '../services/emailService';

/**
 * Quarterly (1st of Jan/Apr/Jul/Oct, 09:00 server time): evaluate every ACTIVE
 * FPGP plan against the faculty's appraisal actuals. Auto-accept when all
 * quantifiable targets are met, else mark NEEDS_REVIEW. Persists an achievement
 * snapshot and emails the faculty.
 */

// Appraisal arrays the reconciler counts toward FPGP targets.
const APPRAISAL_INCLUDE = {
  cat2Journals: true,
  cat2Conferences: true,
  cat2Books: true,
  cat2BookChapters: true,
  cat2Patents: true,
  cat2Projects: true,
  cat2Consultancy: true,
  cat5Memberships: true,
  cat3Training: true,
  cat3ConferencesAttended: true,
} as const;

// Pick the appraisal that represents "actuals": prefer APPROVED, else latest.
async function findActualsSubmission(userId: string, academicYearId: string) {
  const approved = await prisma.appraisalSubmission.findFirst({
    where: { userId, academicYearId, status: 'APPROVED' },
    include: APPRAISAL_INCLUDE,
    orderBy: { submittedAt: 'desc' },
  });
  if (approved) return approved;
  return prisma.appraisalSubmission.findFirst({
    where: { userId, academicYearId },
    include: APPRAISAL_INCLUDE,
    orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function evaluateActivePlans(academicYearId?: string) {
  console.log('[cron] Running FPGP target evaluation');
  const plans = await prisma.fPGPPlan.findMany({
    where: { status: 'ACTIVE', ...(academicYearId ? { academicYearId } : {}) },
    include: { subsections: true, user: true },
  });

  let evaluated = 0;
  for (const plan of plans) {
    const appraisal = await findActualsSubmission(plan.userId, plan.academicYearId);
    const result = reconcileFpgp(plan.subsections, appraisal);

    // No quantifiable targets set → nothing to auto-evaluate; leave ACTIVE.
    if (result.items.length === 0) continue;

    const autoAccepted = result.autoAcceptEligible;
    await prisma.$transaction(async (tx) => {
      await tx.fPGPPlan.update({
        where: { id: plan.id },
        data: {
          status: autoAccepted ? 'ACCEPTED' : 'NEEDS_REVIEW',
          evaluatedAt: new Date(),
          autoAccepted,
          achievement: result.items as any,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: plan.userId,
          action: autoAccepted ? 'FPGP_AUTO_ACCEPTED' : 'FPGP_NEEDS_REVIEW',
          entityType: 'FPGPPlan',
          entityId: plan.id,
          metadata: { items: result.items } as any,
        },
      });
    });

    try {
      const year = await prisma.academicYear.findUnique({ where: { id: plan.academicYearId } });
      await enqueueEmail({
        toUserId: plan.userId,
        template: 'fpgp_evaluated',
        payload: {
          name: plan.user.name,
          year: year?.label ?? '',
          autoAccepted,
          items: result.items,
          planId: plan.id,
        },
        dedupeKey: `fpgp_evaluated:${plan.id}:${new Date().toISOString().slice(0, 10)}`,
        honorOptIn: true,
      });
    } catch (e) {
      console.error('[email] enqueue fpgp_evaluated failed:', e);
    }
    evaluated++;
  }
  console.log(`[cron] FPGP evaluation done — ${evaluated} plan(s) evaluated`);
  return { evaluated, total: plans.length };
}

export function startFpgpEvaluationCron() {
  // Quarterly: 1st of Jan, Apr, Jul, Oct at 09:00 server time
  cron.schedule('0 9 1 1,4,7,10 *', async () => {
    try { await evaluateActivePlans(); } catch (e) { console.error('[cron] FPGP evaluation error:', e); }
  });
  console.log('[cron] FPGP evaluation cron scheduled (quarterly 09:00)');
}

// Manual trigger (admin "Evaluate now" button)
export async function triggerFpgpEvaluation(academicYearId?: string) {
  return evaluateActivePlans(academicYearId);
}
