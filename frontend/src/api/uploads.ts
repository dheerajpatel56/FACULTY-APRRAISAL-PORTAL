import api from './client';

export const uploadApi = {
  uploadProof: (file: File, onProgress?: (pct: number) => void) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/uploads/proof', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    }).then((r) => r.data as { url: string; originalName: string; size: number; mimeType: string });
  },
  deleteProof: (url: string) =>
    api.delete('/uploads/proof', { data: { url } }).then((r) => r.data),
};
