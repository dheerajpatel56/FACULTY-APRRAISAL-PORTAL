import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../utils/prismaClient';
import { RoleType } from '@prisma/client';

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads', 'appraisals');

export async function uploadProof(req: Request, res: Response) {
  const file = (req as any).file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  // Record ownership so downloads can be authorized.
  await prisma.uploadedFile.create({
    data: {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploaderId: req.user!.id,
    },
  });

  const url = `/uploads/file/${file.filename}`;
  return res.status(201).json({
    url,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  });
}

// True if `user` may access a file uploaded by `uploaderId` (in `uploaderDept`).
export function canAccess(
  user: NonNullable<Request['user']>,
  uploaderId: string,
  uploaderDept: string | null,
): boolean {
  if (user.id === uploaderId) return true;
  if (user.roles.some((r) => r.role === RoleType.ADMIN)) return true;
  // HoD / Reviewer may view files of faculty in their own department(s).
  return user.roles.some(
    (r) =>
      (r.role === RoleType.HOD || r.role === RoleType.REVIEWER) &&
      r.departmentId != null &&
      r.departmentId === uploaderDept,
  );
}

// Authenticated, ownership-checked file stream. Replaces unguarded static serving.
export async function serveProof(req: Request, res: Response) {
  const filename = path.basename(req.params.filename); // strip any path components
  const record = await prisma.uploadedFile.findUnique({
    where: { filename },
    include: { uploader: { select: { departmentId: true } } },
  });
  if (!record) return res.status(404).json({ error: 'File not found' });

  if (!canAccess(req.user!, record.uploaderId, record.uploader.departmentId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const target = path.join(UPLOAD_ROOT, filename);
  if (!target.startsWith(UPLOAD_ROOT + path.sep)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  if (!fs.existsSync(target)) return res.status(404).json({ error: 'File missing' });

  res.setHeader('Content-Type', record.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `inline; filename="${record.originalName.replace(/["\r\n]/g, '')}"`);
  return res.sendFile(target);
}

export async function deleteProof(req: Request, res: Response) {
  const { url } = req.body as { url?: string };
  if (!url) return res.status(400).json({ error: 'Invalid file url' });

  const filename = path.basename(url);
  const record = await prisma.uploadedFile.findUnique({ where: { filename } });
  if (!record) return res.json({ message: 'Deleted' }); // already gone / unknown

  // Only the uploader or an admin may delete.
  const isAdmin = req.user!.roles.some((r) => r.role === RoleType.ADMIN);
  if (record.uploaderId !== req.user!.id && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const target = path.join(UPLOAD_ROOT, filename);
  if (target.startsWith(UPLOAD_ROOT + path.sep)) {
    await fs.promises.unlink(target).catch(() => {}); // best-effort
  }
  await prisma.uploadedFile.delete({ where: { filename } }).catch(() => {});
  return res.json({ message: 'Deleted' });
}
