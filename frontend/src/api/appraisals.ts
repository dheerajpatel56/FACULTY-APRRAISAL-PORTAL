import api from './client';

export const appraisalApi = {
  list: (params?: Record<string, string>) =>
    api.get('/appraisals', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/appraisals/${id}`).then((r) => r.data),
  create: (academicYearId: string) =>
    api.post('/appraisals', { academicYearId }).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put(`/appraisals/${id}`, data).then((r) => r.data),
  submit: (id: string) =>
    api.post(`/appraisals/${id}/submit`).then((r) => r.data),
  withdraw: (id: string) =>
    api.post(`/appraisals/${id}/withdraw`).then((r) => r.data),
  getScore: (id: string) =>
    api.get(`/appraisals/${id}/score`).then((r) => r.data),
  getReview: (id: string) =>
    api.get(`/appraisals/${id}/review`).then((r) => r.data),
  submitReview: (id: string, data: any) =>
    api.post(`/appraisals/${id}/review`, data).then((r) => r.data),
  downloadPdf: (id: string) =>
    api.get(`/appraisals/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
};

export const reviewApi = {
  listPending: () => api.get('/reviews/pending').then((r) => r.data),
};

export const adminApi = {
  unlock: (id: string) =>
    api.post(`/admin/appraisals/${id}/unlock`).then((r) => r.data),
  assignReviewer: (id: string, reviewerId: string) =>
    api.post(`/admin/appraisals/${id}/assign-reviewer`, { reviewerId }).then((r) => r.data),
};
