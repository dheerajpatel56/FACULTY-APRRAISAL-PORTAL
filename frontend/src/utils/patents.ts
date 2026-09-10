// 2.4 sanity checks for one patent row: missing dates for its status, dates in
// the wrong order, and an application number entered twice (the same patent
// would count twice). Warnings only — they never block saving or change the
// score, the same approach as the 2.2 citation checks.

const ymd = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '');
const normApp = (v: unknown) => String(v ?? '').replace(/\s+/g, '').toLowerCase();

export function patentWarnings(rows: any[] | null | undefined, i: number): string[] {
  const list = rows ?? [];
  const r = list[i] ?? {};
  const out: string[] = [];
  const filed = ymd(r.dateOfFiling);
  const pub = ymd(r.dateOfPub);
  const grant = ymd(r.dateOfGrant);

  if (r.status === 'GRANTED' && !grant) out.push('Granted — enter the date of grant.');
  if ((r.status === 'PUBLISHED' || r.status === 'GRANTED') && !pub) out.push('Enter the date of publication.');
  if (filed && pub && pub < filed) out.push('The date of publication is before the date of filing.');
  if (pub && grant && grant < pub) out.push('The date of grant is before the date of publication.');

  const app = normApp(r.appNumber);
  if (app && list.some((o, j) => j !== i && normApp(o?.appNumber) === app)) {
    out.push(`Application number ${String(r.appNumber).trim()} is entered more than once — each patent counts once.`);
  }
  return out;
}
