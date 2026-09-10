import { describe, it, expect } from 'vitest';
import { toDateInputs } from './dateInputs';

describe('toDateInputs', () => {
  it('turns API timestamps into the YYYY-MM-DD a date box can show', () => {
    const [row] = toDateInputs([{
      title: 'X',
      dateOfPub: '2026-03-10T00:00:00.000Z',
      dateOfGrant: '2025-01-01T00:00:00.000Z',
      dateOfApplication: '2023-11-01T00:00:00.000Z',
      dateOfFiling: '2024-06-30T00:00:00.000Z',
    }]);
    expect(row).toEqual({ title: 'X', dateOfPub: '2026-03-10', dateOfGrant: '2025-01-01', dateOfApplication: '2023-11-01', dateOfFiling: '2024-06-30' });
  });

  it('leaves blank, already-short and non-date fields alone', () => {
    const [row] = toDateInputs([{ dateOfPub: null, dateOfGrant: '', dateOfFiling: '2026-01-22', volume: '2026-03-10T00:00:00.000Z' }]);
    expect(row).toEqual({ dateOfPub: null, dateOfGrant: '', dateOfFiling: '2026-01-22', volume: '2026-03-10T00:00:00.000Z' });
  });

  it('tolerates a missing list', () => {
    expect(toDateInputs(undefined)).toEqual([]);
    expect(toDateInputs(null)).toEqual([]);
  });
});
