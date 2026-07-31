import { describe, it, expect } from 'vitest';
import { computeActuals } from './trackingEngine';

const richSub = {
  cat2Journals: [{ indexed: 'WOS' }, { indexed: 'SCOPUS' }, { indexed: 'ESCI' }, { indexed: 'NONE' }],
  cat2Conferences: [{ indexed: 'WOS' }, { indexed: 'ICI' }],
  cat2ConfBookChapters: [{ indexed: 'SCOPUS' }],
  cat2Patents: [
    { country: 'India', patentType: 'Utility', applicantIsInstitute: true, status: 'GRANTED' }, // counts
    { country: 'US', patentType: 'Process', applicantIsInstitute: true, status: 'PUBLISHED' }, // counts
    { country: 'India', patentType: 'Utility', applicantIsInstitute: false, status: 'GRANTED' }, // no — not institute
    { country: 'Germany', patentType: 'Utility', applicantIsInstitute: true, status: 'GRANTED' }, // no — country
    { country: 'India', patentType: 'Design', applicantIsInstitute: true, status: 'GRANTED' }, // no — type
    { country: 'India', patentType: 'Utility', applicantIsInstitute: true, status: 'FILED' }, // no — status
  ],
  cat2Projects: [{}, {}, {}],
  cat2Consultancy: [{}],
  cat1CourseResults: [{ feedbackReceived: 4 }, { feedbackReceived: 3 }],
};

describe('computeActuals', () => {
  it('uses HoD grandTotal when a review exists', () => {
    const a = computeActuals(richSub, 400);
    expect(a.totalScore).toBe(400);
    expect(a.totalScoreSource).toBe('HOD');
  });

  it('counts only WOS+SCOPUS as indexed', () => {
    const a = computeActuals(richSub, 400);
    expect(a.indexedCount).toBe(4); // 2 journals + 1 conf + 1 confBookChapter
    expect(a.journalCount).toBe(2);
  });

  it('counts patents only when India/US + utility/process + institute + published/granted', () => {
    const a = computeActuals(richSub, 400);
    expect(a.patentCount).toBe(2);
  });

  it('averages student feedback', () => {
    const a = computeActuals(richSub, 400);
    expect(a.feedback).toBe(3.5);
  });

  it('counts projects and consultancy', () => {
    const a = computeActuals(richSub, 400);
    expect(a.projectCount).toBe(3);
    expect(a.consultancyCount).toBe(1);
  });

  it('falls back to self-computed total when no review', () => {
    const a = computeActuals({ ...richSub }, null);
    expect(a.totalScoreSource).toBe('SELF');
    expect(typeof a.totalScore).toBe('number');
  });

  it('handles an empty submission', () => {
    const a = computeActuals({}, null);
    expect(a.indexedCount).toBe(0);
    expect(a.patentCount).toBe(0);
    expect(a.feedback).toBe(0);
  });
});
