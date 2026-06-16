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
    const userRoles = await prisma.userRole.findMany({
      where: { userId: payload.userId, isActive: true },
      select: { role: true, departmentId: true },
    });

    req.user = {
      id: payload.userId,
      employeeCode: payload.employeeCode,
      roles: userRoles,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
