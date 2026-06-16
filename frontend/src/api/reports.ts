import api from './client';

export const reportApi = {
  getDeptReport: (params?: { year?: string; dept?: string }) =>
    api.get('/reports/department', { params }).then((r) => r.data),
  getInstituteReport: (params?: { year?: string }) =>
    api.get('/reports/institute', { params }).then((r) => r.data),
  exportReport: (params: { year?: string; dept?: string; format: 'excel' | 'json' }) =>
    api.get('/reports/export', { params, responseType: params.format === 'excel' ? 'blob' : 'json' }).then((r) => r.data),
};
