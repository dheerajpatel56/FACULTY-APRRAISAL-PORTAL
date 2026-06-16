import type { EmailTemplateKey } from './emailService';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// Subject lines (function for dynamic substitution)
export const TEMPLATE_SUBJECTS: Record<EmailTemplateKey, (p: any) => string> = {
  submission_received: (p) => `Faculty Appraisal ${p.year} — Submission received`,
  submission_approved: (p) => `Faculty Appraisal ${p.year} — Approved`,
  submission_rejected: (p) => `Faculty Appraisal ${p.year} — Rejected`,
  submission_unlocked: (p) => `Faculty Appraisal ${p.year} — Unlocked for edits`,
  draft_reminder: (p) => `Reminder — Complete your ${p.year} appraisal`,
  fpgp_signed: (p) => `FPGP ${p.year} — Reviewed by HoD`,
  reviewer_daily_digest: (p) => `Pending Reviews — ${p.pendingCount} appraisal(s)`,
  password_otp: (_p) => `VNRVJIET Faculty Portal — Password Change OTP`,
};

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:20px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:#1e3a5f;padding:20px;text-align:center">
          <div style="color:#f5d680;font-size:20px;font-weight:bold;letter-spacing:1px">VNRVJIET</div>
          <div style="color:#ffffff;font-size:11px;margin-top:2px">Faculty Appraisal Portal</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:24px">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#0f1d31;padding:14px;text-align:center;color:#94a3b8;font-size:11px">
          &copy; ${new Date().getFullYear()} VNRVJIET — Faculty Appraisal System<br />
          <a href="${FRONTEND_URL}" style="color:#e9a93a;text-decoration:none">Open Portal</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function scoreTable(p: any): string {
  if (!p.cat1 && !p.cat2 && !p.cat3 && !p.cat4 && !p.cat5) return '';
  return `
  <table cellpadding="6" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-radius:4px;margin:12px 0;font-size:13px">
    <tr style="background:#f1f5f9"><th align="left" style="padding:8px">Category</th><th align="right" style="padding:8px">Score</th></tr>
    <tr><td>Cat 1 — Teaching</td><td align="right">${p.cat1 ?? '-'} / 150</td></tr>
    <tr><td>Cat 2 — Research</td><td align="right">${p.cat2 ?? '-'} / 150</td></tr>
    <tr><td>Cat 3 — Development</td><td align="right">${p.cat3 ?? '-'} / 100</td></tr>
    <tr><td>Cat 4 — Governance</td><td align="right">${p.cat4 ?? '-'} / 50</td></tr>
    <tr><td>Cat 5 — Supplementary</td><td align="right">${p.cat5 ?? '-'} / 50</td></tr>
    ${p.cat6 != null ? `<tr><td>Cat 6 — Core Values</td><td align="right">${p.cat6} / 50</td></tr>` : ''}
    <tr style="background:#1e3a5f;color:#fff;font-weight:bold"><td>${p.grandTotal != null ? 'Grand Total' : 'Self Total'}</td><td align="right">${p.grandTotal ?? p.selfTotal ?? '-'} / ${p.grandTotal != null ? '550' : '500'}</td></tr>
  </table>`;
}

function commentsBlock(p: any): string {
  const items: Array<[string, string]> = [
    ['Teaching', p.teachingComment],
    ['Research', p.researchComment],
    ['Development', p.developmentComment],
    ['Governance', p.governanceComment],
    ['Supplementary', p.supplementaryComment],
    ['Overall', p.overallComment],
  ];
  const filled = items.filter(([, v]) => v && String(v).trim());
  if (!filled.length) return '';
  return `<div style="margin-top:12px"><strong>Reviewer Feedback</strong></div>
  <table cellpadding="4" cellspacing="0" style="width:100%;font-size:13px;margin-top:4px">
    ${filled.map(([k, v]) => `<tr><td style="padding:4px 0;color:#64748b;width:120px;vertical-align:top">${k}:</td><td style="padding:4px 0;color:#0f172a">${v}</td></tr>`).join('')}
  </table>`;
}

