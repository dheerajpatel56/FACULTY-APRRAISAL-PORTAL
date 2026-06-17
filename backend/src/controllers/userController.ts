import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { parse as parseCsv } from 'csv-parse/sync';
import prisma from '../utils/prismaClient';
import { RoleType } from '@prisma/client';

const profileUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  contactAddress: z.string().optional(),
  designation: z.string().optional(),
  specialization: z.string().optional(),
  educationalQuals: z.string().optional(),
});

const createUserSchema = z.object({
  employeeCode: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  departmentId: z.string().optional(),
  designation: z.string().optional(),
});

export async function getMe(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      department: true,
      userRoles: { where: { isActive: true }, include: { department: true } },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { passwordHash, ...safeUser } = user;
  return res.json(safeUser);
}

export async function updateProfile(req: Request, res: Response) {
  const data = profileUpdateSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
  });
  const { passwordHash, ...safeUser } = user;
  return res.json(safeUser);
}

// ─── Password change with email OTP ─────────────────────────────────

const OTP_EXPIRY_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const requestOtpSchema = z.object({
  currentPassword: z.string().min(1),
});

export async function requestPasswordOtp(req: Request, res: Response) {
  const { currentPassword } = requestOtpSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.email) return res.status(400).json({ error: 'No email on file — contact admin' });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Current password incorrect' });

  const otp = generateOtp();
  const codeHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

  await prisma.passwordOtp.upsert({
    where: { userId: user.id },
    create: { userId: user.id, codeHash, expiresAt, attempts: 0 },
    update: { codeHash, expiresAt, attempts: 0 },
  });

  // Send OTP via email (do not honor optIn — security email)
  const { enqueueEmail } = await import('../services/emailService');
  await enqueueEmail({
    toUserId: user.id,
    template: 'password_otp',
    payload: {
      name: user.name,
      otp,
      expiresInMinutes: OTP_EXPIRY_MIN,
    },
    // No dedupe — each request generates new OTP
    honorOptIn: false,
  });

  return res.json({ message: `OTP sent to ${user.email.replace(/(.{2}).+(@.+)/, '$1***$2')}`, expiresInMinutes: OTP_EXPIRY_MIN });
}

const verifyChangeSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function changePasswordWithOtp(req: Request, res: Response) {
  const { otp, newPassword } = verifyChangeSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { passwordOtp: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const otpRow = user.passwordOtp;
  if (!otpRow) return res.status(400).json({ error: 'No OTP requested — request OTP first' });
  if (otpRow.expiresAt < new Date()) {
    await prisma.passwordOtp.delete({ where: { userId: user.id } }).catch(() => {});
    return res.status(400).json({ error: 'OTP expired — request a new one' });
  }
  if (otpRow.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.passwordOtp.delete({ where: { userId: user.id } }).catch(() => {});
    return res.status(400).json({ error: 'Too many invalid attempts — request a new OTP' });
  }

  const ok = await bcrypt.compare(otp, otpRow.codeHash);
  if (!ok) {
    await prisma.passwordOtp.update({
      where: { userId: user.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = OTP_MAX_ATTEMPTS - (otpRow.attempts + 1);
    return res.status(400).json({ error: `Invalid OTP — ${remaining} attempt(s) remaining` });
  }

  // OTP valid: hash new password, atomic update
  const newHash = await bcrypt.hash(newPassword, 12);
  const sameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsOld) return res.status(400).json({ error: 'New password must differ from current' });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    await tx.passwordOtp.delete({ where: { userId: user.id } });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: user.id,
      },
    });
  });

  return res.json({ message: 'Password updated successfully' });
}

