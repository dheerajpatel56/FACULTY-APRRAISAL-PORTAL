import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import prisma from '../utils/prismaClient';
import { renderTemplate } from '../services/emailTemplates';

// Faculty own their score out of 500 and must be told it, including after a
// reviewer changes it. Category 6 (core values) and the /550 grand total are
// the reviewer's assessment of them and belong to the HoD and dean only.

const payload = {
  name: 'Test Faculty', year: '2026-27', submissionNumber: 1, submissionId: 'sub-1',
  reviewerName: 'HoD', reviewedAt: '01-01-2026',
  cat1: '120.0', cat2: '90.0', cat3: '70.0', cat4: '40.0', cat5: '30.0',
  selfTotal: '400.0', reviewedTotal: '390.0',
  overallComment: 'Evidence for two journals was thin.',
  teachingComment: '', researchComment: '', developmentComment: '',
  governanceComment: '', supplementaryComment: '',
};

describe('approval email — what the faculty is shown', () => {
  const html = renderTemplate('submission_approved', payload);

  it('shows both totals out of 500 so a changed score is visible', () => {
    expect(html).toContain('400.0 / 500');
    expect(html).toContain('390.0 / 500');
    expect(html).toMatch(/Self-assessed total/i);
    expect(html).toMatch(/Reviewed total/i);
  });

  it('carries the reviewer comments', () => {
    expect(html).toContain('Evidence for two journals was thin.');
  });

  it('never mentions Category 6 or the 550 grand total', () => {
    expect(html).not.toMatch(/Cat\s*6/i);
    expect(html).not.toMatch(/Core Values/i);
    expect(html).not.toContain('550');
    expect(html).not.toMatch(/Grand Total/i);
  });

  it('leaks nothing even if a cat6 or grandTotal value is passed by mistake', () => {
    const leaky = renderTemplate('submission_approved', { ...payload, cat6: '45.0', grandTotal: '435.0' });
    expect(leaky).not.toContain('45.0');
    expect(leaky).not.toContain('435.0');
    expect(leaky).not.toContain('550');
  });

  it('before review, shows only the self total', () => {
    const { reviewedTotal, ...beforeReview } = payload;
    const received = renderTemplate('submission_received', beforeReview);
    expect(received).toContain('400.0 / 500');
    expect(received).not.toMatch(/Reviewed total/i);
    expect(received).not.toContain('550');
  });
});

// The visibility rule keys off OWNERSHIP, not role. A HoD or reviewer submits
// an appraisal of their own, and a role-only check handed them the core-values
// marks and grand total recorded against it. Nobody sees the reviewer's
// assessment of themselves, whatever roles they hold.
describe('own appraisal — staff viewing their own submission', () => {
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const login = async (c: string, pw: string) => {
    const r = await request(app).post('/api/auth/login').send({ employeeCode: c, password: pw });
    return r.status === 200 ? r.body.accessToken : '';
  };

  let ready = false, facTok = '', hodTok = '', subId = '', facultyId = '';

  beforeAll(async () => {
    try {
      facTok = await login('FAC11', 'faculty123');
      hodTok = await login('00CSE003', 'Welcome@123');
      const [year, fac] = await Promise.all([
        prisma.academicYear.findFirst({ where: { submissionOpen: true } }),
        prisma.user.findUnique({ where: { employeeCode: 'FAC11' } }),
      ]);
      if (!facTok || !hodTok || !year || !fac) return;
      facultyId = fac.id;
      const mk = (r: string) => ({ responsibility: r, level: 'Department', workInvolved: 'Committee', period: '2026' });
      const sub = await prisma.appraisalSubmission.create({
        data: {
          userId: fac.id, academicYearId: year.id, submissionNumber: 985, status: 'SUBMITTED',
          cat4AdminResp: { create: [mk('A'), mk('B'), mk('C')] },
        },
      });
      subId = sub.id;
      await request(app).post(`/api/appraisals/${subId}/review`).set(bearer(hodTok)).send({
        cat4Score: 20, cat6Punctuality: 9, cat6Professionalism: 9, cat6Willingness: 9,
        cat6Cordiality: 9, cat6Classroom: 9, overallComment: 'Thin evidence.', status: 'APPROVED',
      });
      ready = true;
    } catch { ready = false; }
  });

  afterAll(async () => {
    if (subId) {
      await prisma.auditLog.deleteMany({ where: { entityId: subId } });
      await prisma.appraisalReview.deleteMany({ where: { submissionId: subId } });
      await prisma.appraisalSubmission.deleteMany({ where: { id: subId } });
    }
    if (facultyId) await prisma.emailNotification.deleteMany({ where: { toUserId: facultyId } });
  });

  it('gets their reviewed score out of 500 and the comments', async () => {
    if (!ready) return;
    const res = await request(app).get(`/api/appraisals/${subId}/review`).set(bearer(facTok));
    expect(res.status).toBe(200);
    expect(res.body.totalScore).toBe(20);
    expect(res.body.cat4Score).toBe(20);
    expect(res.body.overallComment).toBe('Thin evidence.');
  });

  it('does not get Category 6 or the grand total for their own appraisal', async () => {
    if (!ready) return;
    const res = await request(app).get(`/api/appraisals/${subId}/review`).set(bearer(facTok));
    expect(res.body.grandTotal).toBeUndefined();
    expect(res.body.cat6Punctuality).toBeUndefined();
    expect(res.body.cat6Classroom).toBeUndefined();
  });

  it('the HoD, who does not own it, still sees everything', async () => {
    if (!ready) return;
    const res = await request(app).get(`/api/appraisals/${subId}/review`).set(bearer(hodTok));
    expect(res.body.grandTotal).toBeTypeOf('number');
    expect(res.body.cat6Punctuality).toBe(9);
  });
});
