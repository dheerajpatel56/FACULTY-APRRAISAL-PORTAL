import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';

export async function listAuditLogs(req: Request, res: Response) {
  const { userId, action, entityType, from, to, limit, offset } = req.query;

  const where: any = {};
  if (userId) where.userId = userId as string;
  if (action) where.action = { contains: action as string, mode: 'insensitive' };
  if (entityType) where.entityType = entityType as string;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from as string);
    if (to) where.createdAt.lte = new Date(to as string);
  }

  const take = Math.min(Number(limit ?? 100), 500);
  const skip = Number(offset ?? 0);

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, employeeCode: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return res.json({ rows, total, limit: take, offset: skip });
}

export async function listAuditActions(_req: Request, res: Response) {
  // Distinct action strings for filter dropdown
  const rows = await prisma.auditLog.findMany({
    distinct: ['action'],
    select: { action: true },
    orderBy: { action: 'asc' },
    take: 200,
  });
  return res.json(rows.map((r) => r.action));
}
