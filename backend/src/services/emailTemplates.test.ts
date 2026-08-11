import { describe, it, expect } from 'vitest';
import { renderTemplate, TEMPLATE_SUBJECTS } from './emailTemplates';
import type { EmailTemplateKey } from './emailService';

const ALL_KEYS: EmailTemplateKey[] = [
  'submission_received',
  'submission_approved',
  'submission_rejected',
  'submission_unlocked',
  'draft_reminder',
  'fpgp_signed',
  'reviewer_daily_digest',
  'password_otp',
  'proof_rejected',
  'proof_rejected_hod',
  'hold_cleared',
  'quarterly_feedback',
  'feedback_issued',
];

const samplePayload: Record<string, any> = {
  name: 'Dr. Test',
  year: '2025-26',
  submissionNumber: 1,
  submissionId: 'abc123',
  submittedAt: new Date().toLocaleString(),
  reviewerName: 'HoD',
  reviewedAt: new Date().toLocaleString(),
  cat1: '100', cat2: '90', cat3: '80', cat4: '40', cat5: '30',
  cat6: '45', grandTotal: '385', selfTotal: '340',
  teachingComment: 'Good', overallComment: 'Approved',
  hodName: 'Dr. HoD', signedAt: new Date().toLocaleString(), planId: 'plan1',
  pendingCount: 3, items: [{ name: 'X', year: '2025-26', daysWaiting: 2 }],
  otp: '123456', expiresInMinutes: 10,
  windowCloses: '2026-03-31', daysLeft: 5,
  section: '2.1 Journals', item: 'Paper Alpha', field: 'Proof', comment: 'blurry',
  facultyName: 'Dr. Faculty', employeeCode: '98CSE011',
  quarter: 'Q1', cadre: 'Assistant Professor', tier: 'T2', eligible: true,
  requirements: [{ label: 'Total score', target: '>= 325', actual: '380', met: true }],
};

describe('TEMPLATE_SUBJECTS', () => {
  it('every template key has a subject fn', () => {
    for (const key of ALL_KEYS) {
      expect(TEMPLATE_SUBJECTS[key]).toBeTypeOf('function');
    }
  });

  it('subject lines render non-empty strings', () => {
    for (const key of ALL_KEYS) {
      const subject = TEMPLATE_SUBJECTS[key](samplePayload);
      expect(subject).toBeTypeOf('string');
      expect(subject.length).toBeGreaterThan(0);
    }
  });

  it('password_otp subject does not leak the OTP', () => {
    const subject = TEMPLATE_SUBJECTS['password_otp'](samplePayload);
    expect(subject).not.toContain('123456');
  });
});

describe('renderTemplate', () => {
  it('renders valid HTML for every template', () => {
    for (const key of ALL_KEYS) {
      const html = renderTemplate(key, samplePayload);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('VNRVJIET');
      expect(html).toContain('</html>');
    }
  });

  it('substitutes name in body', () => {
    const html = renderTemplate('submission_received', samplePayload);
    expect(html).toContain('Dr. Test');
  });

  it('password_otp includes the OTP in body', () => {
    const html = renderTemplate('password_otp', samplePayload);
    expect(html).toContain('123456');
  });

  it('approved template shows grand total', () => {
    const html = renderTemplate('submission_approved', samplePayload);
    expect(html).toContain('385');
  });

  it('reviewer digest renders item rows', () => {
    const html = renderTemplate('reviewer_daily_digest', samplePayload);
    expect(html).toContain('3'); // pendingCount
  });

  it('quarterly_feedback does not leak tier / eligibility / cadre to faculty', () => {
    const html = renderTemplate('quarterly_feedback', {
      ...samplePayload,
      strengths: 'Strong teaching',
      improvements: 'More journal publications',
      growthTargets: 'Build on your research',
    });
    // Narrative is kept…
    expect(html).toContain('Strong teaching');
    expect(html).toContain('More journal publications');
    // …but none of the tier/eligibility/cadre internals leak.
    expect(html).not.toMatch(/tier|eligib|cadre|Assistant Professor|T2|ON TRACK|NOT YET/i);
  });

  it('throws on unknown template', () => {
    expect(() => renderTemplate('nonexistent' as any, {})).toThrow();
  });
});
