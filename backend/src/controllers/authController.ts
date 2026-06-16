import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prismaClient';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';

const loginSchema = z.object({
  employeeCode: z.string().min(1),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const { employeeCode, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { employeeCode },
    include: {
      userRoles: {
        where: { isActive: true },
        select: { role: true, departmentId: true },
      },
    },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const payload = { userId: user.id, employeeCode: user.employeeCode };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      employeeCode: user.employeeCode,
      departmentId: user.departmentId,
      roles: user.userRoles,
    },
  });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'User not found' });

    const accessToken = signAccessToken({ userId: user.id, employeeCode: user.employeeCode });
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export async function logout(_req: Request, res: Response) {
  return res.json({ message: 'Logged out' });
}

// ─── Forgot Password (no auth) ──────────────────────────────────────

const OTP_EXPIRY_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const forgotSchema = z.object({
  employeeCode: z.string().min(1),
});

export async function forgotPassword(req: Request, res: Response) {
  const { employeeCode } = forgotSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { employeeCode } });

  // Always return success to prevent user enumeration
  const genericMsg = { message: 'If your account exists, an OTP has been emailed.' };

  if (!user || !user.isActive || !user.email) {
    return res.json(genericMsg);
  }

  const otp = generateOtp();
  const codeHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

  await prisma.passwordOtp.upsert({
    where: { userId: user.id },
    create: { userId: user.id, codeHash, expiresAt, attempts: 0 },
    update: { codeHash, expiresAt, attempts: 0 },
  });

  try {
    const { enqueueEmail } = await import('../services/emailService');
    await enqueueEmail({
      toUserId: user.id,
      template: 'password_otp',
      payload: {
        name: user.name,
        otp,
        expiresInMinutes: OTP_EXPIRY_MIN,
      },
      honorOptIn: false,
    });
  } catch (e) {
    console.error('[email] forgot-password OTP enqueue failed:', e);
  }

  return res.json(genericMsg);
}

const resetSchema = z.object({
  employeeCode: z.string().min(1),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function resetPassword(req: Request, res: Response) {
  const { employeeCode, otp, newPassword } = resetSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { employeeCode },
    include: { passwordOtp: true },
  });
  // Generic error to prevent enumeration
  const invalid = () => res.status(400).json({ error: 'Invalid or expired OTP' });
  if (!user || !user.isActive) return invalid();

  const otpRow = user.passwordOtp;
  if (!otpRow) return invalid();
  if (otpRow.expiresAt < new Date()) {
    await prisma.passwordOtp.delete({ where: { userId: user.id } }).catch(() => {});
    return invalid();
  }
  if (otpRow.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.passwordOtp.delete({ where: { userId: user.id } }).catch(() => {});
    return invalid();
  }

  const ok = await bcrypt.compare(otp, otpRow.codeHash);
  if (!ok) {
    await prisma.passwordOtp.update({
      where: { userId: user.id },
      data: { attempts: { increment: 1 } },
    });
    return invalid();
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    await tx.passwordOtp.delete({ where: { userId: user.id } });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        entityType: 'User',
        entityId: user.id,
      },
    });
  });

  return res.json({ message: 'Password reset successful. You may now log in.' });
}
