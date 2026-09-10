// Quarterly "target status" for the faculty email: each measurable target with
// what is required, where the faculty stands now, what is left, and a
// one-paragraph summary. Pure function — no I/O.
//
// Faculty-facing. It shows the targets but none of the machinery behind them:
// the output carries labels, numbers and a status only — no cadre, no tier, no
// eligibility verdict. The total-score row uses the faculty's OWN total out of
// 500. The tracking engine measures that target against the reviewer's /550
// grand total once a review exists, and that figure is withheld from faculty.

export interface TargetRequirement {
  key: string;
  label: string;
  target: string; // ">= N" for measurable targets
  actual: string;
}

export interface TargetRow {
  label: string;
  required: number;
  current: number;
  achieved: boolean;
  left: number;
  status: string;
}

export interface TargetStatus {
  rows: TargetRow[];
  achieved: number;
  total: number;
  achievedText: string;
  leftText: string;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function targetStatus(requirements: TargetRequirement[] | null | undefined, facultyTotal: number): TargetStatus {
  const rows: TargetRow[] = [];
  for (const r of requirements ?? []) {
    // Only ">= N" targets are measurable; e.g. the quartile row is a manual check.
    const m = /^>=\s*(\d+(?:\.\d+)?)$/.exec(String(r.target ?? '').trim());
    if (!m) continue;
    const required = Number(m[1]);

    const raw = r.key === 'totalScore' ? Number(facultyTotal) : Number(r.actual);
    // Blank or non-numeric counts as 0 — never as progress.
    const current = Number.isFinite(raw) && raw > 0 ? round(raw) : 0;
    const achieved = current >= required;
    const left = achieved ? 0 : round(required - current);

    rows.push({
      label: r.key === 'totalScore' ? 'Total score (out of 500)' : r.label,
      required,
      current,
      achieved,
      left,
      status: achieved ? 'Achieved' : `${left} to go`,
    });
  }

  const done = rows.filter((r) => r.achieved);
  const open = rows.filter((r) => !r.achieved);
  const n = rows.length;

  const achievedText = !n ? ''
    : !done.length ? `No targets achieved yet (0 of ${n}).`
    : done.length === n ? `All ${n} targets achieved: ${done.map((r) => r.label).join(', ')}.`
    : `Achieved ${done.length} of ${n}: ${done.map((r) => r.label).join(', ')}.`;

  const leftText = !n ? ''
    : !open.length ? 'Nothing left to achieve — sustain this through the rest of the year.'
    : `Still to achieve: ${open.map((r) => `${r.label} (${r.left} to go)`).join(', ')}.`;

  return { rows, achieved: done.length, total: n, achievedText, leftText };
}
