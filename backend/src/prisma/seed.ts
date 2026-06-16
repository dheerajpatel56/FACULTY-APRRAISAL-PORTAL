import { PrismaClient, RoleType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Composite unique with null departmentId fails in Prisma 6 — use manual ensure
async function ensureRole(userId: string, role: RoleType, assignedBy: string, departmentId: string | null = null) {
  const existing = await prisma.userRole.findFirst({ where: { userId, role, departmentId } });
  if (existing) return existing;
  return prisma.userRole.create({ data: { userId, role, departmentId, assignedBy } });
}

async function main() {
  console.log('Seeding...');

  const [cse, ece, eee] = await Promise.all([
    prisma.department.upsert({ where: { code: 'CSE' }, create: { name: 'Computer Science & Engineering', code: 'CSE' }, update: {} }),
    prisma.department.upsert({ where: { code: 'ECE' }, create: { name: 'Electronics & Communication Engineering', code: 'ECE' }, update: {} }),
    prisma.department.upsert({ where: { code: 'EEE' }, create: { name: 'Electrical & Electronics Engineering', code: 'EEE' }, update: {} }),
  ]);

  await prisma.academicYear.upsert({
    where: { label: '2025-26' },
    create: {
      label: '2025-26',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2026-05-31'),
      submissionOpen: true,
    },
    update: { submissionOpen: true },
  });

  const hash = (pw: string) => bcrypt.hash(pw, 12);

  // Admin
  const adminHash = await hash('admin123');
  const admin = await prisma.user.upsert({
    where: { employeeCode: 'ADMIN001' },
    create: { employeeCode: 'ADMIN001', name: 'System Admin', email: 'admin@college.edu', passwordHash: adminHash },
    update: {},
  });
  await ensureRole(admin.id, RoleType.ADMIN, admin.id, null);

  // HODs
  const hodHash = await hash('hod123');
  const hods = [
    { code: 'HOD001', name: 'Dr. Rajesh Kumar', email: 'hod.cse@college.edu', dept: cse },
    { code: 'HOD002', name: 'Dr. Sunita Verma', email: 'hod.ece@college.edu', dept: ece },
    { code: 'HOD003', name: 'Dr. Amit Sharma', email: 'hod.eee@college.edu', dept: eee },
  ];

  for (const h of hods) {
    const hod = await prisma.user.upsert({
      where: { employeeCode: h.code },
      create: { employeeCode: h.code, name: h.name, email: h.email, passwordHash: hodHash, departmentId: h.dept.id, designation: 'Associate Professor' },
      update: {},
    });
    await ensureRole(hod.id, RoleType.FACULTY, admin.id, null);
    await ensureRole(hod.id, RoleType.HOD, admin.id, h.dept.id);
  }

  // Faculty
  const facHash = await hash('faculty123');
  const depts = [cse, ece, eee];
  for (let di = 0; di < depts.length; di++) {
    const d = depts[di];
    for (let fi = 1; fi <= 5; fi++) {
      const code = `FAC${(di + 1) * 10 + fi}`;
      const fac = await prisma.user.upsert({
        where: { employeeCode: code },
        create: {
          employeeCode: code,
          name: `Faculty ${code}`,
          email: `${code.toLowerCase()}@college.edu`,
          passwordHash: facHash,
          departmentId: d.id,
          designation: 'Assistant Professor',
        },
        update: {},
      });
      await ensureRole(fac.id, RoleType.FACULTY, admin.id, null);

      // First 2 CSE faculty also REVIEWER for ECE
      if (di === 0 && fi <= 2) {
        await ensureRole(fac.id, RoleType.REVIEWER, admin.id, ece.id);
      }
    }
  }

  console.log('Seed complete!');
  console.log('Admin: ADMIN001 / admin123');
  console.log('HoD CSE: HOD001 / hod123');
  console.log('HoD ECE: HOD002 / hod123');
  console.log('Faculty CSE: FAC11-FAC15 / faculty123 (FAC11,FAC12 also REVIEWER for ECE)');
  console.log('Faculty ECE: FAC21-FAC25 / faculty123');
  console.log('Faculty EEE: FAC31-FAC35 / faculty123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
