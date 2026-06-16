import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads', 'appraisals');

export function uploadProof(req: Request, res: Response) {
  const file = (req as any).file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const url = `/uploads/appraisals/${file.filename}`;
  return res.status(201).json({
    url,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  });
}

export function deleteProof(req: Request, res: Response) {
  const { url } = req.body as { url?: string };
  if (!url || !url.startsWith('/uploads/appraisals/')) {
    return res.status(400).json({ error: 'Invalid file url' });
  }
  // Resolve + guard against path traversal
  const filename = path.basename(url);
  const target = path.join(UPLOAD_ROOT, filename);
  if (!target.startsWith(UPLOAD_ROOT)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  fs.promises.unlink(target).catch(() => {}); // best-effort
  return res.json({ message: 'Deleted' });
}
