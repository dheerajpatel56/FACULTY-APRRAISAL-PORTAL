import { Request, Response, NextFunction } from 'express';
import { RoleType } from '@prisma/client';

export const roleGuard = (allowedRoles: RoleType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });

    const hasRole = user.roles.some((r) => allowedRoles.includes(r.role));
    if (!hasRole) return res.status(403).json({ error: 'Insufficient permissions' });

    next();
  };
};
