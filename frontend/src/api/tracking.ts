import api from './client';

export interface Actuals {
  totalScore: number;
  totalScoreSource: 'HOD' | 'SELF';
  feedback: number;
  indexedCount: number;
  journalCount: number;
  patentCount: number;
  projectCount: number;
  consultancyCount: number;
}

export interface Requirement {
  key: string;
  label: string;
  target: string;
  actual: string;
  met: boolean;
  gating: boolean;
}

export interface TrackingRow {
  submissionId: string;
  status: string;
  redListed: boolean;
  faculty: { id: string; name: string; employeeCode: string; designation: string | null };
  department: { name: string; code: string } | null;
  cadre: string | null;
  cadreLabel: string | null;
  expYears: number;
  actuals: Actuals;
  eligibility: { requirements: Requirement[]; eligible: boolean; target: any };
  // Manual decisions by the admin/dean, null until decided.
  tier: 'T1' | 'T2' | 'T3' | null;
  eligible: boolean | null;
}

export type TierKey = 'T1' | 'T2' | 'T3' | 'none';

export interface Aggregates {
  total: number;
  eligible: number;
  byTier: Record<TierKey, number>;
  byCadre: Record<string, { total: number; eligible: number; tiers: Record<TierKey, number> }>;
}

export interface TrackingResponse {
  year: { id: string; label: string };
  hasTargets: boolean;
  aggregates: Aggregates;
  rows: TrackingRow[];
}

export const trackingApi = {
  get: (academicYearId?: string): Promise<TrackingResponse> =>
    api.get('/tracking', { params: academicYearId ? { academicYearId } : {} }).then((r) => r.data),
  runSnapshot: (academicYearId?: string): Promise<{ message: string; quarter: string; faculty: number }> =>
    api.post('/admin/tracking/snapshot', academicYearId ? { academicYearId } : {}).then((r) => r.data),
  setTier: (userId: string, academicYearId: string, tier: 'T1' | 'T2' | 'T3' | null) =>
    api.put('/admin/faculty-tiers', { userId, academicYearId, tier }).then((r) => r.data),
  setEligible: (userId: string, academicYearId: string, eligible: boolean | null) =>
    api.put('/admin/faculty-tiers', { userId, academicYearId, eligible }).then((r) => r.data),
  exportExcel: async (academicYearId: string, label: string) => {
    const blob = await api
      .get('/tracking/export', { params: { academicYearId, format: 'excel' }, responseType: 'blob' })
      .then((r) => r.data as Blob);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadre-tier-${label}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
