import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import prisma from '../utils/prismaClient';

// The dean-assigned 2-reviewer layer ABOVE the HoD. Admin assigns exactly two
// final reviewers; both must APPROVE to finalise, and either REJECT sends the
// submission back to HOLD.
//
// Self-skips when the DB / expected users are unavailable, and creates + deletes
// its own throwaway submission so it never touches real appraisals.

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
async function login(employeeCode: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ employeeCode, password });
  return res.status === 200 ? res.body.accessToken : '';
}

let ready = false;
let adminTok = '', rev1Tok = '', rev2Tok = '', outsiderTok = '';
let rev1Id = '', rev2Id = '', subId = '';

beforeAll(async () => {
  try {
    adminTok = await login('ADMIN001', 'admin123');
    rev1Tok = await login('DEMOINC1', 'Demo@1234');
    rev2Tok = await login('DEMOHOD1', 'Demo@1234');
    outsiderTok = await login('FAC11', 'faculty123');
    if (!adminTok || !rev1Tok || !rev2Tok) return;

    const [year, faculty, r1, r2] = await Promise.all([
      prisma.academicYear.findFirst({ where: { submissionOpen: true } }),
      prisma.user.findUnique({ where: { employeeCode: 'FAC21' } }),
      prisma.user.findUnique({ where: { employeeCode: 'DEMOINC1' } }),
      prisma.user.findUnique({ where: { employeeCode: 'DEMOHOD1' } }),
    ]);
    if (!year || !faculty || !r1 || !r2) return;
    rev1Id = r1.id; rev2Id = r2.id;

    // Throwaway submission already HoD-approved, ready for the final layer.
    const sub = await prisma.appraisalSubmission.create({
      data: { userId: faculty.id, academicYearId: year.id, submissionNumber: 998, status: 'APPROVED' },
    });
    subId = sub.id;
    ready = true;
  } catch {
    ready = false;
  }
});

afterAll(async () => {
  if (!subId) return;
  await prisma.finalReview.deleteMany({ where: { submissionId: subId } });
  await prisma.appraisalSubmission.deleteMany({ where: { id: subId } });
});

describe('final review — dean-assigned 2-reviewer layer', () => {
  it('non-admin cannot assign final reviewers (403)', async () => {
    if (!ready) return;
    const res = await request(app).post(`/api/admin/appraisals/${subId}/final-reviewers`)
      .set(bearer(rev1Tok)).send({ reviewerIds: [rev1Id, rev2Id] });
    expect(res.status).toBe(403);
  });

  it('rejects an assignment that is not exactly two distinct reviewers', async () => {
    if (!ready) return;
    const one = await request(app).post(`/api/admin/appraisals/${subId}/final-reviewers`)
      .set(bearer(adminTok)).send({ reviewerIds: [rev1Id] });
    expect(one.status).toBe(400);

    const dup = await request(app).post(`/api/admin/appraisals/${subId}/final-reviewers`)
      .set(bearer(adminTok)).send({ reviewerIds: [rev1Id, rev1Id] });
    expect(dup.status).toBe(400);
  });

  it('admin assigns two reviewers → submission moves to FINAL_REVIEW', async () => {
    if (!ready) return;
    const res = await request(app).post(`/api/admin/appraisals/${subId}/final-reviewers`)
      .set(bearer(adminTok)).send({ reviewerIds: [rev1Id, rev2Id] });
    expect(res.status).toBe(201);
    expect(res.body.reviewers).toHaveLength(2);

    const sub = await prisma.appraisalSubmission.findUnique({ where: { id: subId } });
    expect(sub!.status).toBe('FINAL_REVIEW');
  });

  it('a non-assigned user cannot cast a final-review vote (403)', async () => {
    if (!ready || !outsiderTok) return;
    const res = await request(app).post(`/api/appraisals/${subId}/final-review`)
      .set(bearer(outsiderTok)).send({ decision: 'APPROVED' });
    expect(res.status).toBe(403);
  });

  it('one approval is not enough — stays in FINAL_REVIEW', async () => {
    if (!ready) return;
    const res = await request(app).post(`/api/appraisals/${subId}/final-review`)
      .set(bearer(rev1Tok)).send({ decision: 'APPROVED' });
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('PENDING');

    const sub = await prisma.appraisalSubmission.findUnique({ where: { id: subId } });
    expect(sub!.status).toBe('FINAL_REVIEW');
  });

  it('both approvals finalise the appraisal → APPROVED', async () => {
    if (!ready) return;
    const res = await request(app).post(`/api/appraisals/${subId}/final-review`)
      .set(bearer(rev2Tok)).send({ decision: 'APPROVED' });
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('APPROVED');

    const sub = await prisma.appraisalSubmission.findUnique({ where: { id: subId } });
    expect(sub!.status).toBe('APPROVED');
  });

  it('a rejection sends the appraisal back to HOLD with the reason', async () => {
    if (!ready) return;
    // Re-open the final-review round.
    await prisma.appraisalSubmission.update({ where: { id: subId }, data: { status: 'FINAL_REVIEW' } });
    await prisma.finalReview.updateMany({
      where: { submissionId: subId }, data: { decision: 'PENDING', comment: null, decidedAt: null },
    });

    const noComment = await request(app).post(`/api/appraisals/${subId}/final-review`)
      .set(bearer(rev1Tok)).send({ decision: 'REJECTED' });
    expect(noComment.status).toBe(400); // a reason is required

    const res = await request(app).post(`/api/appraisals/${subId}/final-review`)
      .set(bearer(rev1Tok)).send({ decision: 'REJECTED', comment: 'Insufficient evidence' });
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('HOLD');

    const sub = await prisma.appraisalSubmission.findUnique({ where: { id: subId } });
    expect(sub!.status).toBe('HOLD');
    expect(sub!.holdReason).toBe('Insufficient evidence');
  });

  it('an assigned reviewer sees the submission in their pending queue', async () => {
    if (!ready) return;
    await prisma.appraisalSubmission.update({ where: { id: subId }, data: { status: 'FINAL_REVIEW' } });
    await prisma.finalReview.updateMany({
      where: { submissionId: subId }, data: { decision: 'PENDING', comment: null, decidedAt: null },
    });

    const res = await request(app).get('/api/final-reviews/pending').set(bearer(rev2Tok));
    expect(res.status).toBe(200);
    expect(res.body.some((r: any) => r.submission.id === subId)).toBe(true);
  });
});
