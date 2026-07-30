import api from './client';

export interface CadreTarget {
  id: string;
  academicYearId: string;
  cadre: 'ASSISTANT_PROFESSOR' | 'SR_ASSISTANT_PROFESSOR' | 'ASSOCIATE_PROFESSOR' | 'PROFESSOR';
  minExpYears: number;
  maxExpYears: number | null;
  totalScoreTarget: number;
  feedbackTarget: number;
  indexedCount: number;
  minJournal: number;
  quartileSet: string | null;
  ppcRule: 'DESIRABLE' | 'MANDATORY';
  ppcCount: number;
}

export type CadreTargetInput = Omit<CadreTarget, 'id'>;

export const cadreTargetApi = {
  list: (academicYearId: string): Promise<CadreTarget[]> =>
    api.get('/admin/cadre-targets', { params: { academicYearId } }).then((r) => r.data),
  create: (data: CadreTargetInput): Promise<CadreTarget> =>
    api.post('/admin/cadre-targets', data).then((r) => r.data),
  update: (id: string, data: Partial<CadreTargetInput>): Promise<CadreTarget> =>
    api.put(`/admin/cadre-targets/${id}`, data).then((r) => r.data),
  remove: (id: string): Promise<void> => api.delete(`/admin/cadre-targets/${id}`).then(() => undefined),
  seedDefaults: (academicYearId: string): Promise<CadreTarget[]> =>
    api.post('/admin/cadre-targets/seed-defaults', { academicYearId }).then((r) => r.data),
};
