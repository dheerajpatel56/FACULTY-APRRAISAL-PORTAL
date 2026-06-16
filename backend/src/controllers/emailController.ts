import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prismaClient';
import { EmailStatus } from '@prisma/client';
import { sendEmail } from '../services/emailService';
import { triggerDraftReminders, triggerReviewerDigest } from '../cron/reminders';

export async function listEmails(req: Request, res: Response) {
  const { status, userId, limit, offset, paginated } = req.query;
  const where: any = {};
  if (status) where.status = status as EmailStatus;
  if (userId) where.toUserId = userId;

  const include = { toUser: { select: { id: true, name: true, employeeCode: true, email: true } } };

  if (paginated === 'true') {
    const take = Math.min(Number(limit ?? 50), 200);
    const skip = Number(offset ?? 0);
    const [rows, total] = await Promise.all([
      prisma.emailNotification.findMany({ where, include, orderBy: { createdAt: 'desc' }, take, skip }),
      prisma.emailNotification.count({ where }),
    ]);
    return res.json({ rows, total, limit: take, offset: skip });
  }

  const rows = await prisma.emailNotification.findMany({
    where, include,
    orderBy: { createdAt: 'desc' },
    take: limit ? Number(limit) : 100,
  });
  return res.json(rows);
}

export async function retryEmail(req: Request, res: Response) {
  const row = await prisma.emailNotification.findUnique({ where: { id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Not found' });

  // Reset to PENDING and clear attempts cap
  await prisma.emailNotification.update({
    where: { id: row.id },
    data: { status: EmailStatus.PENDING, attempts: 0, error: null },
  });

  // Send immediately
  try {
    await sendEmail(row.id);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Send failed' });
  }

  return res.json({ message: 'Retried' });
}

export async function manualTrigger(req: Request, res: Response) {
  const { type } = z.object({ type: z.enum(['draft_reminders', 'reviewer_digest']) }).parse(req.body);
  if (type === 'draft_reminders') await triggerDraftReminders();
  else await triggerReviewerDigest();
  return res.json({ message: `${type} triggered` });
}
