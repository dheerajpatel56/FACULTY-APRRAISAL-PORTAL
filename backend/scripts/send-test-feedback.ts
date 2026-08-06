import 'dotenv/config';
import prisma from '../src/utils/prismaClient';
import { enqueueEmail, sendEmail } from '../src/services/emailService';

// One-off: deliver a real "feedback_issued" email to a chosen inbox to prove
// SMTP works end-to-end. Temporarily points a faculty's email at the target,
// enqueues (which snapshots toEmail), reverts the address, then sends.

const TARGET = 'dheerajpatel2275@gmail.com';
const FAC = '98CSE011';

async function main() {
  const user = await prisma.user.findUnique({ where: { employeeCode: FAC } });
  if (!user) { console.log('faculty not found'); return; }

  const sub = await prisma.appraisalSubmission.findFirst({
    where: { userId: user.id },
    include: { academicYear: { select: { label: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  if (!sub) { console.log('no submission for faculty'); return; }

  const originalEmail = user.email;
  console.log(`faculty ${FAC} (${user.name}) orig email = ${originalEmail}`);
  console.log(`routing test mail to ${TARGET}, submission ${sub.id}, year ${sub.academicYear.label}`);

  // 1) point the faculty email at the target so enqueue snapshots it
  await prisma.user.update({ where: { id: user.id }, data: { email: TARGET } });

  // 2) enqueue the real feedback_issued notification (toEmail snapshotted = TARGET)
  const id = await enqueueEmail({
    toUserId: user.id,
    template: 'feedback_issued',
    payload: { name: user.name, year: sub.academicYear.label, submissionId: sub.id },
  });
  console.log('enqueued notification id =', id);

  // 3) restore the real faculty email immediately (send uses the snapshot)
  await prisma.user.update({ where: { id: user.id }, data: { email: originalEmail } });
  console.log('faculty email restored to', originalEmail);

  // 4) send via SMTP
  if (id) {
    await sendEmail(id);
    const row = await prisma.emailNotification.findUnique({ where: { id } });
    console.log(`\nSEND RESULT: status=${row?.status} toEmail=${row?.toEmail}${row?.error ? ' error=' + row.error : ''}`);
  }
}

main().finally(() => prisma.$disconnect());
