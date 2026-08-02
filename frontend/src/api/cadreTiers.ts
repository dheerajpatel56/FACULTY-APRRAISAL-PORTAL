import api from './client';

export type Criterion =
  | 'totalScore'
  | 'feedback'
  | 'indexedCount'
  | 'journalCount'
  | 'patentCount'
  | 'projectCount'
  | 'consultancyCount';

export type Cadre = 'ASSISTANT_PROFESSOR' | 'SR_ASSISTANT_PROFESSOR' | 'ASSOCIATE_PROFESSOR' | 'PROFESSOR';
export type TierName = 'T1' | 'T2' | 'T3';

export interface CriterionThreshold {
  enabled: boolean;
  value: number;
}
export type TierCriteria = Partial<Record<Criterion, CriterionThreshold>>;

export interface CadreTier {
  id: string;
  academicYearId: string;
  cadre: Cadre;
  tier: TierName;
  criteria: TierCriteria;
}

export interface SeedResult {
  rows: CadreTier[];
  seededCadres: Cadre[];
  skippedCadres: Cadre[];
}

export const cadreTierApi = {
  list: (academicYearId: string): Promise<CadreTier[]> =>
    api.get('/admin/cadre-tiers', { params: { academicYearId } }).then((r) => r.data),
  upsert: (academicYearId: string, cadre: Cadre, tier: TierName, criteria: TierCriteria): Promise<CadreTier> =>
    api.put('/admin/cadre-tiers', { academicYearId, cadre, tier, criteria }).then((r) => r.data),
  seedDefaults: (academicYearId: string): Promise<SeedResult> =>
    api.post('/admin/cadre-tiers/seed-defaults', { academicYearId }).then((r) => r.data),
  remove: (id: string): Promise<void> => api.delete(`/admin/cadre-tiers/${id}`).then(() => undefined),
};
