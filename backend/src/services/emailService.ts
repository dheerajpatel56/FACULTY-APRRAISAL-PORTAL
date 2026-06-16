import nodemailer, { Transporter } from 'nodemailer';
import prisma from '../utils/prismaClient';
import { renderTemplate, TEMPLATE_SUBJECTS } from './emailTemplates';
import { EmailStatus } from '@prisma/client';

const DISABLED = process.env.EMAIL_DISABLED === 'true';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export type EmailTemplateKey =
  | 'submission_received'
  | 'submission_approved'
  | 'submission_rejected'
  | 'submission_unlocked'
  | 'draft_reminder'
  | 'fpgp_signed'
  | 'reviewer_daily_digest'
  | 'password_otp';

interface EnqueueOpts {
  toUserId: string;
  template: EmailTemplateKey;
  payload: Record<string, any>;
  // Idempotency — if set, prevents duplicate sends with same key
  dedupeKey?: string;
  // Respect emailOptIn (default true; set false for critical status emails)
  honorOptIn?: boolean;
}

/**
 * Queue an email send. Creates EmailNotification row (PENDING) — worker picks it up.
 * Returns the row id, or null if skipped (opted out, duplicate, no email address).
 */
export async function enqueueEmail(opts: EnqueueOpts): Promise<string | null> {
  const { toUserId, template, payload, dedupeKey, honorOptIn = false } = opts;

  const user = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!user || !user.email) {
    console.warn(`[email] Skip ${template} — user ${toUserId} has no email`);
    return null;
  }
  if (honorOptIn && !user.emailOptIn) {
    console.log(`[email] Skip ${template} — user ${toUserId} opted out`);
    return null;
  }

  // Dedupe check
  if (dedupeKey) {
    const existing = await prisma.emailNotification.findUnique({ where: { dedupeKey } });
    if (existing) {
      console.log(`[email] Skip ${template} — dedupe key ${dedupeKey} exists`);
      return existing.id;
    }
  }

  const subject = TEMPLATE_SUBJECTS[template](payload);

  const row = await prisma.emailNotification.create({
    data: {
      toUserId,
      toEmail: user.email,
      subject,
      template,
      payload,
      status: EmailStatus.PENDING,
      dedupeKey,
    },
  });

  return row.id;
}

/**
 * Actually send an email via SMTP. Called by worker.
 */
export async function sendEmail(notificationId: string): Promise<void> {
  const row = await prisma.emailNotification.findUnique({ where: { id: notificationId } });
  if (!row) throw new Error(`EmailNotification ${notificationId} not found`);
  if (row.status === EmailStatus.SENT) return;

  if (DISABLED) {
    console.log(`[email:DISABLED] would send ${row.template} to ${row.toEmail} — ${row.subject}`);
    await prisma.emailNotification.update({
      where: { id: row.id },
      data: { status: EmailStatus.SENT, sentAt: new Date() },
    });
    return;
  }

  try {
    const html = renderTemplate(row.template as EmailTemplateKey, row.payload as Record<string, any>);
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: row.toEmail,
      subject: row.subject,
      html,
    });
    await prisma.emailNotification.update({
      where: { id: row.id },
      data: { status: EmailStatus.SENT, sentAt: new Date(), attempts: { increment: 1 } },
    });
    console.log(`[email] Sent ${row.template} to ${row.toEmail}`);
  } catch (e: any) {
    const attempts = row.attempts + 1;
    const failed = attempts >= 3;
    await prisma.emailNotification.update({
      where: { id: row.id },
      data: {
        status: failed ? EmailStatus.FAILED : EmailStatus.PENDING,
        attempts,
        error: String(e?.message ?? e),
      },
    });
    console.error(`[email] Failed ${row.template} to ${row.toEmail} (attempt ${attempts}/3):`, e?.message);
    if (failed) throw e;
  }
}
