import api from './client';

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface ReviewWindow {
  id: string;
  academicYearId: string;
  quarter: Quarter;
  startDate: string;
  endDate: string;
  enabled: boolean;
  lastRunAt: string | null;
}

export interface ReviewWindowInput {
  academicYearId: string;
  quarter: Quarter;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  enabled: boolean;
}

export const reviewWindowApi = {
  list: (academicYearId: string): Promise<ReviewWindow[]> =>
    api.get('/admin/review-windows', { params: { academicYearId } }).then((r) => r.data),
  upsert: (body: ReviewWindowInput): Promise<ReviewWindow> =>
    api.put('/admin/review-windows', body).then((r) => r.data),
  remove: (id: string): Promise<void> => api.delete(`/admin/review-windows/${id}`).then(() => undefined),
};
