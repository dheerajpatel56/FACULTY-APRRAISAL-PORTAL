// Date inputs need "YYYY-MM-DD", but the API returns full timestamps
// ("2026-03-10T00:00:00.000Z"). A date box given a timestamp silently shows
// blank, so every saved date on the appraisal form looked missing after a
// reload. Dates are stored at UTC midnight, so the first ten characters are the
// calendar date the faculty entered.
export const DATE_FIELDS = ['dateOfPub', 'dateOfGrant', 'dateOfApplication', 'dateOfFiling'] as const;

export function toDateInputs<T extends Record<string, any>>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).map((row) => {
    const out: Record<string, any> = { ...row };
    for (const k of DATE_FIELDS) {
      const v = out[k];
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) out[k] = v.slice(0, 10);
    }
    return out as T;
  });
}
