import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../utils/prismaClient';
import { RoleType } from '@prisma/client';

export interface AuthUser {
  id: string;
  employeeCode: string;
  roles: Array<{ role: RoleType; departmentId: string | null }>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);

    // Verify the account still exists and is active — a token issued before
    // deactivation/deletion must not keep working for its full lifetime.
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        isActive: true,
        userRoles: { where: { isActive: true }, select: { role: true, departmentId: true } },
      },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Account inactive or not found' });
    }

    req.user = {
      id: payload.userId,
      employeeCode: payload.employeeCode,
      roles: user.userRoles,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
