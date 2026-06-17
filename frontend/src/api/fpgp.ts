import api from './client';

export const fpgpApi = {
  getTemplate: () => api.get('/fpgp/template').then((r) => r.data),
  getMyPlan: (year: string) => api.get('/fpgp/me', { params: { year } }).then((r) => r.data),
  createPlan: (academicYearId: string) =>
    api.post('/fpgp', { academicYearId }).then((r) => r.data),
  getPlanDetail: (id: string) => api.get(`/fpgp/${id}`).then((r) => r.data),
  updateSubsections: (id: string, subs: any[]) =>
    api.put(`/fpgp/${id}/subsections`, subs).then((r) => r.data),
  facultySign: (id: string) => api.post(`/fpgp/${id}/sign`).then((r) => r.data),
  hodSign: (id: string) => api.post(`/fpgp/${id}/hod-sign`).then((r) => r.data),
  getDeptPlans: (year: string) =>
    api.get('/fpgp/department', { params: { year } }).then((r) => r.data),
  addReview: (id: string, comments: string) =>
    api.post(`/fpgp/${id}/review`, { comments }).then((r) => r.data),
  evaluate: (academicYearId?: string) =>
    api.post('/fpgp/evaluate', academicYearId ? { academicYearId } : {}).then((r) => r.data),
  downloadPdf: (id: string) =>
    api.get(`/fpgp/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
};
