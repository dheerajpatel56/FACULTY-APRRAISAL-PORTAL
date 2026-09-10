// 2.5 sanity checks for one sponsored project: the details the PDF asks for,
// by status. Warnings only — never block saving or change the score.
export function sponsoredProjectWarnings(r: any): string[] {
  const out: string[] = [];
  if (!r) return out;
  if (r.status === 'APPLIED' && !String(r.dateOfApplication ?? '').trim()) out.push('Enter the date of application.');
  if ((r.status === 'ONGOING' || r.status === 'COMPLETED') && !String(r.durationPeriod ?? '').trim()) {
    out.push('Enter the project duration & period.');
  }
  const amount = Number(r.amountLakhs);
  if (!(Number.isFinite(amount) && amount > 0)) out.push('Enter the amount in Rs. lakhs.');
  return out;
}
