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
  tier: 'T1' | 'T2' | 'T3' | null;
  tierSatisfied: Record<'T1' | 'T2' | 'T3', boolean>;
}

export interface TrackingResponse {
  year: { id: string; label: string };
  hasTargets: boolean;
  hasTierRules: boolean;
  rows: TrackingRow[];
}

export const trackingApi = {
  get: (academicYearId?: string): Promise<TrackingResponse> =>
    api.get('/tracking', { params: academicYearId ? { academicYearId } : {} }).then((r) => r.data),
  runSnapshot: (academicYearId?: string): Promise<{ message: string; quarter: string; faculty: number }> =>
    api.post('/admin/tracking/snapshot', academicYearId ? { academicYearId } : {}).then((r) => r.data),
};
