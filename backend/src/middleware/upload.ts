import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { PROOF_DIR as UPLOAD_ROOT } from '../utils/uploadPaths';

// Ensure dest dir exists
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = sanitize(path.basename(file.originalname, ext));
    cb(null, `${randomUUID()}-${base}${ext}`);
  },
});

/**
 * Per-file upload ceiling, in megabytes. Set MAX_UPLOAD_MB to change it.
 *
 * This bounds a single uploaded file. It does not apply to proofs supplied as a
 * link (Google Drive and the like) — those are stored as a URL and never pass
 * through multer, so a faculty with an oversized scan can always link it
 * instead of uploading.
 */
function resolveMaxUploadMb(): number {
  const raw = process.env.MAX_UPLOAD_MB;
  if (raw === undefined || raw.trim() === '') return 5;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    console.warn(`[upload] Ignoring invalid MAX_UPLOAD_MB="${raw}" — falling back to 5 MB`);
    return 5;
  }
  return n;
}

export const MAX_UPLOAD_MB = resolveMaxUploadMb();
export const MAX_UPLOAD_BYTES = Math.floor(MAX_UPLOAD_MB * 1024 * 1024);
export const ALLOWED_UPLOAD_MIME = [...ALLOWED_MIME];

export const proofUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, PNG, JPEG, WEBP files allowed'));
  },
});
