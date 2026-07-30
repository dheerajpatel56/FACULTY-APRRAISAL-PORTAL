import api from './client';

export type Op = 'GTE' | 'GT' | 'LTE' | 'LT' | 'EQ';
export type Criterion =
  | 'totalScore'
  | 'feedback'
  | 'indexedCount'
  | 'journalCount'
  | 'patentCount'
  | 'projectCount'
  | 'consultancyCount';

export interface Predicate {
  kind: 'predicate';
  criterion: Criterion;
  op: Op;
  value: number;
}
export interface Group {
  kind: 'group';
  op: 'AND' | 'OR';
  children: RuleNode[];
}
export type RuleNode = Predicate | Group;

export type TierName = 'T1' | 'T2' | 'T3';

export interface TierRule {
  id: string;
  academicYearId: string;
  tier: TierName;
  expression: Group;
}

export const tierRuleApi = {
  list: (academicYearId: string): Promise<TierRule[]> =>
    api.get('/admin/tier-rules', { params: { academicYearId } }).then((r) => r.data),
  upsert: (academicYearId: string, tier: TierName, expression: Group): Promise<TierRule> =>
    api.put('/admin/tier-rules', { academicYearId, tier, expression }).then((r) => r.data),
  remove: (id: string): Promise<void> => api.delete(`/admin/tier-rules/${id}`).then(() => undefined),
};
