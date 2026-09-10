import { Request, Response } from 'express';
import { z } from 'zod';
import { RoleType } from '@prisma/client';
import prisma from '../utils/prismaClient';

const deptSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});

// Inactive departments are hidden from every form and picker, which also hides
// anything still attached to one — an incharge role in a department that was
// later switched off became invisible, and so unrevocable, on the Incharges
// page. An admin may ask for the full list; nobody else can, whatever they pass.
export async function listDepartments(req: Request, res: Response) {
  const isAdmin = req.user?.roles.some((r) => r.role === RoleType.ADMIN) ?? false;
  const includeInactive = isAdmin && req.query.includeInactive === 'true';
  const depts = await prisma.department.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: 'asc' },
  });
  return res.json(depts);
}

export async function createDepartment(req: Request, res: Response) {
  const data = deptSchema.parse(req.body);
  const dept = await prisma.department.create({ data });
  return res.status(201).json(dept);
}

export async function updateDepartment(req: Request, res: Response) {
  const { id } = req.params;
  const data = deptSchema.partial().parse(req.body);
  const dept = await prisma.department.update({ where: { id }, data });
  return res.json(dept);
}

export async function deleteDepartment(req: Request, res: Response) {
  const { id } = req.params;
  const dept = await prisma.department.findUnique({
    where: { id },
    include: { users: { where: { isActive: true }, select: { id: true } } },
  });
  if (!dept) return res.status(404).json({ error: 'Not found' });

  if (dept.users.length > 0) {
    return res.status(400).json({
      error: `Cannot deactivate — ${dept.users.length} active user(s) in this department. Reassign or deactivate users first.`,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.department.update({ where: { id }, data: { isActive: false } });
    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DEPARTMENT_DEACTIVATED',
        entityType: 'Department',
        entityId: id,
        metadata: { code: dept.code, name: dept.name },
      },
    });
  });

  return res.json({ message: 'Department deactivated' });
}
