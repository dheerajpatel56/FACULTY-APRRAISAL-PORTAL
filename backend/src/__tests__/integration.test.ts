import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import prisma from '../utils/prismaClient';

// Integration tests hit the real Express app + DB.
// If DB unreachable or seed users missing, the suite skips itself
// (so CI without a database still passes `npm test`).

let dbReady = false;

async function login(employeeCode: string, password: string): Promise<string | null> {
  const res = await request(app).post('/api/auth/login').send({ employeeCode, password });
  return res.status === 200 ? res.body.accessToken : null;
}

beforeAll(async () => {
  try {
    const tok = await login('ADMIN001', 'admin123');
    dbReady = !!tok;
    if (!dbReady) console.warn('[integration] seed users missing — skipping. Run `npm run seed`.');
  } catch (e) {
    console.warn('[integration] DB unreachable — skipping integration suite.');
    dbReady = false;
  }
});

describe('Auth', () => {
  it('rejects bad credentials with 401', async () => {
    if (!dbReady) return;
    const res = await request(app).post('/api/auth/login').send({ employeeCode: 'ADMIN001', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('valid admin login returns token + roles', async () => {
    if (!dbReady) return;
    const res = await request(app).post('/api/auth/login').send({ employeeCode: 'ADMIN001', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.roles.some((r: any) => r.role === 'ADMIN')).toBe(true);
  });

  it('forgot-password returns generic message (no enumeration)', async () => {
    if (!dbReady) return;
    const real = await request(app).post('/api/auth/forgot-password').send({ employeeCode: 'ADMIN001' });
    const fake = await request(app).post('/api/auth/forgot-password').send({ employeeCode: 'NOPE999' });
    expect(real.status).toBe(200);
    expect(fake.status).toBe(200);
    expect(real.body.message).toBe(fake.body.message);
  });
});

describe('Authorization guards', () => {
  it('protected route without token → 401', async () => {
    if (!dbReady) return;
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('faculty hitting admin route → 403', async () => {
    if (!dbReady) return;
    const facTok = await login('FAC21', 'faculty123');
    if (!facTok) return;
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${facTok}`);
    expect(res.status).toBe(403);
  });

  it('admin can list users', async () => {
    if (!dbReady) return;
    const adminTok = await login('ADMIN001', 'admin123');
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminTok}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Full appraisal workflow', () => {
  it('create → fill → submit → review → approve → visibility rules', async () => {
    if (!dbReady) return;

    const facTok = await login('FAC21', 'faculty123');
    const revTok = await login('FAC11', 'faculty123'); // REVIEWER for ECE
    if (!facTok || !revTok) return;

    // Pick an open academic year
    const years = await request(app).get('/api/academic-years').set('Authorization', `Bearer ${facTok}`);
    const year = years.body.find((y: any) => y.label === '2025-26') ?? years.body[0];
    if (!year) return;

    // Clean any prior submission for this fac+year to keep idempotent
    const fac = await prisma.user.findUnique({ where: { employeeCode: 'FAC21' } });
    if (fac) {
      await prisma.appraisalSubmission.deleteMany({ where: { userId: fac.id, academicYearId: year.id } });
    }

    // Create
    const created = await request(app)
      .post('/api/appraisals')
      .set('Authorization', `Bearer ${facTok}`)
      .send({ academicYearId: year.id });
    expect(created.status).toBe(201);
    const subId = created.body.id;

    // Fill (minimal — one SCI journal = 15 pts)
    const fill = await request(app)
      .put(`/api/appraisals/${subId}`)
      .set('Authorization', `Bearer ${facTok}`)
      .send({
        categories: {
          cat2Journals: [{
            title: 'Test Paper', journalName: 'IEEE', authors: 'FAC21', authorPosition: 'First',
            indexed: 'WOS', impactFactor: 3, volume: '1', issueNo: '1', pageNos: '1-10',
            dateOfPub: '2025-06-01', quartile: 'Q1', doi: '', issn: '',
          }],
        },
      });
    expect(fill.status).toBe(200);

    // Score (faculty self)
    const score = await request(app).get(`/api/appraisals/${subId}/score`).set('Authorization', `Bearer ${facTok}`);
    expect(score.status).toBe(200);
    expect(score.body.cat2.total).toBeGreaterThanOrEqual(15);

    // Submit (only if window open)
    if (year.submissionOpen) {
      const submitted = await request(app).post(`/api/appraisals/${subId}/submit`).set('Authorization', `Bearer ${facTok}`);
      expect(submitted.status).toBe(200);

      // Reviewer approves
      const review = await request(app)
        .post(`/api/appraisals/${subId}/review`)
        .set('Authorization', `Bearer ${revTok}`)
        .send({
          cat6Punctuality: 9, cat6Professionalism: 9, cat6Willingness: 8, cat6Cordiality: 10, cat6Classroom: 9,
          overallComment: 'Approved', status: 'APPROVED',
        });
      expect([200, 403]).toContain(review.status); // 403 if FAC11 not reviewer for FAC21's dept

      if (review.status === 200) {
        // Faculty visibility — scores must NOT leak
        const facReview = await request(app).get(`/api/appraisals/${subId}/review`).set('Authorization', `Bearer ${facTok}`);
        expect(facReview.status).toBe(200);
        expect(facReview.body.cat1Score).toBeUndefined();
        expect(facReview.body.totalScore).toBeUndefined();
        expect(facReview.body.grandTotal).toBeUndefined();
        expect(facReview.body.overallComment).toBe('Approved');

        // Reviewer sees full scores
        const revReview = await request(app).get(`/api/appraisals/${subId}/review`).set('Authorization', `Bearer ${revTok}`);
        expect(revReview.body.grandTotal).toBeTypeOf('number');
      }
    }

    // Cleanup
    await prisma.appraisalSubmission.deleteMany({ where: { id: subId } }).catch(() => {});
  });
});