// Admin: list all users
export async function listUsers(req: Request, res: Response) {
  const { dept, role, search, limit, offset } = req.query;

  const where: any = {
    isActive: true,
    ...(dept ? { departmentId: dept as string } : {}),
    ...(search ? { OR: [{ name: { contains: search as string, mode: 'insensitive' } }, { employeeCode: { contains: search as string, mode: 'insensitive' } }] } : {}),
    ...(role ? { userRoles: { some: { role: role as RoleType, isActive: true } } } : {}),
  };
  const include = {
    department: true,
    userRoles: { where: { isActive: true }, include: { department: true } },
  };

  if (limit !== undefined) {
    const take = Math.min(Number(limit), 200);
    const skip = Number(offset ?? 0);
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, include, orderBy: { name: 'asc' }, take, skip }),
      prisma.user.count({ where }),
    ]);
    return res.json({
      rows: users.map(({ passwordHash, ...u }) => u),
      total,
      limit: take,
      offset: skip,
    });
  }

  const users = await prisma.user.findMany({ where, include, orderBy: { name: 'asc' } });
  return res.json(users.map(({ passwordHash, ...u }) => u));
}

export async function createUser(req: Request, res: Response) {
  const { employeeCode, name, email, password, departmentId, designation } = createUserSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { employeeCode, name, email, passwordHash, departmentId, designation },
    });

    await tx.userRole.create({
      data: {
        userId: newUser.id,
        role: RoleType.FACULTY,
        assignedBy: req.user!.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: newUser.id,
      },
    });

    return newUser;
  });

  const { passwordHash: _, ...safeUser } = user;
  return res.status(201).json(safeUser);
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const data = profileUpdateSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id }, data });
  const { passwordHash, ...safeUser } = user;
  return res.json(safeUser);
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;

  await prisma.$transaction(async (tx) => {
    // Reviews this user gave on OTHER users' work (not covered by cascades).
    await tx.appraisalReview.deleteMany({ where: { reviewerId: id } });
    await tx.fPGPReview.deleteMany({ where: { reviewerId: id } });

    // Detach this user as HoD signer on other users' FPGP plans.
    await tx.fPGPPlan.updateMany({
      where: { hodSignedBy: id },
      data: { hodSignedBy: null },
    });

    // This user's own data — cascades remove Cat*/subsections/reviews.
    await tx.appraisalSubmission.deleteMany({ where: { userId: id } });
    await tx.fPGPPlan.deleteMany({ where: { userId: id } });
    await tx.auditLog.deleteMany({ where: { userId: id } });
    await tx.emailNotification.deleteMany({ where: { toUserId: id } });
    await tx.passwordOtp.delete({ where: { userId: id } }).catch(() => {});
    await tx.userRole.deleteMany({ where: { userId: id } });

    await tx.user.delete({ where: { id } });
  });

  return res.json({ message: 'User deleted' });
}

export async function assignRole(req: Request, res: Response) {
  const { id } = req.params;
  const { role, departmentId } = z.object({
    role: z.nativeEnum(RoleType),
    departmentId: z.string().nullable().optional(),
  }).parse(req.body);

  const deptId = departmentId ?? null;

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  // If role needs dept, verify dept exists + active
  if ((role === RoleType.HOD || role === RoleType.REVIEWER) && !deptId) {
    return res.status(400).json({ error: `${role} role requires a department` });
  }
  if (deptId) {
    const dept = await prisma.department.findFirst({ where: { id: deptId, isActive: true } });
    if (!dept) return res.status(400).json({ error: 'Department not found or inactive' });
  }

  // Prisma 6 nullable-composite-unique workaround: findFirst then create/update
  const userRole = await prisma.$transaction(async (tx) => {
    const existing = await tx.userRole.findFirst({
      where: { userId: id, role, departmentId: deptId },
    });

    let ur;
    if (existing) {
      ur = await tx.userRole.update({
        where: { id: existing.id },
        data: { isActive: true, assignedBy: req.user!.id, assignedAt: new Date() },
      });
    } else {
      ur = await tx.userRole.create({
        data: { userId: id, role, departmentId: deptId, assignedBy: req.user!.id, isActive: true },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'ROLE_ASSIGNED',
        entityType: 'UserRole',
        entityId: ur.id,
        metadata: { role, departmentId: deptId },
      },
    });

    return ur;
  });

  return res.json(userRole);
}

