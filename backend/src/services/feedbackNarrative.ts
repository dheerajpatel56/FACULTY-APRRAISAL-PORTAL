// W6 — auto-generate the annual feedback narrative from a faculty's eligibility
// snapshot, so the HoD opens a pre-filled draft to edit or issue with one click
// (rather than writing from scratch). Pure function — no I/O.

export interface NarrativeReq {
  key: string;
  label: string;
  target: string;
  actual: string;
  met: boolean;
  gating: boolean;
}
export interface NarrativeSnapshot {
  cadreLabel?: string | null;
  eligible?: boolean;
  requirements?: NarrativeReq[];
}
export interface Narrative {
  strengths: string;
  improvements: string;
  growthTargets: string;
}

export function generateNarrative(snap: NarrativeSnapshot): Narrative {
  const reqs = snap.requirements ?? [];
  const cadre = snap.cadreLabel ?? 'the cadre';
  // "manual check" rows (e.g. quartile) are placeholders, not real achievements
  // — keep them out of the strengths list.
  const met = reqs.filter((r) => r.met && r.actual !== 'manual check');
  // Only gating gaps drive "must improve"; non-gating (informational) are omitted.
  const unmet = reqs.filter((r) => !r.met && r.gating);

  const strengths = met.length
    ? `Meets ${met.length} of ${reqs.length} ideal targets for ${cadre}:\n` +
      met.map((r) => `• ${r.label} — ${r.actual} (target ${r.target})`).join('\n')
    : `No ideal targets for ${cadre} are met yet this cycle.`;

  const improvements = unmet.length
    ? `Currently below target on:\n` +
      unmet.map((r) => `• ${r.label} — ${r.actual}, target ${r.target}`).join('\n')
    : snap.eligible
      ? 'All eligibility targets are met — no gaps this cycle.'
      : 'No mandatory gaps outstanding.';

  const growthTargets = unmet.length
    ? unmet.map((r) => `• Reach ${r.label} ${r.target} (currently ${r.actual})`).join('\n')
    : '• Sustain current performance and aim for the next tier.';

  return { strengths, improvements, growthTargets };
}
