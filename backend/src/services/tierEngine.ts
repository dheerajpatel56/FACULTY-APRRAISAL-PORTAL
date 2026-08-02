import type { CriteriaActuals } from './trackingEngine';
import type { CadreTargetRow } from './cadreEngine';

// W7 tier engine (pure). A faculty's cadre selects a set of per-(cadre, tier)
// threshold cells; the highest tier whose enabled criteria all pass
// (actual >= value) is assigned (T1 > T2 > T3).

export type Criterion = keyof Omit<CriteriaActuals, 'totalScoreSource'>;

export type TierName = 'T1' | 'T2' | 'T3';

export interface TierResult {
  tier: TierName | null; // null = no tier satisfied
  satisfied: Record<TierName, boolean>;
}

const TIER_ORDER: TierName[] = ['T1', 'T2', 'T3'];

// ─── Per-cadre flat tier thresholds ─────────────────────────────────────────
// Each (cadre, tier) cell is a flat per-criterion threshold map; a criterion
// counts only when `enabled`, and the tier is met when every enabled criterion
// is `actual >= value`.

// The metrics a tier threshold can test (the numeric CriteriaActuals fields).
export const TIER_CRITERIA: Criterion[] = [
  'totalScore',
  'feedback',
  'indexedCount',
  'journalCount',
  'patentCount',
  'projectCount',
  'consultancyCount',
];

export interface CriterionThreshold {
  enabled: boolean;
  value: number;
}
// Partial: a persisted cell need only list the criteria the admin has touched;
// absent criteria are treated as disabled.
export type TierCriteria = Partial<Record<Criterion, CriterionThreshold>>;

export interface CadreTierCell {
  tier: TierName;
  criteria: TierCriteria;
}

// A cell is satisfied when every ENABLED criterion meets-or-exceeds its value
// (AND semantics). A cell with no enabled criterion is NOT satisfied, so an
// empty/blank tier never captures everyone by default.
export function evaluateCell(criteria: TierCriteria, actuals: CriteriaActuals): boolean {
  const active = TIER_CRITERIA.filter((c) => criteria[c]?.enabled);
  if (active.length === 0) return false;
  return active.every((c) => {
    const actual = actuals[c];
    return typeof actual === 'number' && actual >= criteria[c]!.value;
  });
}

// Assign the highest satisfied tier for a faculty's cadre. `cells` are the
// (at most three) tier cells for that one cadre; a missing tier is not satisfied.
export function assignCadreTier(cells: CadreTierCell[], actuals: CriteriaActuals): TierResult {
  const byTier = new Map(cells.map((c) => [c.tier, c.criteria]));
  const satisfied: Record<TierName, boolean> = { T1: false, T2: false, T3: false };
  for (const t of TIER_ORDER) {
    const cell = byTier.get(t);
    satisfied[t] = cell ? evaluateCell(cell, actuals) : false;
  }
  const tier = TIER_ORDER.find((t) => satisfied[t]) ?? null;
  return { tier, satisfied };
}

// Default threshold set for a tier cell, seeded from a cadre's CadreTarget row.
// The four target-backed metrics are enabled at the target value; the PPC
// counts start disabled (admin turns them on per cadre-tier as needed).
export function defaultTierCriteria(target: CadreTargetRow): TierCriteria {
  return {
    totalScore: { enabled: true, value: target.totalScoreTarget },
    feedback: { enabled: true, value: target.feedbackTarget },
    indexedCount: { enabled: true, value: target.indexedCount },
    journalCount: { enabled: true, value: target.minJournal },
    patentCount: { enabled: false, value: 0 },
    projectCount: { enabled: false, value: 0 },
    consultancyCount: { enabled: false, value: 0 },
  };
}