export async function revokeRole(req: Request, res: Response) {
  const { id: targetUserId, roleId } = req.params;
  const existing = await prisma.userRole.findUnique({
    where: { id: roleId },
    include: { department: { select: { code: true, name: true } } },
  });
  if (!existing) return res.status(404).json({ error: 'Role not found' });

  await prisma.$transaction(async (tx) => {
    await tx.userRole.update({ where: { id: roleId }, data: { isActive: false } });
    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'ROLE_REVOKED',
        entityType: 'UserRole',
        entityId: roleId,
        metadata: {
          targetUserId,
          role: existing.role,
          departmentId: existing.departmentId,
          departmentCode: existing.department?.code ?? null,
          departmentName: existing.department?.name ?? null,
        },
      },
    });
  });

  return res.json({ message: 'Role revoked' });
}

// ───── Bulk CSV Import ─────────────────────────────────────────────

const TEMPLATE_CSV = `employeeCode,name,email,password,designation,department,dateOfJoining,phone,specialization,educationalQuals,role
FAC001,John Doe,john.doe@vnrvjiet.in,Welcome@123,Assistant Professor,CSE,2020-08-15,9876543210,Machine Learning,M.Tech PhD,FACULTY
HOD001,Dr. Rao,rao@vnrvjiet.in,Welcome@123,Professor & HoD,CSE,2010-01-15,9876543212,Algorithms,PhD,HOD
REV001,Dr. Iyer,iyer@vnrvjiet.in,Welcome@123,Professor,IT,2012-03-20,9876543213,Networks,PhD,REVIEWER
`;

export function bulkImportTemplate(_req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=user-import-template.csv');
  return res.send(TEMPLATE_CSV);
}

const REQUIRED_COLS = ['employeeCode', 'name', 'email', 'password', 'department'];
const VALID_ROLES = ['FACULTY', 'HOD', 'REVIEWER', 'ADMIN'];

interface ParsedRow {
  row: number;
  data: Record<string, string>;
  errors: string[];
}

function validateRow(idx: number, raw: any, deptCodes: Set<string>, seenCodes: Set<string>, seenEmails: Set<string>): ParsedRow {
  const errors: string[] = [];
  const data: Record<string, string> = {};

  for (const col of REQUIRED_COLS) {
    const v = String(raw[col] ?? '').trim();
    if (!v) errors.push(`Missing required column: ${col}`);
    data[col] = v;
  }

  // Optional columns
  for (const col of ['designation', 'dateOfJoining', 'phone', 'specialization', 'educationalQuals', 'role']) {
    data[col] = String(raw[col] ?? '').trim();
  }

  // Email format
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }

  // Password min length
  if (data.password && data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  // Department exists
  if (data.department && !deptCodes.has(data.department.toUpperCase())) {
    errors.push(`Department code "${data.department}" not found`);
  }

  // Role valid
  const role = (data.role || 'FACULTY').toUpperCase();
  if (!VALID_ROLES.includes(role)) {
    errors.push(`Invalid role "${data.role}" — must be one of ${VALID_ROLES.join(', ')}`);
  }
  data.role = role;

  // Date format
  if (data.dateOfJoining) {
    const d = new Date(data.dateOfJoining);
    if (isNaN(d.getTime())) {
      errors.push(`Invalid dateOfJoining "${data.dateOfJoining}" — use YYYY-MM-DD`);
    }
  }

  // Duplicate within CSV
  if (data.employeeCode) {
    const codeKey = data.employeeCode.toUpperCase();
    if (seenCodes.has(codeKey)) errors.push(`Duplicate employeeCode within CSV: ${data.employeeCode}`);
    seenCodes.add(codeKey);
  }
  if (data.email) {
    const emailKey = data.email.toLowerCase();
    if (seenEmails.has(emailKey)) errors.push(`Duplicate email within CSV: ${data.email}`);
    seenEmails.add(emailKey);
  }

  return { row: idx + 2, data, errors }; // +2: 1-indexed + header row
}

const bulkImportSchema = z.object({
  csv: z.string().min(1, 'CSV content required'),
  dryRun: z.boolean().default(true),
});

