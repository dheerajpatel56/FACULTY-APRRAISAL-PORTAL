import path from 'path';

// The backend package root (…/backend). Same answer from src/ under tsx and
// from dist/ in the built image (/app), because both sit one level below it.
const BACKEND_ROOT = path.join(__dirname, '..', '..');

/**
 * Where uploaded files live on disk. Set UPLOAD_DIR to move it — an absolute
 * path, or one relative to the backend folder. Unset means `backend/uploads`,
 * which is the folder docker-compose.prod.yml mounts at /app/uploads.
 *
 * None of this is in the database. A pg_dump on its own restores rows that
 * point at proof files which no longer exist, so this folder has to be backed
 * up alongside it — scripts/backup.sh does both.
 */
export function resolveUploadDir(raw: string | undefined = process.env.UPLOAD_DIR): string {
  if (raw === undefined || raw.trim() === '') return path.join(BACKEND_ROOT, 'uploads');
  return path.resolve(BACKEND_ROOT, raw.trim());
}

export const UPLOAD_DIR = resolveUploadDir();

/** Proof files for appraisals, one level below UPLOAD_DIR. */
export const PROOF_DIR = path.join(UPLOAD_DIR, 'appraisals');
