import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import prisma from '../utils/prismaClient';

// The reviewer's categories 1-5 marks are their own. Each defaults to the
// server-computed value, but the reviewer may override any of them, and the
// stored review total must follow the marks they awarded — not the self score.
// Both assessments go to HR, so they have to stay separable.
//
// Self-skips when the DB / expected users are unavailable, and creates +
// deletes its own throwaway submission so it never touches real appraisals.

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
async function login(employeeCode: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ employeeCode, password });
  return res.status === 200 ? res.body.accessToken : '';
}

let ready = false;
let hodTok = '';
let facultyId = '';
let yearId = '';
const subIds: string[] = [];

// A submission can only be approved once ("Already approved"), so each test
// that reviews gets its own throwaway.
async function makeSubmission(n: number): Promise<string> {
  const sub = await prisma.appraisalSubmission.create({
    data: { userId: facultyId, academicYearId: yearId, submissionNumber: n, status: 'SUBMITTED' },
  });
  subIds.push(sub.id);
  return sub.id;
}

beforeAll(async () => {
  try {
    hodTok = await login('00CSE003', 'Welcome@123');
    if (!hodTok) return;

    const [year, faculty] = await Promise.all([
      prisma.academicYear.findFirst({ where: { submissionOpen: true } }),
      prisma.user.findUnique({ where: { employeeCode: 'FAC11' } }), // CSE, same dept as the HoD
    ]);
    if (!year || !faculty) return;
    facultyId = faculty.id;
    yearId = year.id;
    ready = true;
  } catch {
    ready = false;
  }
});

afterAll(async () => {
  if (subIds.length) {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: subIds } } });
    await prisma.appraisalReview.deleteMany({ where: { submissionId: { in: subIds } } });
    await prisma.appraisalSubmission.deleteMany({ where: { id: { in: subIds } } });
  }
  // Drop anything this test queued so it can never be delivered.
  if (facultyId) await prisma.emailNotification.deleteMany({ where: { toUserId: facultyId } });
});

describe('review score — reviewer marks for categories 1-5', () => {
  it('stores the overridden marks and totals them, not the self score', async () => {
    if (!ready) return;
    const subId = await makeSubmission(990);

    const res = await request(app)
      .post(`/api/appraisals/${subId}/review`)
      .set(bearer(hodTok))
      .send({
        cat1Score: 120, cat2Score: 90, cat3Score: 40, cat4Score: 30, cat5Score: 20,
        cat6Punctuality: 10, cat6Professionalism: 10, cat6Willingness: 10,
        cat6Cordiality: 10, cat6Classroom: 10,
        overallComment: 'Marked down on evidence', status: 'APPROVED',
      });
    expect(res.status).toBe(200);

    const stored = await prisma.appraisalReview.findFirst({ where: { submissionId: subId } });
    expect(stored).toBeTruthy();
    expect(stored!.cat1Score).toBe(120);
    expect(stored!.cat2Score).toBe(90);
    expect(stored!.cat5Score).toBe(20);
    // 120 + 90 + 40 + 30 + 20 = 300, + Cat 6 capped at 50 = 350.
    expect(stored!.totalScore).toBe(300);
    expect(stored!.grandTotal).toBe(350);
  });

  it('admin can reopen an approved appraisal so the marks can be corrected', async () => {
    if (!ready) return;
    const subId = await makeSubmission(993);
    const adminTok = await login('ADMIN001', 'admin123');
    if (!adminTok) return;

    // Approve with a wrong mark.
    const first = await request(app).post(`/api/appraisals/${subId}/review`)
      .set(bearer(hodTok)).send({ cat1Score: 10, status: 'APPROVED' });
    expect(first.status).toBe(200);

    // Reviewer is locked out of a second decision.
    const second = await request(app).post(`/api/appraisals/${subId}/review`)
      .set(bearer(hodTok)).send({ cat1Score: 140, status: 'APPROVED' });
    expect(second.status).toBe(400);

    // A reason is required, and the HoD cannot reopen.
    const noReason = await request(app).post(`/api/admin/appraisals/${subId}/reopen-review`)
      .set(bearer(adminTok)).send({});
    expect(noReason.status).toBe(400);
    const notAdmin = await request(app).post(`/api/admin/appraisals/${subId}/reopen-review`)
      .set(bearer(hodTok)).send({ reason: 'let me back in' });
    expect(notAdmin.status).toBe(403);

    // Admin reopens; the HoD can now correct the mark.
    const reopen = await request(app).post(`/api/admin/appraisals/${subId}/reopen-review`)
      .set(bearer(adminTok)).send({ reason: 'Cat 1 keyed in wrong' });
    expect(reopen.status).toBe(200);

    const sub = await prisma.appraisalSubmission.findUnique({ where: { id: subId } });
    expect(sub!.status).toBe('SUBMITTED');

    const corrected = await request(app).post(`/api/appraisals/${subId}/review`)
      .set(bearer(hodTok)).send({ cat1Score: 140, status: 'APPROVED' });
    expect(corrected.status).toBe(200);

    const stored = await prisma.appraisalReview.findFirst({ where: { submissionId: subId } });
    expect(stored!.cat1Score).toBe(140);

    // The reopen is on the record.
    const log = await prisma.auditLog.findFirst({
      where: { entityId: subId, action: 'REVIEW_REOPENED' },
    });
    expect(log).toBeTruthy();
    expect((log!.metadata as any).reason).toBe('Cat 1 keyed in wrong');
  });

  it('refuses to reopen a submission that was never decided', async () => {
    if (!ready) return;
    const subId = await makeSubmission(994);
    const adminTok = await login('ADMIN001', 'admin123');
    if (!adminTok) return;

    const res = await request(app).post(`/api/admin/appraisals/${subId}/reopen-review`)
      .set(bearer(adminTok)).send({ reason: 'nothing to reopen' });
    expect(res.status).toBe(400);
  });

  it('rejects a mark above the category maximum', async () => {
    if (!ready) return;
    const subId = await makeSubmission(991);

    const res = await request(app)
      .post(`/api/appraisals/${subId}/review`)
      .set(bearer(hodTok))
      .send({ cat1Score: 151, status: 'APPROVED' }); // Cat 1 caps at 150
    expect(res.status).toBe(400);
  });

  it('falls back to the computed value for any category left out', async () => {
    if (!ready) return;
    const subId = await makeSubmission(992);

    const score = await request(app).get(`/api/appraisals/${subId}/score`).set(bearer(hodTok));
    expect(score.status).toBe(200);

    const res = await request(app)
      .post(`/api/appraisals/${subId}/review`)
      .set(bearer(hodTok))
      .send({ cat1Score: 100, status: 'APPROVED' }); // 2-5 omitted
    expect(res.status).toBe(200);

    const stored = await prisma.appraisalReview.findFirst({ where: { submissionId: subId } });
    expect(stored!.cat1Score).toBe(100);
    expect(stored!.cat2Score).toBe(score.body.cat2.total);
    expect(stored!.cat3Score).toBe(score.body.cat3.total);
  });
});
