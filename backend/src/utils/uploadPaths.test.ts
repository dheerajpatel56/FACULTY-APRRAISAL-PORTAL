import path from 'path';
import { describe, it, expect } from 'vitest';
import { resolveUploadDir } from './uploadPaths';

const backendRoot = path.resolve(__dirname, '..', '..');

describe('resolveUploadDir', () => {
  it('defaults to backend/uploads — the folder the prod compose file mounts', () => {
    expect(resolveUploadDir('')).toBe(path.join(backendRoot, 'uploads'));
    expect(resolveUploadDir('   ')).toBe(path.join(backendRoot, 'uploads'));
  });

  it('resolves a relative UPLOAD_DIR against the backend folder, not the cwd', () => {
    expect(resolveUploadDir('./data/files')).toBe(path.join(backendRoot, 'data', 'files'));
  });

  it('keeps an absolute UPLOAD_DIR as given', () => {
    const abs = path.resolve('/srv/appraisal/uploads');
    expect(resolveUploadDir(abs)).toBe(abs);
    expect(resolveUploadDir(`  ${abs}  `)).toBe(abs);
  });
});