export async function bulkImportUsers(req: Request, res: Response) {
  const { csv, dryRun } = bulkImportSchema.parse(req.body);

  let rawRows: any[];
  try {
    rawRows = parseCsv(csv, { columns: true, skip_empty_lines: true, trim: true });
  } catch (e: any) {
    return res.status(400).json({ error: `CSV parse error: ${e?.message ?? e}` });
  }

  if (rawRows.length === 0) return res.status(400).json({ error: 'CSV has no data rows' });
  if (rawRows.length > 500) return res.status(400).json({ error: 'CSV too large (max 500 rows)' });

  // Load all departments + existing users for validation
  const [depts, existingUsers] = await Promise.all([
    prisma.department.findMany({ select: { id: true, code: true } }),
    prisma.user.findMany({ select: { employeeCode: true, email: true } }),
  ]);
  const deptCodeToId = new Map(depts.map((d) => [d.code.toUpperCase(), d.id]));
  const deptCodes = new Set(deptCodeToId.keys());
  const existingCodes = new Set(existingUsers.map((u) => u.employeeCode.toUpperCase()));
  const existingEmails = new Set(existingUsers.map((u) => u.email?.toLowerCase()).filter(Boolean) as string[]);

  // Parse + validate all rows
  const seenCodes = new Set<string>();
  const seenEmails = new Set<string>();
  const parsed = rawRows.map((r, i) => validateRow(i, r, deptCodes, seenCodes, seenEmails));

  // Check against existing DB
  for (const p of parsed) {
    if (p.errors.length) continue;
    if (existingCodes.has(p.data.employeeCode.toUpperCase())) {
      p.errors.push(`employeeCode "${p.data.employeeCode}" already exists`);
    }
    if (p.data.email && existingEmails.has(p.data.email.toLowerCase())) {
      p.errors.push(`email "${p.data.email}" already exists`);
    }
  }

  const valid = parsed.filter((p) => p.errors.length === 0);
  const invalid = parsed.filter((p) => p.errors.length > 0);

  if (dryRun) {
    return res.json({
      dryRun: true,
      total: parsed.length,
      validCount: valid.length,
      invalidCount: invalid.length,
      preview: parsed.slice(0, 100), // cap preview size
    });
  }

  // Actually create users
  const created: any[] = [];
  const failed: any[] = [];

  for (const p of valid) {
    try {
      const passwordHash = await bcrypt.hash(p.data.password, 12);
      const departmentId = deptCodeToId.get(p.data.department.toUpperCase());
      const dateOfJoining = p.data.dateOfJoining ? new Date(p.data.dateOfJoining) : null;
      const role = p.data.role as RoleType;

      await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            employeeCode: p.data.employeeCode,
            name: p.data.name,
            email: p.data.email,
            passwordHash,
            designation: p.data.designation || null,
            departmentId: departmentId || null,
            dateOfJoining,
            phone: p.data.phone || null,
            specialization: p.data.specialization || null,
            educationalQuals: p.data.educationalQuals || null,
          },
        });

        await tx.userRole.create({
          data: {
            userId: newUser.id,
            role,
            departmentId: role === RoleType.HOD || role === RoleType.REVIEWER ? departmentId : null,
            assignedBy: req.user!.id,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user!.id,
            action: 'USER_BULK_IMPORTED',
            entityType: 'User',
            entityId: newUser.id,
            metadata: { row: p.row, role },
          },
        });

        created.push({ row: p.row, employeeCode: newUser.employeeCode, id: newUser.id });
      });
    } catch (e: any) {
      failed.push({ row: p.row, employeeCode: p.data.employeeCode, error: e?.message ?? String(e) });
    }
  }

  return res.json({
    dryRun: false,
    total: parsed.length,
    createdCount: created.length,
    skippedCount: invalid.length,
    failedCount: failed.length,
    created,
    failed,
    skipped: invalid.map((p) => ({ row: p.row, employeeCode: p.data.employeeCode, errors: p.errors })),
  });
}
