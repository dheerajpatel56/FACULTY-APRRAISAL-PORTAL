import { describe, it, expect } from 'vitest';
import { renderFeedbackHtml } from './pdfService';

// The feedback PDF has two shapes. A HoD's copy carries the cadre and
// eligibility standing; the faculty's carries the narrative and nothing else,
// mirroring what GET /appraisals/:id/feedback returns to each of them.

const feedback = {
  status: 'ISSUED',
  strengths: 'Strong publication record.',
  improvements: 'Needs a funded project.',
  growthTargets: 'File one patent.',
  issuedAt: '2026-09-01T00:00:00.000Z',
  issuedBy: { name: 'Dr. HoD' },
};

const meta = {
  user: { name: 'Test Faculty', employeeCode: 'FAC99', designation: 'Assistant Professor', department: { name: 'CSE' } },
  yearLabel: '2026-27',
};

const snapshot = {
  cadreLabel: 'Assistant Professor',
  eligible: false,
  scores: { cat1: 120, cat2: 90, cat3: 70, cat4: 40, cat5: 30, total: 350 },
  requirements: [
    { key: 'indexedCount', label: 'Indexed publications', target: '2', actual: '1', met: false, gating: true },
  ],
};

describe('renderFeedbackHtml', () => {
  it("shows the standing in a HoD's copy", () => {
    const html = renderFeedbackHtml(feedback, snapshot, meta);
    expect(html).toContain('Standing');
    expect(html).toContain('Assistant Professor');
    expect(html).toContain('350.0');
    expect(html).toContain('Indexed publications');
  });

  it("omits the standing entirely from the faculty's copy", () => {
    const html = renderFeedbackHtml(feedback, null, meta);
    expect(html).not.toContain('Standing');
    expect(html).not.toContain('Ideal targets');
    expect(html).not.toContain('Indexed publications');
    expect(html).not.toMatch(/Cadre/i);
    expect(html).not.toContain('350.0');
  });

  it('carries the narrative in both copies', () => {
    for (const html of [renderFeedbackHtml(feedback, snapshot, meta), renderFeedbackHtml(feedback, null, meta)]) {
      expect(html).toContain('Strong publication record.');
      expect(html).toContain('Needs a funded project.');
      expect(html).toContain('File one patent.');
      expect(html).toContain('Test Faculty');
      expect(html).toContain('2026-27');
    }
  });

  it('never mentions Category 6 or the 550 grand total', () => {
    // The feedback snapshot is built from the self-appraisal on purpose. Even a
    // HoD's copy of this document is not where the reviewer's own assessment
    // belongs, and the faculty may hold this file.
    for (const html of [renderFeedbackHtml(feedback, snapshot, meta), renderFeedbackHtml(feedback, null, meta)]) {
      expect(html).not.toMatch(/Cat\s*6/i);
      expect(html).not.toMatch(/Core Values/i);
      expect(html).not.toContain('550');
      expect(html).not.toMatch(/Grand Total/i);
    }
  });

  it('escapes narrative text so it cannot break out of the document', () => {
    const nasty = { ...feedback, strengths: '</div><script>alert(1)</script>' };
    const html = renderFeedbackHtml(nasty, null, meta);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders an empty narrative without collapsing the section', () => {
    const blank = { ...feedback, strengths: null, improvements: '', growthTargets: undefined };
    const html = renderFeedbackHtml(blank, null, meta);
    expect(html).toContain('Strengths');
    expect(html).toContain('Areas to improve');
    expect(html).toContain('Growth targets');
  });
});
