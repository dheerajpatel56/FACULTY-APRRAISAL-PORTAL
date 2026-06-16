import { describe, it, expect } from 'vitest';
import { FPGP_TEMPLATE, defaultRowsFor } from './fpgpTemplate';

describe('FPGP_TEMPLATE integrity', () => {
  it('has 21 subsections', () => {
    expect(FPGP_TEMPLATE.length).toBe(21);
  });

  it('subsection ids unique', () => {
    const ids = FPGP_TEMPLATE.map((d) => d.sub);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers categories 1-4', () => {
    const cats = new Set(FPGP_TEMPLATE.map((d) => d.sub.split('.')[0]));
    expect(cats).toEqual(new Set(['1', '2', '3', '4']));
  });

  it('every def has type + sub + label', () => {
    for (const d of FPGP_TEMPLATE) {
      expect(d.type).toBeTruthy();
      expect(d.sub).toMatch(/^\d+\.\d+$/);
      expect(d.label.length).toBeGreaterThan(0);
    }
  });

  it('cat 3.2 memberships requires min 2 rows', () => {
    const m = FPGP_TEMPLATE.find((d) => d.sub === '3.2');
    expect(m?.type).toBe('memberships');
    expect((m as any).minRows).toBe(2);
  });
});

describe('defaultRowsFor', () => {
  it('fixedRows → one row per rowName with goal/sem fields', () => {
    const def = FPGP_TEMPLATE.find((d) => d.sub === '2.1')!; // SCI/Scopus/WoS
    const rows = defaultRowsFor(def);
    expect(rows.length).toBe(3);
    expect(rows[0]).toHaveProperty('name');
    expect(rows[0]).toHaveProperty('goal');
    expect(rows[0]).toHaveProperty('sem1');
    expect(rows[0]).toHaveProperty('sem2');
  });

  it('fixedRows with extraCols includes them', () => {
    const def = FPGP_TEMPLATE.find((d) => d.sub === '2.10')!; // has details + outcome
    const rows = defaultRowsFor(def);
    expect(rows[0]).toHaveProperty('details');
    expect(rows[0]).toHaveProperty('outcome');
  });

  it('pgUgRows → PG + UG rows tagged by group', () => {
    const def = FPGP_TEMPLATE.find((d) => d.sub === '1.2')!;
    const rows = defaultRowsFor(def);
    expect(rows.some((r) => r.group === 'PG')).toBe(true);
    expect(rows.some((r) => r.group === 'UG')).toBe(true);
  });

  it('dynamicRows → defaultRows count', () => {
    const def = FPGP_TEMPLATE.find((d) => d.sub === '3.3')!;
    const rows = defaultRowsFor(def);
    expect(rows.length).toBe(3);
  });

  it('dynamicRows with participation has participation field', () => {
    const def = FPGP_TEMPLATE.find((d) => d.sub === '3.4')!;
    const rows = defaultRowsFor(def);
    expect(rows[0]).toHaveProperty('participation');
  });

  it('memberships → minRows empty rows', () => {
    const def = FPGP_TEMPLATE.find((d) => d.sub === '3.2')!;
    const rows = defaultRowsFor(def);
    expect(rows.length).toBe(2);
  });

  it('duoText → no rows', () => {
    const def = FPGP_TEMPLATE.find((d) => d.sub === '1.3')!;
    expect(defaultRowsFor(def)).toEqual([]);
  });

  it('phdGuidance → no rows', () => {
    const def = FPGP_TEMPLATE.find((d) => d.sub === '2.8')!;
    expect(defaultRowsFor(def)).toEqual([]);
  });

  it('rigGroup → 3 rows', () => {
    const def = FPGP_TEMPLATE.find((d) => d.sub === '2.9')!;
    expect(defaultRowsFor(def).length).toBe(3);
  });
});
