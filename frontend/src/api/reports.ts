import api from './client';

export const reportApi = {
  getDeptReport: (params?: { year?: string; dept?: string }) =>
    api.get('/reports/department', { params }).then((r) => r.data),
  getInstituteReport: (params?: { year?: string }) =>
    api.get('/reports/institute', { params }).then((r) => r.data),
  exportReport: (params: { year?: string; dept?: string; format: 'excel' | 'json' }) =>
    api.get('/reports/export', { params, responseType: params.format === 'excel' ? 'blob' : 'json' }).then((r) => r.data),
  getCriteria: (params?: { academicYearId?: string; dept?: string }): Promise<CriteriaReport> =>
    api.get('/reports/criteria', { params }).then((r) => r.data),
};

export interface CategoryBreakdown { total: number; [k: string]: number }
export interface ScoreBreakdown {
  cat1: CategoryBreakdown; cat2: CategoryBreakdown; cat3: CategoryBreakdown;
  cat4: CategoryBreakdown; cat5: CategoryBreakdown; selfTotal: number;
}
export interface CriteriaRow {
  faculty: { id: string; name: string; employeeCode: string; department?: { name: string; code: string } | null };
  status: string;
  grandTotal: number | null;
  breakdown: ScoreBreakdown;
}
export interface CriteriaReport {
  year: { id: string; label: string };
  rows: CriteriaRow[];
}
