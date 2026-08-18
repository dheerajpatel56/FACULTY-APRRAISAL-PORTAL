/**
 * Wipe all data EXCEPT admin users and config (Departments, Academic Years).
 *
 * Keeps:  Users with an ADMIN UserRole (+ all their role rows),
 *         Department, AcademicYear, AcademicYearDept.
 * Deletes: all appraisals (+ Cat* + reviews via cascade), all FPGP plans
 *         (+ subsections + reviews via cascade), audit logs, email
 *         notifications, password OTPs, and every non-admin user (+ roles).
 *
 * DESTRUCTIVE. Defaults to a dry run that only reports what it would delete.
 * The real wipe needs the target database named explicitly, so a command
 * copy-pasted from notes cannot land on the wrong database:
 *
 *   npx tsx scripts/wipe-except-admin.ts                       # dry run
 *   npx tsx scripts/wipe-except-admin.ts --confirm=<dbname>    # actually wipe
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Database name from DATABASE_URL — the caller must repeat it to confirm.
function targetDbName(): string {
  const url = process.env.DATABASE_URL ?? '';
  const name = url.split('/').pop()?.split('?')[0] ?? '';
  return name;
}

async function dryRun(adminIds: string[]) {
  const [appraisals, fpgp, audit, emails, otps, roles, users] = await Promise.all([
    prisma.appraisalSubmission.count(),
    prisma.fPGPPlan.count(),
    prisma.auditLog.count(),
    prisma.emailNotification.count(),
    prisma.passwordOtp.count(),
    prisma.userRole.count({ where: { userId: { notIn: adminIds } } }),
    prisma.user.count({ where: { id: { notIn: adminIds } } }),
  ]);

  console.log(`
DRY RUN — nothing was deleted. Against database "${targetDbName()}" this would delete:

  appraisals:     ${appraisals}
  fpgp plans:     ${fpgp}
  audit logs:     ${audit}
  emails:         ${emails}
  password OTPs:  ${otps}
  user roles:     ${roles}
  users:          ${users}

  Kept: ${adminIds.length} admin user(s), departments, academic years.

To actually run it:  npx tsx scripts/wipe-except-admin.ts --confirm=${targetDbName()}
`);
}

async function main() {
  const admins = await prisma.userRole.findMany({
    where: { role: 'ADMIN' },
    select: { userId: true },
  });
  const adminIds = [...new Set(admins.map((a) => a.userId))];

  if (adminIds.length === 0) {
    throw new Error('No ADMIN-role users found — aborting to avoid wiping everything.');
  }

  const confirmArg = process.argv.find((a) => a.startsWith('--confirm='))?.split('=')[1];
  const db = targetDbName();

  if (confirmArg !== db) {
    if (confirmArg) {
      console.error(`Refusing to wipe: --confirm=${confirmArg} does not match the target database "${db}".`);
      process.exit(1);
    }
    await dryRun(adminIds);
    return;
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
