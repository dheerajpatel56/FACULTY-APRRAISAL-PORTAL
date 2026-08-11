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

// The narrative is faculty-facing (quarterly email + issued annual feedback), so
// it must NOT expose the internal tier/eligibility/cadre machinery — no cadre
// names, no "eligibility"/"tier" language, and no target thresholds. It reads as
// plain qualitative growth guidance built from the faculty's own achievements.
export function generateNarrative(snap: NarrativeSnapshot): Narrative {
  const reqs = snap.requirements ?? [];
  // "manual check" rows (e.g. quartile) are placeholders, not real achievements
  // — keep them out of the strengths list.
  const met = reqs.filter((r) => r.met && r.actual !== 'manual check');
  // Only gating gaps drive "areas to improve"; non-gating (informational) omitted.
  const unmet = reqs.filter((r) => !r.met && r.gating);

  const strengths = met.length
    ? `Strong performance this cycle:\n` +
      met.map((r) => `• ${r.label} — ${r.actual}`).join('\n')
    : `Keep building your portfolio across teaching, research and development this cycle.`;

  const improvements = unmet.length
    ? `A few areas to focus on next:\n` +
      unmet.map((r) => `• ${r.label} — currently ${r.actual}`).join('\n')
    : 'No major gaps this cycle — sustain your momentum.';

  const growthTargets = unmet.length
    ? unmet.map((r) => `• Build on your ${r.label.toLowerCase()}`).join('\n')
    : '• Sustain your current performance and keep raising the bar.';

  return { strengths, improvements, growthTargets };
}
