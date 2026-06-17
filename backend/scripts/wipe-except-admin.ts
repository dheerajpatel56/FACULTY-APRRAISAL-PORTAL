/**
 * Wipe all data EXCEPT admin users and config (Departments, Academic Years).
 *
 * Keeps:  Users with an ADMIN UserRole (+ all their role rows),
 *         Department, AcademicYear, AcademicYearDept.
 * Deletes: all appraisals (+ Cat* + reviews via cascade), all FPGP plans
 *         (+ subsections + reviews via cascade), audit logs, email
 *         notifications, password OTPs, and every non-admin user (+ roles).
 *
 * Run:  npx tsx scripts/wipe-except-admin.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.userRole.findMany({
    where: { role: 'ADMIN' },
    select: { userId: true },
  });
  const adminIds = [...new Set(admins.map((a) => a.userId))];

  if (adminIds.length === 0) {
    throw new Error('No ADMIN-role users found — aborting to avoid wiping everything.');
  }

  console.log(`Preserving ${adminIds.length} admin user(s): ${adminIds.join(', ')}`);

  const result = await prisma.$transaction(async (tx) => {
    // Transactional/user data — order matters for FKs; cascades handle children.
    const appraisals = await tx.appraisalSubmission.deleteMany({});
    const fpgp = await tx.fPGPPlan.deleteMany({});
    const audit = await tx.auditLog.deleteMany({});
    const emails = await tx.emailNotification.deleteMany({});
    const otps = await tx.passwordOtp.deleteMany({});

    // Role rows of non-admin users.
    const roles = await tx.userRole.deleteMany({
      where: { userId: { notIn: adminIds } },
    });

    // Non-admin users.
    const users = await tx.user.deleteMany({
      where: { id: { notIn: adminIds } },
    });

    return { appraisals, fpgp, audit, emails, otps, roles, users };
  });

  console.log('Deleted:');
  console.log(`  appraisals:     ${result.appraisals.count}`);
  console.log(`  fpgp plans:     ${result.fpgp.count}`);
  console.log(`  audit logs:     ${result.audit.count}`);
  console.log(`  emails:         ${result.emails.count}`);
  console.log(`  password OTPs:  ${result.otps.count}`);
  console.log(`  user roles:     ${result.roles.count}`);
  console.log(`  users:          ${result.users.count}`);
  console.log('Done. Departments + academic years kept.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
