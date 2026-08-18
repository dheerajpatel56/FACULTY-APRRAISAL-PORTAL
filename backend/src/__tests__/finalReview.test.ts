import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import prisma from '../utils/prismaClient';

// The dean-assigned final-review layer ABOVE the HoD. Admin assigns any number
// of reviewers, from any department; ONE approval finalises, and a REJECT sends
// the submission back to HOLD.
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

describe('final review — dean-assigned reviewer layer', () => {
  it('non-admin cannot assign final reviewers (403)', async () => {
    if (!ready) return;
    const res = await request(app).post(`/api/admin/appraisals/${subId}/final-reviewers`)
      .set(bearer(rev1Tok)).send({ reviewerIds: [rev1Id, rev2Id] });
    expect(res.status).toBe(403);
  });

  it('accepts any number of reviewers — a single one is allowed', async () => {
    if (!ready) return;
    const one = await request(app).post(`/api/admin/appraisals/${subId}/final-reviewers`)
      .set(bearer(adminTok)).send({ reviewerIds: [rev1Id] });
    expect(one.status).toBe(201);
    expect(one.body.reviewers).toHaveLength(1);

    // Duplicates collapse rather than erroring.
    const dup = await request(app).post(`/api/admin/appraisals/${subId}/final-reviewers`)
      .set(bearer(adminTok)).send({ reviewerIds: [rev1Id, rev1Id] });
    expect(dup.status).toBe(201);
    expect(dup.body.reviewers).toHaveLength(1);
  });

  it('rejects an empty reviewer list', async () => {
    if (!ready) return;
    const none = await request(app).post(`/api/admin/appraisals/${subId}/final-reviewers`)
      .set(bearer(adminTok)).send({ reviewerIds: [] });
    expect(none.status).toBe(400);
  });

  it('admin assigns reviewers → submission moves to FINAL_REVIEW', async () => {
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

  it('a single approval finalises the appraisal → APPROVED, without the second reviewer', async () => {
    if (!ready) return;
    const res = await request(app).post(`/api/appraisals/${subId}/final-review`)
      .set(bearer(rev1Tok)).send({ decision: 'APPROVED' });
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('APPROVED');

    const sub = await prisma.appraisalSubmission.findUnique({ where: { id: subId } });
    expect(sub!.status).toBe('APPROVED');

    // The other assigned reviewer never acted and is not required to.
    const other = await prisma.finalReview.findFirst({ where: { submissionId: subId, reviewerId: rev2Id } });
    expect(other!.decision).toBe('PENDING');
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

  it('a reviewer from another department can review and view the appraisal', async () => {
    if (!ready || !outsiderTok) return;
    // FAC11 is a REVIEWER for ECE; the throwaway submission's faculty (FAC21) is
    // not in their department, so this only works because the dean assigned them.
    const outsider = await prisma.user.findUnique({ where: { employeeCode: 'FAC11' } });
    if (!outsider) return;

    await prisma.appraisalSubmission.update({ where: { id: subId }, data: { status: 'APPROVED' } });
    const assign = await request(app).post(`/api/admin/appraisals/${subId}/final-reviewers`)
      .set(bearer(adminTok)).send({ reviewerIds: [outsider.id] });
    expect(assign.status).toBe(201);

    // Cross-department read access comes from the assignment alone.
    const view = await request(app).get(`/api/appraisals/${subId}`).set(bearer(outsiderTok));
    expect(view.status).toBe(200);

    const res = await request(app).post(`/api/appraisals/${subId}/final-review`)
      .set(bearer(outsiderTok)).send({ decision: 'APPROVED' });
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('APPROVED');

    // Restore the two-reviewer assignment for the following test.
    await prisma.appraisalSubmission.update({ where: { id: subId }, data: { status: 'APPROVED' } });
    await request(app).post(`/api/admin/appraisals/${subId}/final-reviewers`)
      .set(bearer(adminTok)).send({ reviewerIds: [rev1Id, rev2Id] });
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
