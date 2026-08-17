import api from './client';

export type VStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface ProofRow {
  id: string;
  submissionId: string;
  section: string;
  item: string;
  field: string;
  url: string;
  status: VStatus;
  verifiedAt: string | null;
  comment: string | null;
  verifiedBy?: { id: string; name: string } | null;
}

export interface ProofListResponse {
  submission: {
    id: string;
    status: string;
    redListed: boolean;
    holdReason: string | null;
    heldAt: string | null;
    submissionNumber: number;
    year: string;
    faculty: { id: string; name: string; employeeCode: string; department?: { name: string; code: string } | null };
  };
  proofs: ProofRow[];
  summary: { total: number; verified: number; rejected: number; pending: number; allVerified: boolean };
}

export interface RedListRow {
  id: string;
  submissionNumber: number;
  status: string;
  holdReason: string | null;
  heldAt: string | null;
  user: { id: string; name: string; employeeCode: string; department?: { name: string; code: string } | null };
  academicYear: { label: string };
}

// One row per faculty for the faculty-wise Uploads page.
export interface UploadsOverviewRow {
  submissionId: string;
  status: string;
  redListed: boolean;
  submissionNumber: number;
  faculty: { id: string; name: string; employeeCode: string; department?: { name: string; code: string } | null };
  counts: { total: number; verified: number; rejected: number; pending: number };
}

export interface UploadsOverview {
  year: { id: string; label: string };
  rows: UploadsOverviewRow[];
}

export const verificationApi = {
  overview: (academicYearId?: string): Promise<UploadsOverview> =>
    api.get('/proofs/overview', { params: academicYearId ? { academicYearId } : {} }).then((r) => r.data),
  listProofs: (submissionId: string): Promise<ProofListResponse> =>
    api.get(`/appraisals/${submissionId}/proofs`).then((r) => r.data),
  verifyProof: (submissionId: string, url: string, status: 'VERIFIED' | 'REJECTED', comment?: string) =>
    api.post(`/appraisals/${submissionId}/proofs/verify`, { url, status, comment }).then((r) => r.data),
  redList: (): Promise<RedListRow[]> => api.get('/red-list').then((r) => r.data),
  clearHold: (submissionId: string) => api.post(`/appraisals/${submissionId}/clear-hold`).then((r) => r.data),
};
