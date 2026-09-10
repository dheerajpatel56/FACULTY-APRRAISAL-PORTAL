// 2.2 sanity checks: numbers that cannot all be true at once. Shown as
// warnings under the section — they never block saving and never change the
// score (owner decision 2026-09-11).

export interface CitationsInput {
  totalPubsTillDate?: number | null;
  pubsWithCitations?: number | null;
  totalCitations?: number | null;
  hIndexScopus?: number | null;
  hIndexWos?: number | null;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function citationWarnings(c: CitationsInput | null | undefined): string[] {
  const pubs = num(c?.totalPubsTillDate);
  const cited = num(c?.pubsWithCitations);
  const total = num(c?.totalCitations);
  const hs = num(c?.hIndexScopus);
  const hw = num(c?.hIndexWos);
  const out: string[] = [];

  if ([pubs, cited, total, hs, hw].some((v) => v < 0)) out.push('Numbers cannot be negative.');
  if (cited > pubs) out.push(`${cited} publications with citations, but only ${pubs} publications till date.`);
  if (cited > 0 && total < cited) {
    out.push(`Total citations (${total}) is less than the publications with citations (${cited}) — each cited publication has at least one.`);
  }
  if (total > 0 && cited === 0) out.push('Citations are entered, but no publications with citations.');
  for (const [label, h] of [['Scopus', hs], ['WoS', hw]] as const) {
    if (h > cited) out.push(`h-Index (${label}) of ${h} is more than the publications with citations (${cited}).`);
  }
  return out;
}
