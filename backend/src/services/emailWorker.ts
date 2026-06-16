import prisma from '../utils/prismaClient';
import { sendEmail } from './emailService';
import { EmailStatus } from '@prisma/client';
import cron from 'node-cron';

const BATCH_SIZE = 10;
let running = false;

/**
 * Poll PENDING email rows, send via SMTP. Runs every 30s.
 */
async function processBatch() {
  if (running) return;
  running = true;
  try {
    const pending = await prisma.emailNotification.findMany({
      where: { status: EmailStatus.PENDING, attempts: { lt: 3 } },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });
    if (pending.length === 0) return;
    console.log(`[emailWorker] Processing ${pending.length} pending email(s)`);
    for (const row of pending) {
      try {
        await sendEmail(row.id);
      } catch (e) {
        // sendEmail already logs + updates row; swallow to continue batch
      }
    }
  } catch (e) {
    console.error('[emailWorker] Batch error:', e);
  } finally {
    running = false;
  }
}

export function startEmailWorker() {
  // Every 30 seconds
  cron.schedule('*/30 * * * * *', processBatch);
  console.log('[emailWorker] Started (polling every 30s)');
  // Run immediately on startup
  setTimeout(processBatch, 2000);
}
