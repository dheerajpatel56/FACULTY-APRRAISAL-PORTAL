import type { CriteriaActuals } from './trackingEngine';

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
