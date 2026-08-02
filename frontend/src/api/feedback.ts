import api from './client';

export interface FeedbackSnapshot {
  year: string;
  cadreLabel: string | null;
  eligible: boolean;
  requirements: { key: string; label: string; target: string; actual: string; met: boolean; gating: boolean }[];
  scores: { cat1: number; cat2: number; cat3: number; cat4: number; cat5: number; total: number } | null;
}

export interface FeedbackData {
  id: string;
  status: 'DRAFT' | 'ISSUED';
  strengths: string | null;
  improvements: string | null;
  growthTargets: string | null;
  snapshot: FeedbackSnapshot;
  issuedAt: string | null;
  issuedBy?: { name: string } | null;
}

export interface FeedbackResponse {
  feedback: FeedbackData | null;
  autoSnapshot?: FeedbackSnapshot | null;
  editable: boolean;
}

export interface FeedbackInput {
  strengths?: string;
  improvements?: string;
  growthTargets?: string;
}

export const feedbackApi = {
  get: (submissionId: string): Promise<FeedbackResponse> =>
    api.get(`/appraisals/${submissionId}/feedback`).then((r) => r.data),
  save: (submissionId: string, body: FeedbackInput): Promise<FeedbackData> =>
    api.put(`/appraisals/${submissionId}/feedback`, body).then((r) => r.data),
  issue: (submissionId: string, body: FeedbackInput): Promise<FeedbackData> =>
    api.post(`/appraisals/${submissionId}/feedback/issue`, body).then((r) => r.data),
};
