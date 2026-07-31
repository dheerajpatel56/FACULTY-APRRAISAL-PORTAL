import { describe, it, expect } from 'vitest';
import { evaluateNode, assignTier, type Group } from './tierEngine';
import type { CriteriaActuals } from './trackingEngine';

const actuals: CriteriaActuals = {
  totalScore: 380,
  totalScoreSource: 'HOD',
  feedback: 3.6,
  indexedCount: 3,
  journalCount: 2,
  patentCount: 1,
  projectCount: 0,
  consultancyCount: 0,
};

const P = (criterion: any, op: any, value: number): any => ({ kind: 'predicate', criterion, op, value });
const G = (op: 'AND' | 'OR', ...children: any[]): Group => ({ kind: 'group', op, children });

describe('evaluateNode', () => {
  it('evaluates predicate operators', () => {
    expect(evaluateNode(P('totalScore', 'GTE', 375), actuals)).toBe(true);
    expect(evaluateNode(P('totalScore', 'GT', 380), actuals)).toBe(false);
    expect(evaluateNode(P('feedback', 'LT', 3.5), actuals)).toBe(false);
    expect(evaluateNode(P('journalCount', 'EQ', 2), actuals)).toBe(true);
  });

  it('AND requires all, OR requires any', () => {
    expect(evaluateNode(G('AND', P('totalScore', 'GTE', 375), P('indexedCount', 'GTE', 3)), actuals)).toBe(true);
    expect(evaluateNode(G('AND', P('totalScore', 'GTE', 375), P('projectCount', 'GTE', 1)), actuals)).toBe(false);
    expect(evaluateNode(G('OR', P('projectCount', 'GTE', 1), P('patentCount', 'GTE', 1)), actuals)).toBe(true);
  });

  it('empty group is false', () => {
    expect(evaluateNode(G('AND'), actuals)).toBe(false);
  });

  it('evaluates nested groups', () => {
    const expr = G('AND', P('totalScore', 'GTE', 375), G('OR', P('patentCount', 'GTE', 1), P('projectCount', 'GTE', 2)));
    expect(evaluateNode(expr, actuals)).toBe(true);
  });
});

describe('assignTier', () => {
  it('returns the highest satisfied tier', () => {
    const rules = [
      { tier: 'T1' as const, expression: G('AND', P('totalScore', 'GTE', 375), P('indexedCount', 'GTE', 3)) },
      { tier: 'T2' as const, expression: G('AND', P('totalScore', 'GTE', 350)) },
      { tier: 'T3' as const, expression: G('AND', P('totalScore', 'GTE', 300)) },
    ];
    const r = assignTier(rules, actuals);
    expect(r.tier).toBe('T1');
    expect(r.satisfied).toEqual({ T1: true, T2: true, T3: true });
  });

  it('falls to a lower tier when T1 not met', () => {
    const rules = [
      { tier: 'T1' as const, expression: G('AND', P('patentCount', 'GTE', 5)) },
      { tier: 'T2' as const, expression: G('AND', P('totalScore', 'GTE', 350)) },
    ];
    const r = assignTier(rules, actuals);
    expect(r.tier).toBe('T2');
    expect(r.satisfied.T1).toBe(false);
  });

  it('returns null when no rule is satisfied', () => {
    const rules = [{ tier: 'T1' as const, expression: G('AND', P('totalScore', 'GTE', 500)) }];
    expect(assignTier(rules, actuals).tier).toBeNull();
  });

  it('treats a missing tier rule as not satisfied', () => {
    const rules = [{ tier: 'T3' as const, expression: G('AND', P('totalScore', 'GTE', 300)) }];
    const r = assignTier(rules, actuals);
    expect(r.tier).toBe('T3');
    expect(r.satisfied.T1).toBe(false);
    expect(r.satisfied.T2).toBe(false);
  });
});
