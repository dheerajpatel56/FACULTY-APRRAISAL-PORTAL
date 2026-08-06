import { describe, it, expect } from 'vitest';
import { generateNarrative, type NarrativeSnapshot } from './feedbackNarrative';

const req = (label: string, actual: string, target: string, met: boolean, gating = true) => ({
  key: label, label, actual, target, met, gating,
});

describe('generateNarrative', () => {
  it('lists met targets as strengths and gating gaps as improvements/growth', () => {
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
    expect(n.strengths).toContain('Meets 2 of 3');
    expect(n.strengths).toContain('Total score');
    expect(n.improvements).toContain('Indexed journals');
    expect(n.growthTargets).toContain('Reach Indexed journals >= 2 (currently 1)');
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
    expect(n.improvements).toContain('All eligibility targets are met');
    expect(n.growthTargets).toContain('Sustain current performance');
  });

  it('handles the all-below case', () => {
    const snap: NarrativeSnapshot = {
      cadreLabel: 'Professor',
      eligible: false,
      requirements: [req('Total score', '0', '>= 375', false)],
    };
    const n = generateNarrative(snap);
    expect(n.strengths).toContain('No ideal targets');
    expect(n.improvements).toContain('Total score');
  });

  it('handles an empty requirement set', () => {
    const n = generateNarrative({ cadreLabel: null, eligible: false, requirements: [] });
    expect(n.strengths).toBeTruthy();
    expect(n.improvements).toBeTruthy();
    expect(n.growthTargets).toBeTruthy();
  });
});