const TEMPLATES: Record<EmailTemplateKey, (p: any) => string> = {
  submission_received: (p) => layout('Submission Received', `
    <h2 style="margin:0 0 8px;color:#1e3a5f">Submission Received</h2>
    <p>Dear <strong>${p.name}</strong>,</p>
    <p>Your Faculty Appraisal for <strong>${p.year}</strong> (Submission #${p.submissionNumber}) was received on <strong>${p.submittedAt}</strong>.</p>
    <p><strong>Status:</strong> <span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600">SUBMITTED</span></p>
    ${scoreTable(p)}
    <p style="color:#64748b;font-size:13px">Your HoD/Reviewer will review the submission. You'll receive an email when status changes.</p>
    <p style="margin-top:16px"><a href="${FRONTEND_URL}/appraisal/${p.submissionId}" style="background:#1e3a5f;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600">View Submission</a></p>
  `),

  submission_approved: (p) => layout('Appraisal Approved', `
    <h2 style="margin:0 0 8px;color:#059669">Appraisal Approved</h2>
    <p>Dear <strong>${p.name}</strong>,</p>
    <p>Your Faculty Appraisal for <strong>${p.year}</strong> has been <strong style="color:#059669">APPROVED</strong> by ${p.reviewerName ?? 'the reviewer'} on ${p.reviewedAt}.</p>
    ${scoreTable(p)}
    ${commentsBlock(p)}
    <p style="margin-top:16px"><a href="${FRONTEND_URL}/appraisal/${p.submissionId}" style="background:#1e3a5f;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600">View Full Report</a></p>
  `),

  submission_rejected: (p) => layout('Appraisal Rejected', `
    <h2 style="margin:0 0 8px;color:#dc2626">Appraisal Rejected</h2>
    <p>Dear <strong>${p.name}</strong>,</p>
    <p>Your Faculty Appraisal for <strong>${p.year}</strong> has been <strong style="color:#dc2626">REJECTED</strong> by ${p.reviewerName ?? 'the reviewer'} on ${p.reviewedAt}.</p>
    ${scoreTable(p)}
    ${commentsBlock(p)}
    <p style="color:#64748b;font-size:13px">Contact your HoD/Reviewer for next steps. If your appraisal is unlocked, you may resubmit.</p>
    <p style="margin-top:16px"><a href="${FRONTEND_URL}/appraisal/${p.submissionId}" style="background:#1e3a5f;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600">View Submission</a></p>
  `),

  submission_unlocked: (p) => layout('Submission Unlocked', `
    <h2 style="margin:0 0 8px;color:#1e3a5f">Submission Unlocked</h2>
    <p>Dear <strong>${p.name}</strong>,</p>
    <p>Your Faculty Appraisal for <strong>${p.year}</strong> (Submission #${p.submissionNumber}) has been unlocked by the admin. You can now edit and resubmit.</p>
    <p style="margin-top:16px"><a href="${FRONTEND_URL}/appraisal/${p.submissionId}/edit" style="background:#1e3a5f;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600">Edit Submission</a></p>
  `),

  draft_reminder: (p) => layout('Complete Your Appraisal', `
    <h2 style="margin:0 0 8px;color:#d97706">Reminder — Submission Pending</h2>
    <p>Dear <strong>${p.name}</strong>,</p>
    <p>Your Faculty Appraisal for <strong>${p.year}</strong> is currently in <strong>DRAFT</strong> status.</p>
    ${p.windowCloses ? `<p>Submission window closes on <strong>${p.windowCloses}</strong>${p.daysLeft != null ? ` (<strong>${p.daysLeft} day(s) remaining</strong>)` : ''}.</p>` : ''}
    <p>Complete and submit before the deadline.</p>
    <p style="margin-top:16px"><a href="${FRONTEND_URL}/dashboard" style="background:#1e3a5f;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600">Continue Appraisal</a></p>
    <p style="margin-top:24px;color:#94a3b8;font-size:11px">You're receiving this reminder based on your email preferences. <a href="${FRONTEND_URL}/profile" style="color:#94a3b8">Manage preferences</a>.</p>
  `),

  fpgp_signed: (p) => layout('FPGP Reviewed by HoD', `
    <h2 style="margin:0 0 8px;color:#1e3a5f">FPGP Reviewed</h2>
    <p>Dear <strong>${p.name}</strong>,</p>
    <p>Your Faculty Performance Growth Plan for <strong>${p.year}</strong> has been signed and reviewed by <strong>${p.hodName}</strong> on ${p.signedAt}.</p>
    <p>Status: <span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600">REVIEWED</span></p>
    <p style="margin-top:16px"><a href="${FRONTEND_URL}/fpgp/${p.planId}" style="background:#1e3a5f;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600">View Plan</a></p>
  `),

  password_otp: (p) => layout('Password OTP', `
    <h2 style="margin:0 0 8px;color:#1e3a5f">Password Change Request</h2>
    <p>Dear <strong>${p.name}</strong>,</p>
    <p>You requested to change your password. Use the OTP below to confirm:</p>
    <div style="background:#f8fafc;border:2px solid #1e3a5f;border-radius:6px;padding:18px;text-align:center;margin:16px 0">
      <div style="color:#64748b;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Your OTP</div>
      <div style="color:#1e3a5f;font-size:32px;font-weight:bold;letter-spacing:8px;font-family:monospace">${p.otp}</div>
    </div>
    <p style="color:#64748b;font-size:13px">This OTP expires in <strong>${p.expiresInMinutes ?? 10} minutes</strong>. Do not share it with anyone.</p>
    <p style="color:#dc2626;font-size:12px;margin-top:16px"><strong>If you did not request this</strong>, ignore this email and your password remains unchanged. Consider reviewing your account security.</p>
  `),

  reviewer_daily_digest: (p) => layout('Pending Reviews', `
    <h2 style="margin:0 0 8px;color:#1e3a5f">Daily Review Queue</h2>
    <p>Dear <strong>${p.name}</strong>,</p>
    <p>You have <strong>${p.pendingCount}</strong> appraisal(s) pending review.</p>
    ${Array.isArray(p.items) && p.items.length ? `
      <table cellpadding="6" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-radius:4px;margin:12px 0;font-size:13px">
        <tr style="background:#1e3a5f;color:#fff"><th align="left" style="padding:8px">Faculty</th><th align="left" style="padding:8px">Year</th><th align="left" style="padding:8px">Days Waiting</th></tr>
        ${p.items.map((it: any, i: number) => `<tr ${i % 2 ? 'style="background:#f8fafc"' : ''}><td>${it.name}</td><td>${it.year}</td><td>${it.daysWaiting}</td></tr>`).join('')}
      </table>` : ''}
    <p style="margin-top:16px"><a href="${FRONTEND_URL}/reviews" style="background:#1e3a5f;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:600">Open Review Queue</a></p>
  `),
};

export function renderTemplate(key: EmailTemplateKey, payload: Record<string, any>): string {
  const fn = TEMPLATES[key];
  if (!fn) throw new Error(`Unknown template: ${key}`);
  return fn(payload);
}
