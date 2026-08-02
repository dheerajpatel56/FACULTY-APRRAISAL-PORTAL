import type { CriteriaActuals } from './trackingEngine';
import type { CadreTargetRow } from './cadreEngine';

// W3 tier engine (pure). Evaluates the admin-configured TierRule AND/OR trees
// (built in W1) against a faculty's computed actuals, and assigns the highest
// satisfied tier (T1 > T2 > T3).

export type Op = 'GTE' | 'GT' | 'LTE' | 'LT' | 'EQ';
export type Criterion = keyof Omit<CriteriaActuals, 'totalScoreSource'>;

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

function compare(a: number, op: Op, v: number): boolean {
  switch (op) {
    case 'GTE': return a >= v;
    case 'GT': return a > v;
    case 'LTE': return a <= v;
    case 'LT': return a < v;
    case 'EQ': return a === v;
    default: return false;
  }
}

// Evaluate one node against the actuals. Malformed nodes evaluate to false; an
// empty group is false (no condition met).
export function evaluateNode(node: RuleNode, actuals: CriteriaActuals): boolean {
  if (!node || typeof node !== 'object') return false;
  if (node.kind === 'predicate') {
    const actual = actuals[node.criterion];
    if (typeof actual !== 'number') return false;
    return compare(actual, node.op, node.value);
  }
  if (node.kind === 'group') {
    if (!Array.isArray(node.children) || node.children.length === 0) return false;
    return node.op === 'AND'
      ? node.children.every((c) => evaluateNode(c, actuals))
      : node.children.some((c) => evaluateNode(c, actuals));
  }
  return false;
}

export interface TierResult {
  tier: TierName | null; // null = no tier rule satisfied
  satisfied: Record<TierName, boolean>;
}

const TIER_ORDER: TierName[] = ['T1', 'T2', 'T3'];

// Given the tier rules (any subset of T1/T2/T3) and actuals, return the highest
// satisfied tier plus the per-tier pass/fail map. Tiers without a rule are
// treated as not satisfied.
export function assignTier(
  rules: Array<{ tier: TierName; expression: RuleNode }>,
  actuals: CriteriaActuals
): TierResult {
  const byTier = new Map(rules.map((r) => [r.tier, r.expression]));
  const satisfied: Record<TierName, boolean> = { T1: false, T2: false, T3: false };
  for (const t of TIER_ORDER) {
    const expr = byTier.get(t);
    satisfied[t] = expr ? evaluateNode(expr, actuals) : false;
  }
  const tier = TIER_ORDER.find((t) => satisfied[t]) ?? null;
  return { tier, satisfied };
}

// ─── W7: per-cadre flat tier thresholds ─────────────────────────────────────
// New model (replaces the global AND/OR TierRule above). Each (cadre, tier)
// cell is a flat per-criterion threshold map; a criterion counts only when
// `enabled`, and the tier is met when every enabled criterion is `actual >= value`.

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
