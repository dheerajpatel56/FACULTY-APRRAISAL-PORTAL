// FPGP target reconciliation — compares the targets set in an FPGP plan against
// the actual achievements recorded in the faculty's appraisal submission.
//
// Only quantifiable subsections that have a clean appraisal counterpart are
// evaluated. A subsection's target = sum of numeric `targetCount` across its
// rows; achieved = count of matching items in the appraisal. A subsection with
// no numeric target (all targetCount null/blank) is skipped (not evaluated).

export interface AchievementItem {
  subsection: string;
  label: string;
  target: number;
  achieved: number;
  met: boolean;
}

export interface ReconcileResult {
  items: AchievementItem[];
  allMet: boolean;             // every evaluated target met
  autoAcceptEligible: boolean; // allMet && at least one target evaluated
}

interface FPGPSubsectionLike {
  subsection: string;
  rows?: unknown;
}

// Maps an FPGP subsection to the appraisal arrays that count toward it.
const MAPPING: Record<string, { label: string; achieved: (a: any) => number }> = {
  '2.1': { label: 'Journal Publications', achieved: (a) => (a.cat2Journals ?? []).length },
  '2.2': { label: 'Conference Publications', achieved: (a) => (a.cat2Conferences ?? []).length },
  '2.3': { label: 'Books / Book Chapters', achieved: (a) => (a.cat2Books ?? []).length + (a.cat2BookChapters ?? []).length },
  '2.4': { label: 'Patents / IPR', achieved: (a) => (a.cat2Patents ?? []).length },
  '2.5': { label: 'R&D / Funded Projects', achieved: (a) => (a.cat2Projects ?? []).length },
  '2.6': { label: 'Consultancy Projects', achieved: (a) => (a.cat2Consultancy ?? []).length },
  '3.2': { label: 'Professional Memberships', achieved: (a) => (a.cat5Memberships ?? []).length },
  '3.4': { label: 'FDP / Workshops / Conferences attended', achieved: (a) => (a.cat3Training ?? []).length + (a.cat3ConferencesAttended ?? []).length },
};

// Sum numeric targetCount across a subsection's rows. Returns null if none set.
function sumTarget(rows: unknown): number | null {
  if (!Array.isArray(rows)) return null;
  let total = 0;
  let any = false;
  for (const r of rows as Array<{ targetCount?: unknown }>) {
    const n = typeof r?.targetCount === 'number' ? r.targetCount : Number(r?.targetCount);
    if (Number.isFinite(n) && n > 0) {
      total += n;
      any = true;
    }
  }
  return any ? total : null;
}

export function reconcileFpgp(
  subsections: FPGPSubsectionLike[],
  appraisal: any | null,
): ReconcileResult {
  const items: AchievementItem[] = [];

  for (const sub of subsections) {
    const map = MAPPING[sub.subsection];
    if (!map) continue;
    const target = sumTarget(sub.rows);
    if (target === null) continue; // no numeric target set → not evaluated

    const achieved = appraisal ? map.achieved(appraisal) : 0;
    items.push({
      subsection: sub.subsection,
      label: map.label,
      target,
      achieved,
      met: achieved >= target,
    });
  }

  const allMet = items.length > 0 && items.every((i) => i.met);
  return { items, allMet, autoAcceptEligible: allMet };
}
