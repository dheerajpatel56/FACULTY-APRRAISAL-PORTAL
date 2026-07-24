import { describe, it, expect } from 'vitest';
import { cleanRow, DATE_KEYS } from './appraisalController';

// Pure unit tests for the row-coercion helper used by updateAppraisal.
// No HTTP / login / DB dependency — asserts the real persistence-mapping logic
// (blank dates -> null, blank proof files -> null, new scalar fields pass through).

describe('DATE_KEYS', () => {
  it('includes every date field the form sends (incl. new dateOfFiling)', () => {
    expect(DATE_KEYS.has('dateOfPub')).toBe(true);
    expect(DATE_KEYS.has('dateOfApplication')).toBe(true);
    expect(DATE_KEYS.has('dateOfGrant')).toBe(true);
    expect(DATE_KEYS.has('dateOfFiling')).toBe(true);
  });
});

describe('cleanRow — date coercion', () => {
  it('coerces a blank string date to null (not Invalid Date)', () => {
    for (const key of ['dateOfPub', 'dateOfApplication', 'dateOfGrant', 'dateOfFiling']) {
      const out = cleanRow({ [key]: '' });
      expect(out[key], `${key} blank -> null`).toBeNull();
    }
  });

  it('coerces null / undefined date to null', () => {
    for (const key of ['dateOfPub', 'dateOfApplication', 'dateOfGrant', 'dateOfFiling']) {
      expect(cleanRow({ [key]: null })[key]).toBeNull();
      expect(cleanRow({ [key]: undefined })[key]).toBeNull();
    }
  });

  it('parses a valid date string into a Date with the correct value', () => {
    for (const key of ['dateOfPub', 'dateOfApplication', 'dateOfGrant', 'dateOfFiling']) {
      const out = cleanRow({ [key]: '2024-01-15' });
      expect(out[key], `${key} is a Date`).toBeInstanceOf(Date);
      expect(Number.isNaN(out[key].getTime()), `${key} not Invalid Date`).toBe(false);
      expect(out[key].toISOString().slice(0, 10)).toBe('2024-01-15');
    }
  });
});

describe('cleanRow — proof/file coercion', () => {
  it('coerces blank proofFile, indexProofFile and evidenceFile to null', () => {
    const out = cleanRow({ proofFile: '', indexProofFile: '', evidenceFile: '' });
    expect(out.proofFile).toBeNull();
    expect(out.indexProofFile).toBeNull(); // 2nd proof, sibling of proofFile
    expect(out.evidenceFile).toBeNull();
  });

  it('passes through non-blank file names unchanged', () => {
    const out = cleanRow({ proofFile: 'p1.pdf', indexProofFile: 'idx.pdf', evidenceFile: 'e.pdf' });
    expect(out.proofFile).toBe('p1.pdf');
    expect(out.indexProofFile).toBe('idx.pdf');
    expect(out.evidenceFile).toBe('e.pdf');
  });

  it('coerces a blank *Id field to null', () => {
    expect(cleanRow({ submissionId: '' }).submissionId).toBeNull();
  });
});

describe('cleanRow — new scalar fields pass through untouched', () => {
  it('keeps new UI-A free-text/select fields exactly as sent', () => {
    const row = {
      otherDescription: 'Custom LMS built in-house',
      impactFactorSource: 'Clarivate',
      presentationStatus: 'Presented',
      iprType: 'Patent',
      iprTypeOther: 'Some other IPR',
      fundingSource: 'Institute',
    };
    const out = cleanRow(row);
    expect(out.otherDescription).toBe('Custom LMS built in-house');
    expect(out.impactFactorSource).toBe('Clarivate');
    expect(out.presentationStatus).toBe('Presented');
    expect(out.iprType).toBe('Patent');
    expect(out.iprTypeOther).toBe('Some other IPR');
    expect(out.fundingSource).toBe('Institute');
  });

  it('does NOT coerce a blank non-file/non-date string to null (leaves empty string)', () => {
    // These are not proof/date keys, so an empty string stays an empty string
    // (matches existing behavior for other free-text fields like quartile).
    const out = cleanRow({ iprTypeOther: '', impactFactorSource: '' });
    expect(out.iprTypeOther).toBe('');
    expect(out.impactFactorSource).toBe('');
  });

  it('handles a realistic mixed Cat2Patent row end-to-end', () => {
    const out = cleanRow({
      title: 'New Patent',
      country: 'India',
      inventors: 'FAC21',
      status: 'FILED',
      iprType: 'Patent',
      iprTypeOther: '',
      dateOfFiling: '2024-01-15',
      dateOfPub: '', // blank -> null
      dateOfGrant: null, // null -> null
    });
    expect(out.iprType).toBe('Patent');
    expect(out.iprTypeOther).toBe('');
    expect(out.dateOfFiling).toBeInstanceOf(Date);
    expect(out.dateOfFiling.toISOString().slice(0, 10)).toBe('2024-01-15');
    expect(out.dateOfPub).toBeNull();
    expect(out.dateOfGrant).toBeNull();
  });
});
