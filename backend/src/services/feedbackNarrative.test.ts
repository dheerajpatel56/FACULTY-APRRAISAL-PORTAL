import { describe, it, expect } from 'vitest';
import { generateNarrative, type NarrativeSnapshot, type Narrative } from './feedbackNarrative';

const req = (label: string, actual: string, target: string, met: boolean, gating = true) => ({
  key: label, label, actual, target, met, gating,
});

// The narrative is faculty-facing, so it must never leak the tier/eligibility/
// cadre machinery or the target thresholds.
const LEAK = /tier|eligib|cadre|assistant professor|professor|target|>=/i;
const assertNoLeak = (n: Narrative) => {
  for (const part of [n.strengths, n.improvements, n.growthTargets]) {
    expect(part).not.toMatch(LEAK);
  }
};

describe('generateNarrative', () => {
  it('lists met items as strengths and gating gaps as improvements/growth', () => {
    const snap: NarrativeSnapshot = {
      cadreLabel: 'Professor',
      eligible: false,
      requirements: [
        req('Total score', '380', '>= 375', true),
        req('Feedback', '3.6', '>= 3.5', true),
        req('Indexed journals', '1', '>= 2', false),
      ],
    };
    const n = generateNarrative(snap);
    expect(n.strengths).toContain('Strong performance');
    expect(n.strengths).toContain('Total score');
    expect(n.strengths).toContain('380');
    expect(n.improvements).toContain('Indexed journals');
    expect(n.improvements).toContain('currently 1');
    expect(n.growthTargets).toContain('Build on your indexed journals');
    assertNoLeak(n);
  });

  it('ignores non-gating (informational) gaps', () => {
    const snap: NarrativeSnapshot = {
      cadreLabel: 'Assistant Professor',
      eligible: true,
      requirements: [
        req('Total score', '360', '>= 350', true),
        req('Patents/Projects/Consultancy', '0', '>= 1', false, false), // non-gating
      ],
    };
    const n = generateNarrative(snap);
    expect(n.improvements).toContain('No major gaps');
    expect(n.growthTargets).toContain('Sustain your current performance');
    assertNoLeak(n);
  });

  it('handles the all-below case', () => {
    const snap: NarrativeSnapshot = {
      cadreLabel: 'Professor',
      eligible: false,
      requirements: [req('Total score', '0', '>= 375', false)],
    };
    const n = generateNarrative(snap);
    expect(n.strengths).toContain('Keep building your portfolio');
    expect(n.improvements).toContain('Total score');
    assertNoLeak(n);
  });

  it('handles an empty requirement set', () => {
    const n = generateNarrative({ cadreLabel: null, eligible: false, requirements: [] });
    expect(n.strengths).toBeTruthy();
    expect(n.improvements).toBeTruthy();
    expect(n.growthTargets).toBeTruthy();
    assertNoLeak(n);
  });
});
