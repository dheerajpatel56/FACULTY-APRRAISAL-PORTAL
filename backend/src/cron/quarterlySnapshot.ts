import cron from 'node-cron';
import { Quarter } from '@prisma/client';
import prisma from '../utils/prismaClient';
import { enqueueEmail } from '../services/emailService';
import { TRACKING_INCLUDE, loadTrackingContext, computeRow, latestPerFaculty } from '../services/trackingService';
import { generateNarrative } from '../services/feedbackNarrative';

/**
 * Quarterly criteria-tracking scheduler. On the last day of each fixed calendar
 * quarter (30 Sep / 31 Dec / 31 Mar / 30 Jun, 09:00 server time), snapshots
 * every faculty's cadre/tier/eligibility standing for the open AY and emails
 * them their quarterly feedback. Quarterly results are provisional; the annual
 * submission is the final one.
 */

// Fixed calendar quarters aligned to the assessment period (01-Jul -> 30-Jun).
export function currentQuarter(date: Date = new Date()): Quarter {
  const m = date.getMonth(); // 0=Jan
  if (m >= 6 && m <= 8) return Quarter.Q1; // Jul-Sep
  if (m >= 9 && m <= 11) return Quarter.Q2; // Oct-Dec
  if (m >= 0 && m <= 2) return Quarter.Q3; // Jan-Mar
  return Quarter.Q4; // Apr-Jun
}

async function snapshotYear(academicYearId: string, quarter: Quarter): Promise<number> {
  const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!year) return 0;

  const ctx = await loadTrackingContext(academicYearId);
  const submissions = await prisma.appraisalSubmission.findMany({
    where: { academicYearId },
    include: TRACKING_INCLUDE,
    orderBy: { submissionNumber: 'desc' },
  });

  let count = 0;
  for (const sub of latestPerFaculty(submissions)) {
    const row = computeRow(sub, ctx, year.startDate);

    await prisma.trackingSnapshot.upsert({
      where: { userId_academicYearId_quarter: { userId: row.faculty.id, academicYearId, quarter } },
      create: {
        userId: row.faculty.id, academicYearId, quarter,
        cadre: row.cadre ?? null, expYears: row.expYears,
        actuals: row.actuals as any, eligible: row.eligibility.eligible, tier: row.tier ?? null,
      },
      update: {
        cadre: row.cadre ?? null, expYears: row.expYears,
        actuals: row.actuals as any, eligible: row.eligibility.eligible, tier: row.tier ?? null,
      },
    });
    count++;

    // Auto-feedback email (provisional quarterly standing) — sent directly to
    // the faculty, no HoD step. Includes the auto-generated narrative.
    try {
      const narrative = generateNarrative({
        cadreLabel: row.cadreLabel,
        eligible: row.eligibility.eligible,
        requirements: row.eligibility.requirements,
      });
      await enqueueEmail({
        toUserId: row.faculty.id,
        template: 'quarterly_feedback',
        payload: {
          name: row.faculty.name,
          year: year.label,
          quarter,
          cadre: row.cadreLabel ?? 'Unknown',
          tier: row.tier ?? '—',
          eligible: row.eligibility.eligible,
          requirements: row.eligibility.requirements.map((r) => ({ label: r.label, target: r.target, actual: r.actual, met: r.met })),
          ...narrative,
        },
        dedupeKey: `quarterly_feedback:${row.faculty.id}:${academicYearId}:${quarter}`,
        honorOptIn: true,
      });
    } catch (e) {
      console.error('[email] enqueue quarterly_feedback failed:', e);
    }
  }
  return count;
}

// Run the snapshot for a given AY (or all open AYs) for the current quarter.
export async function runQuarterlySnapshot(academicYearId?: string, at: Date = new Date()) {
  const quarter = currentQuarter(at);
  const years = academicYearId
    ? [{ id: academicYearId }]
    : await prisma.academicYear.findMany({ where: { submissionOpen: true }, select: { id: true } });

  let total = 0;
  for (const y of years) total += await snapshotYear(y.id, quarter);
  console.log(`[cron] Quarterly snapshot (${quarter}) done — ${total} faculty`);
  return { quarter, faculty: total };
}

export function startQuarterlySnapshotCron() {
  // Last day of each fixed quarter, 09:00 server time.
  const schedules = ['0 9 30 9 *', '0 9 31 12 *', '0 9 31 3 *', '0 9 30 6 *'];
  for (const expr of schedules) {
    cron.schedule(expr, async () => {
      try { await runQuarterlySnapshot(); } catch (e) { console.error('[cron] Quarterly snapshot error:', e); }
    });
  }
  console.log('[cron] Quarterly snapshot cron scheduled (quarter-end 09:00)');
}

// Manual trigger (admin "Run snapshot now").
export async function triggerQuarterlySnapshot(academicYearId?: string) {
  return runQuarterlySnapshot(academicYearId);
}
